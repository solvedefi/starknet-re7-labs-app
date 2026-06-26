import CONSTANTS from '@/constants';
import {
  AmountsInfo,
  DepositActionInputs,
  IStrategy,
  IStrategyActionHook,
  IStrategySettings,
  onStratAmountsChangeFn,
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
  PricerFromApi,
  Web3Number,
  CLVaultStrategySettings,
  EkuboCLVault,
  SingleActionAmount,
} from '@strkfarm/sdk';
import MyNumber from '@/utils/MyNumber';
import { PoolInfo } from '@/store/pools';
import {
  BalanceResult,
  getBalanceAtom,
  returnEmptyBal,
} from '@/store/balance.atoms';
import { atom } from 'jotai';
import {
  buildStrategyActionHook,
  convertToMyNumber,
  convertToV1TokenInfo,
  convertToV2TokenInfo,
  convertToV2Web3Number,
  getTokenInfoFromName,
} from '@/utils';
import { atomWithQuery } from 'jotai-tanstack-query';
import { addressAtom } from '@/store/claims.atoms';

export class EkuboClStrategy extends IStrategy<CLVaultStrategySettings> {
  clVault: EkuboCLVault;
  isSingleTokenDepositView: boolean = false;
  constructor(
    name: string,
    description: string,
    strategy: IStrategyMetadata<CLVaultStrategySettings>,
    liveStatus: StrategyLiveStatus,
    settings: IStrategySettings,
  ) {
    const rewardTokens = [{ logo: CONSTANTS.LOGOS.STRK }];
    const holdingTokens: TokenInfo[] = [
      {
        name: strategy.name,
        token: strategy.address.address,
        address: strategy.address.address,
        isERC4626: false,
        decimals: 18,
        displayDecimals: 2,
        logo: CONSTANTS.LOGOS.STRK, // todo make it to dual token
        minAmount: MyNumber.fromEther('0.01', 18),
        maxAmount: MyNumber.fromEther('10000000000000', 18),
        stepAmount: MyNumber.fromEther('0.01', 18),
      },
    ];

    if (!process.env.NEXT_PUBLIC_RPC_URL) {
      throw new Error(`NEXT_PUBLIC_RPC_URL not found`);
    }
    const config = getMainnetConfig(process.env.NEXT_PUBLIC_RPC_URL!, 'latest');
    const tokens = Global.getDefaultTokens();
    const pricer = new PricerFromApi(config, tokens);
    const clVault = new EkuboCLVault(config, pricer, strategy);

    const token0Info = getTokenInfoFromName(strategy.depositTokens[0].symbol);
    const token1Info = getTokenInfoFromName(strategy.depositTokens[1].symbol);
    super(
      `ekubo_cl_${strategy.name.toLowerCase().replaceAll('/', '')}`,
      name,
      name,
      description,
      rewardTokens,
      holdingTokens,
      liveStatus,
      settings,
      clVault.metadata,
    );

    this.clVault = clVault;
    this.riskFactor = strategy.risk.netRisk;

    const risks = [...this.risks];
    this.risks = [
      this.getSafetyFactorLine(),
      'Your original investment is safe. If you deposit 100 tokens, you will always get at least 100 tokens back, unless due to below reasons.',
      'The deposits are supplied on Ekubo, a concentrated liquidity AMM, which can experience impermanent loss. Though, given this a pool of highly corelated tokens, the chances of a loss are very low.',
      // `The strategy tries to keep the position around ${this.metadata.additionalInfo.newBounds.lower} to ${this.metadata.additionalInfo.newBounds.upper} range in tick space to provide maximum utility of the capital, but this can lead to relatively high impermanent loss sometimes`,
      'Sometimes, the strategy may not earn yield for a short period. This happens when its temporarily out of range. During this time, we pause and observe before making any changes. Rebalancing too often could lead to unnecessary fees from withdrawals and swaps on Ekubo, so we try to avoid that unless its really needed.',
      ...risks,
    ];

    this.balanceAtoms = [
      this.getEkuboStratBalanceAtom(token0Info),
      this.getEkuboStratBalanceAtom(token1Info),
    ];
    this.balanceSummaryAtom = this.getSummaryBalanceAtom();
    this.balancesAtom = this.getBalancesAtom();
  }

  getPoolKey = async () => {
    return await this.clVault.getPoolKey();
  };

  getTVL = async (): Promise<AmountsInfo> => {
    const res = await this.clVault.getTVL();
    return {
      usdValue: res.usdValue,
      amounts: [res.token0, res.token1],
    };
  };

  getUserTVL = async (user: string): Promise<AmountsInfo> => {
    const res = await this.clVault.getUserTVL(ContractAddr.from(user));
    return {
      usdValue: res.usdValue,
      amounts: [res.token0, res.token1],
    };
  };

  async onAmountsChange(
    ...args: Parameters<onStratAmountsChangeFn>
  ): Promise<SingleActionAmount[]> {
    const changes = args[0];
    const allAmounts = args[1];
    const isToken0Change = changes.index === 0;
    const input = {
      token0: isToken0Change
        ? {
            ...changes.amountInfo,
          }
        : {
            amount: Web3Number.fromWei('0', allAmounts[0].tokenInfo.decimals),
            tokenInfo: allAmounts[0].tokenInfo,
          },
      token1: isToken0Change
        ? {
            amount: Web3Number.fromWei('0', allAmounts[1].tokenInfo.decimals),
            tokenInfo: allAmounts[1].tokenInfo,
          }
        : { ...changes.amountInfo },
    };
    const output = await this.clVault.matchInputAmounts(input);
    return [output.token0, output.token1];
  }

