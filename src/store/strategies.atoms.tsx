import { atom } from 'jotai';
import { IStrategyProps, StrategyLiveStatus } from '@/strategies/IStrategy';
import { convertToV2TokenInfo, getTokenInfoFromName } from '@/utils';
import { privatePoolsAtom } from './protocols';
import { PoolInfo } from './pools';
import { ContractAddr, EkuboCLVaultStrategies, Global } from '@strkfarm/sdk';
import { atomWithQuery } from 'jotai-tanstack-query';
import { EkuboClStrategy } from '@/strategies/ekubo_cl_vault';
import { IStrategyMetadata, CLVaultStrategySettings } from '@strkfarm/sdk';
import { VAULTS } from '@/constants';

export interface StrategyInfo<T> extends IStrategyProps<T> {
  name: string;
}

export function getStrategies() {
  return VAULTS.map((vault) => {
    // SDK 2.0 asserts depositTokens[0]/[1] match the on-chain Ekubo poolKey
    // token0/token1, which Ekubo orders by ascending address. Sort here so
    // VAULTS entries don't need to know about Ekubo's ordering convention.
    const baseTokenInfo = Global.getDefaultTokens().find(
      (t) => t.symbol === vault.baseToken,
    )!;
    const quoteTokenInfo = Global.getDefaultTokens().find(
      (t) => t.symbol === vault.quoteToken,
    )!;
    const depositTokens =
      baseTokenInfo.address.toBigInt() < quoteTokenInfo.address.toBigInt()
        ? [baseTokenInfo, quoteTokenInfo]
        : [quoteTokenInfo, baseTokenInfo];

    const strategyMetadata: IStrategyMetadata<CLVaultStrategySettings> = {
      ...EkuboCLVaultStrategies[0],
      name: vault.name,
      description: `
        Our vault puts your tokens to work in Ekubo pools to earn fees, auto-claims rewards,
        swaps to pool tokens, redeposits, and rebalances - all on-chain and non-custodial.
        An off-chain service safely automates harvesting and rebalancing, without ever holding your funds.
        You stay in control and can withdraw anytime.
      `,
      address: ContractAddr.from(vault.address),
      launchBlock: vault.launchBlock,
      depositTokens,
    };

    return new EkuboClStrategy(
      vault.name,

      `Our vault puts your tokens to work in Ekubo pools to earn fees,
          auto-claims rewards, swaps to pool tokens, redeposits, and rebalances
          - all on-chain and non-custodial. An off-chain service safely
          automates harvesting and rebalancing, without ever holding your funds.
          You stay in control and can withdraw anytime.`,
      strategyMetadata,
      StrategyLiveStatus.HOT,
      {
        maxTVL: 0,
        isAudited: EkuboCLVaultStrategies[0].auditUrl ? true : false,
        auditUrl: EkuboCLVaultStrategies[0].auditUrl,
        isPaused: false,
        alerts: [
          {
            type: 'info',
            text: 'Depending on the current position range and price, your input amounts are automatially adjusted to nearest required amounts',
            tab: 'all',
          },
        ],
        quoteToken: convertToV2TokenInfo(
          getTokenInfoFromName(vault.baseToken), // quote token for this strategy, used to denominate user holdings of the pool in this asset as a summary
        ),
        isTransactionHistDisabled: true,
      },
    );
  });
}

const strategiesAtomAsync = atomWithQuery((get) => {
  return {
    queryKey: ['strategies'],
    queryFn: async () => {
      const strategies = getStrategies();
      const requiredPools: PoolInfo[] = [];

      const privatePools: PoolInfo[] = get(privatePoolsAtom);
      const proms = strategies.map((s) =>
        s.solve([...requiredPools, ...privatePools], '1000'),
      );
      await Promise.all(proms);

      strategies.sort((a, b) => {
        const status1 = getLiveStatusNumber(a.liveStatus);
        const status2 = getLiveStatusNumber(b.liveStatus);
        return status1 - status2 || b.netYield - a.netYield;
      });
      return strategies;
    },
  };
});

export const strategiesAtom = atom<StrategyInfo<any>[]>((get) => {
  const { data } = get(strategiesAtomAsync);
  if (!data) {
    const strategies = getStrategies();
    return strategies;
  }
  return data;
});

export function getLiveStatusNumber(status: StrategyLiveStatus) {
  if (status == StrategyLiveStatus.HOT) {
    return 1;
  }
  if (status == StrategyLiveStatus.NEW) {
    return 2;
  } else if (status == StrategyLiveStatus.ACTIVE) {
    return 3;
  } else if (status == StrategyLiveStatus.COMING_SOON) {
    return 4;
  }
  return 5;
}
