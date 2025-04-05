import CONSTANTS from '@/constants';
import {
  AmountsInfo,
  DepositActionInputs,
  IStrategy,
  IStrategyActionHook,
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
  VesuRebalanceSettings,
} from '@strkfarm/sdk';
import { PoolInfo } from '@/store/pools';
import {
  buildStrategyActionHook,
  DummyStrategyActionHook,
  ZeroAmountsInfo,
} from '@/utils';
import { getBalanceAtom } from '@/store/balance.atoms';
import { atom } from 'jotai';

export class VesuRebalanceStrategy extends IStrategy<VesuRebalanceSettings> {
  vesuRebalance: VesuRebalance;
  asset: TokenInfo;
  constructor(
    token: TokenInfo,
    name: string,
    description: string,
    strategy: IStrategyMetadata<VesuRebalanceSettings>,
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

    const config = getMainnetConfig(
      process.env.NEXT_PUBLIC_RPC_URL!,
      'pending',
    );
    const tokens = Global.getDefaultTokens();
    const pricer = new PricerFromApi(config, tokens);
    const vesuRebalance = new VesuRebalance(config, pricer, strategy);

    super(
      `vesu_fusion_${holdingTokens[0].name.toLowerCase()}`,
      name,
      name,
      description,
      rewardTokens,
      holdingTokens,
      liveStatus,
      settings,
      vesuRebalance.metadata,
    );

    this.asset = token;
    this.vesuRebalance = vesuRebalance;
    this.riskFactor = strategy.risk.netRisk;

    const risks = [...this.risks];
    this.risks = [
      this.getSafetyFactorLine(),
      'Your original investment is safe. If you deposit 100 tokens, you will always get at least 100 tokens back, unless due to below reasons.',
      'The deposits are supplied on Vesu, a lending protocol that, while unlikely, has a risk of accumulating bad debt.',
      ...risks,
    ];
  }

  getTVL = async (): Promise<AmountsInfo> => {
    const res = await this.vesuRebalance.getTVL();
    return {
      usdValue: res.usdValue,
      amounts: [res],
    };
  };

  getUserTVL = async (user: string): Promise<AmountsInfo> => {
    try {
      const res = await this.vesuRebalance.getUserTVL(ContractAddr.from(user));
      return {
        usdValue: res.usdValue,
        amounts: [res],
      };
    } catch (e) {
      console.error('Error getting user TVL:', e);
      return ZeroAmountsInfo([this.asset]);
    }
  };

  depositMethods = async (inputs: DepositActionInputs) => {
    const { amount, address, provider } = inputs;
    if (!address || address == '0x0') {
      return [DummyStrategyActionHook([this.asset])];
    }

    const amt = Web3Number.fromWei(amount.toString(), amount.decimals);
    const calls = await this.vesuRebalance.depositCall(
      {
        tokenInfo: this.vesuRebalance.asset(),
        amount: amt,
      },
      ContractAddr.from(address),
    );

    return [buildStrategyActionHook(calls, [this.asset])];
  };

  withdrawMethods = async (
    inputs: WithdrawActionInputs,
  ): Promise<IStrategyActionHook[]> => {
    const { amount, address, provider } = inputs;
    if (!address || address == '0x0') {
      return [DummyStrategyActionHook([this.holdingTokens[0] as TokenInfo])];
    }

    const amt = Web3Number.fromWei(amount.toString(), amount.decimals);
    const calls = await this.vesuRebalance.withdrawCall(
      {
        tokenInfo: this.vesuRebalance.asset(),
        amount: amt,
      },
      ContractAddr.from(address),
      ContractAddr.from(address),
    );

    return [
      {
        calls,
        amounts: [
          {
            balanceAtom: getBalanceAtom(this.holdingTokens[0], atom(true)),
            tokenInfo: this.vesuRebalance.asset(),
          },
        ],
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