  depositMethods = async (inputs: DepositActionInputs) => {
    const { amount, address, amount2 } = inputs;
    const token0Info = getTokenInfoFromName(
      this.metadata.depositTokens[0].symbol,
    );
    const token1Info = getTokenInfoFromName(
      this.metadata.depositTokens[1].symbol,
    );
    if (!address || address === '0x0' || !amount2) {
      return [
        {
          ...buildStrategyActionHook([], [token0Info, token1Info]),
          onAmountsChange: this.onAmountsChange.bind(this),
        },
      ];
    }
    const amt = Web3Number.fromWei(amount.toString(), token0Info.decimals);
    const amt2 = Web3Number.fromWei(amount2.toString(), token1Info.decimals);
    const calls = await this.clVault.depositCall(
      {
        token0: {
          tokenInfo: this.clVault.metadata.depositTokens[0],
          amount: amt,
        },
        token1: {
          tokenInfo: this.clVault.metadata.depositTokens[1],
          amount: amt2,
        },
      },
      ContractAddr.from(address),
    );
    return [
      {
        ...buildStrategyActionHook(calls, [token0Info, token1Info]),
        onAmountsChange: this.onAmountsChange.bind(this),
      },
    ];
  };

  withdrawMethods = async (
    inputs: WithdrawActionInputs,
  ): Promise<IStrategyActionHook[]> => {
    const { amount, address, amount2 } = inputs;
    const output = {
      calls: [],
      amounts: [
        {
          tokenInfo: this.metadata.depositTokens[0],
          balanceAtom: this.balanceAtoms[0],
        },
        {
          tokenInfo: this.metadata.depositTokens[1],
          balanceAtom: this.balanceAtoms[1],
        },
      ],
      onAmountsChange: this.onAmountsChange.bind(this),
    };
    if (!address || address === '0x0' || !amount2) {
      return [output];
    }
    const amt = Web3Number.fromWei(
      amount.isZero() ? MyNumber.fromOne().toString() : amount.toString(),
      amount.decimals,
    );
    const amt2 = Web3Number.fromWei(
      amount2.isZero() ? MyNumber.fromOne().toString() : amount2.toString(),
      amount2.decimals,
    );
    const calls = await this.clVault.withdrawCall(
      {
        token0: {
          tokenInfo: this.clVault.metadata.depositTokens[0],
          amount: amt,
        },
        token1: {
          tokenInfo: this.clVault.metadata.depositTokens[1],
          amount: amt2,
        },
      },
      ContractAddr.from(address),
      ContractAddr.from(address),
    );
    return [
      {
        ...output,
        calls,
      },
    ];
  };

  async solve(_pools: PoolInfo[], _amount: string) {
    const yieldInfo = await this.clVault.netAPY('latest', 16000);
    this.netYield = yieldInfo;
    this.leverage = 1;

    this.investmentFlows = await this.clVault.getInvestmentFlows();

    this.postSolve();

    this.status = StrategyStatus.SOLVED;
  }

  getEkuboStratBalanceAtom = (underlyingToken: TokenInfo) => {
    const holdingBalAtom = getBalanceAtom(this.holdingTokens[0], atom(true));
    return atomWithQuery((get) => {
      return {
        queryKey: [
          'getEkuboStratBalanceAtom',
          this.holdingTokens[0].address,
          underlyingToken.token,
          get(addressAtom),
          JSON.stringify(get(holdingBalAtom).data),
        ],
        queryFn: async (): Promise<BalanceResult> => {
          try {
            const bal = get(holdingBalAtom);
            if (!bal.data) {
              return returnEmptyBal();
            }
            const userTVL = await this.getUserTVL(get(addressAtom) || '');
            const amountInfo = userTVL.amounts.find((amountInfo) =>
              amountInfo.tokenInfo.address.eqString(underlyingToken.token),
            );
            if (!amountInfo) {
              return returnEmptyBal();
            }
            return {
              amount: MyNumber.fromEther(
                amountInfo.amount.toFixed(),
                amountInfo.tokenInfo.decimals,
              ),
              tokenInfo: underlyingToken,
            };
          } catch (e) {
            console.error('getEkuboStratBalanceAtom err', e);
            return returnEmptyBal();
          }
        },
        refetchInterval: 60000,
      };
    });
  };

  getSummaryBalanceAtom = () => {
    return atomWithQuery((get) => {
      return {
        queryKey: [
          'getEkuboStratBalanceAtom',
          ...[get(this.balanceAtoms[0]), get(this.balanceAtoms[1])].map(
            (b) => `${b.data?.amount.toString()}-${b.data?.tokenInfo?.address}`,
          ),
          get(addressAtom),
        ],
        queryFn: async (): Promise<BalanceResult> => {
          const bal1 = get(this.balanceAtoms[0]);
          const bal2 = get(this.balanceAtoms[1]);
          if (
            !bal1.data ||
            !bal2.data ||
            !bal1.data.tokenInfo ||
            !bal2.data.tokenInfo
          ) {
            return returnEmptyBal();
          }
          const bal1Data = bal1.data;
          const bal2Data = bal2.data;
          const amounts: SingleActionAmount[] = [bal1Data, bal2Data].map(
            (b) => ({
              amount: convertToV2Web3Number(b.amount),
              tokenInfo: convertToV2TokenInfo(b.tokenInfo!),
            }),
          );
          const amountWeb3Number = await this.computeSummaryValue(
            amounts,
            this.settings.quoteToken,
            'ekubo::summary',
          );
          return {
            amount: convertToMyNumber(amountWeb3Number),
            tokenInfo: convertToV1TokenInfo(this.settings.quoteToken),
          };
        },
        refetchInterval: 60000,
      };
    });
  };
}
