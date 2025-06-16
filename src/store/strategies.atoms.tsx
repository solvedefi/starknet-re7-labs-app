import { atom } from 'jotai';
import {
  IStrategy,
  IStrategyProps,
  StrategyLiveStatus,
} from '@/strategies/IStrategy';
import { convertToV2TokenInfo, getTokenInfoFromName } from '@/utils';
import { privatePoolsAtom } from './protocols';
import { PoolInfo } from './pools';
import { Box, Link } from '@chakra-ui/react';
import { ContractAddr, EkuboCLVaultStrategies, Global } from '@strkfarm/sdk';
import { atomWithQuery } from 'jotai-tanstack-query';
import { EkuboClStrategy } from '@/strategies/ekubo_cl_vault';
import { IStrategyMetadata, CLVaultStrategySettings } from '@strkfarm/sdk';
import { VAULTS } from '@/constants';

export interface StrategyInfo<T> extends IStrategyProps<T> {
  name: string;
}

export function getStrategies() {
  const alerts2: any[] = [
    {
      type: 'warning',
      text: (
        <Box>
          Deposits are expected to fail for this strategy due to an ongoing
          zkLend security incident until further notice.{' '}
          <Link
            href="https://x.com/strkfarm/status/1889526043733794979"
            color="white"
            fontWeight={'bold'}
          >
            Learn more
          </Link>
        </Box>
      ),
      tab: 'deposit',
    },
    {
      type: 'warning',
      text: (
        <Box>
          You will receive withdrawals as zTokens, redeemable on zkLend.
          However, redemptions may be affected due to an ongoing security
          incident.{' '}
          <Link
            href="https://x.com/strkfarm/status/1889526043733794979"
            color="white"
            fontWeight={'bold'}
          >
            Learn more
          </Link>
        </Box>
      ),
      tab: 'withdraw',
    },
  ];

  const alerts: any[] = [
    {
      type: 'warning',
      text: (
        <Box>
          Deposits and Withdraws are paused for this strategy due to zkLend
          security incident until further notice.{' '}
          <Link
            href="https://x.com/strkfarm/status/1889526043733794979"
            color="white"
            fontWeight={'bold'}
          >
            Learn more
          </Link>
        </Box>
      ),
      tab: 'all',
    },
  ];

  const strategyMetadata: IStrategyMetadata<CLVaultStrategySettings> = {
    ...EkuboCLVaultStrategies[0],
    name: 'Re7 Ekubo xSTRK/STRK',
    description: 'Some description', // can be string too or ReactNode
    address: ContractAddr.from(
      '0x0684f7fc8ebd6dae56bbae2ea21bc81b2c9c29d014c564a8ae90507ea6d2c4cc',
    ),
    launchBlock: 1446217,
    depositTokens: [
      // We support most blue chip tokens in this list, so, for any vault, u just need
      // to specify the name
      // ? The order of tokens is import. First is Ekubo poolKey token0, second is token1
      // If token doesn't exist in our list, u can manually populate here as well
      Global.getDefaultTokens().find((t) => t.symbol === 'xSTRK')!,
      Global.getDefaultTokens().find((t) => t.symbol === 'STRK')!,
    ],
  };
  const re7EkuboXSTRKSTRK = new EkuboClStrategy(
    `Re7 Ekubo xSTRK/STRK`,
    (
      <div>Some description</div> // can be string too or ReactNode
    ),
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
        getTokenInfoFromName('STRK'), // quote token for this strategy, used to denominate user holdings of the pool in this asset as a summary
      ),
      isTransactionHistDisabled: true,
    },
  );

  const strategies: IStrategy<any>[] = [re7EkuboXSTRKSTRK];

  return VAULTS.map((vault) => {
    const strategyMetadata: IStrategyMetadata<CLVaultStrategySettings> = {
      ...EkuboCLVaultStrategies[0],
      name: vault.name,
      description: 'Some description', // can be string too or ReactNode
      address: ContractAddr.from(vault.address),
      launchBlock: vault.launchBlock,
      depositTokens: [
        // We support most blue chip tokens in this list, so, for any vault, u just need
        // to specify the name
        // ? The order of tokens is import. First is Ekubo poolKey token0, second is token1
        // If token doesn't exist in our list, u can manually populate here as well
        Global.getDefaultTokens().find((t) => t.symbol === vault.baseToken)!,
        Global.getDefaultTokens().find((t) => t.symbol === vault.quoteToken)!,
      ],
    };

    return new EkuboClStrategy(
      vault.name,
      (
        <div>Some description</div> // can be string too or ReactNode
      ),
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

export const STRATEGIES_INFO = getStrategies();

export const getPrivatePools = (get: any) => {
  // A placeholder to fetch any external pools/rewards info
  // that is not necessarily available in the allPools (i.e. not public)

  return [];
};

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
