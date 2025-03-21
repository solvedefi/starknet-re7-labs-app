import CONSTANTS from '@/constants';
import {
  AmountInfo,
  DepositActionInputs,
  IStrategy,
  IStrategySettings,
  StrategyLiveStatus,
  StrategyStatus,
  TokenInfo,
  WithdrawActionInputs,
} from './IStrategy';
import {
  ContractAddr,
  getMainnetConfig,
  Global,
  IStrategyMetadata,
  VesuRebalance,
  PricerFromApi,
  Web3Number,
} from '@strkfarm/sdk';
import MyNumber from '@/utils/MyNumber';
import { PoolInfo } from '@/store/pools';
import { DUMMY_BAL_ATOM, getBalanceAtom } from '@/store/balance.atoms';
import { atom } from 'jotai';

export class VesuRebalanceStrategy extends IStrategy {
  vesuRebalance: VesuRebalance;
  asset: TokenInfo;
  constructor(
    token: TokenInfo,
    name: string,
    description: string,
    strategy: IStrategyMetadata,
    liveStatus: StrategyLiveStatus,
    settings: IStrategySettings,
  ) {
    const rewardTokens = [{ logo: CONSTANTS.LOGOS.STRK }];
    const holdingTokens: TokenInfo[] = [
      {
        ...token,
        name: strategy.depositTokens[0].symbol,
        token: strategy.address.address,
        address: strategy.address.address,
        isERC4626: true,
      },
    ];
    super(
      `vesu_rebalance_${holdingTokens[0].name.toLowerCase()}`,
      name,
      name,
      description,
      rewardTokens,
      holdingTokens,
      liveStatus,
      settings,
    );

    this.asset = token;
    const config = getMainnetConfig(
      process.env.NEXT_PUBLIC_RPC_URL!,
      'pending',
    );
    const tokens = Global.getDefaultTokens();
    const pricer = new PricerFromApi(config, tokens);
    this.vesuRebalance = new VesuRebalance(config, pricer, strategy);
    this.riskFactor = strategy.risk.netRisk;

    const risks = [...this.risks];
    this.risks = [
      this.getSafetyFactorLine(),
      'Your original investment is safe. If you deposit 100 tokens, you will always get at least 100 tokens back, unless due to below reasons.',
      'The deposits are supplied on Vesu, a lending protocol that, while unlikely, has a risk of accumulating bad debt.',
      ...risks,
    ];
  }

  getTVL = async (): Promise<AmountInfo> => {
    const res = await this.vesuRebalance.getTVL();
    return {
      amount: new MyNumber(res.amount.toWei(), res.amount.decimals),
      usdValue: res.usdValue,
      tokenInfo: this.asset,
    };
  };

  getUserTVL = async (user: string): Promise<AmountInfo> => {
    const res = await this.vesuRebalance.getUserTVL(ContractAddr.from(user));
    return {
      amount: new MyNumber(res.amount.toWei(), res.amount.decimals),
      usdValue: res.usdValue,
      tokenInfo: this.asset,
    };
  };

  depositMethods = (inputs: DepositActionInputs) => {
    const { amount, address, provider } = inputs;
    if (!address || address == '0x0') {
      return [
        {
          tokenInfo: this.asset,
          calls: [],
          balanceAtom: DUMMY_BAL_ATOM,
        },
      ];
    }

    const amt = Web3Number.fromWei(amount.toString(), amount.decimals);
    const calls = this.vesuRebalance.depositCall(
      amt,
      ContractAddr.from(address),
    );

    return [
      {
        tokenInfo: this.asset,
        calls,
        balanceAtom: getBalanceAtom(this.asset, atom(true)),
      },
    ];
  };

  withdrawMethods = (inputs: WithdrawActionInputs) => {
    const { amount, address, provider } = inputs;
    if (!address || address == '0x0') {
      return [
        {
          tokenInfo: this.holdingTokens[0] as TokenInfo,
          calls: [],
          balanceAtom: DUMMY_BAL_ATOM,
        },
      ];
    }

    const amt = Web3Number.fromWei(amount.toString(), amount.decimals);
    const calls = this.vesuRebalance.withdrawCall(
      amt,
      ContractAddr.from(address),
      ContractAddr.from(address),
    );

    return [
      {
        tokenInfo: this.holdingTokens[0] as TokenInfo,
        calls,
        balanceAtom: getBalanceAtom(this.holdingTokens[0], atom(true)),
      },
    ];
  };

  async solve(pools: PoolInfo[], amount: string) {
    const poolsInfo = await this.vesuRebalance.getPools();
    if (poolsInfo.isError) {
      throw new Error('Failed to fetch pools for Vesu rebalance');
    }

    const yieldInfo = await this.vesuRebalance.netAPYGivenPools(poolsInfo.data);
    this.netYield = yieldInfo;
    console.log('netYield2', this.netYield, Number(amount));
    this.leverage = 1;

    this.investmentFlows = await this.vesuRebalance.getInvestmentFlows(
      poolsInfo.data,
    );

    this.postSolve();

    this.status = StrategyStatus.SOLVED;
  }
}
