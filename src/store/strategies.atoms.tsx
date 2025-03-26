import { atom } from 'jotai';
import {
  IStrategy,
  IStrategyProps,
  StrategyLiveStatus,
} from '@/strategies/IStrategy';
import CONSTANTS from '@/constants';
import Mustache from 'mustache';
import { getTokenInfoFromName } from '@/utils';
import { allPoolsAtomUnSorted, privatePoolsAtom } from './protocols';
import EndurAtoms, { endur } from './endur.store';
import { getDefaultPoolInfo, PoolInfo } from './pools';
import { AutoTokenStrategy } from '@/strategies/auto_strk.strat';
import { DeltaNeutralMM } from '@/strategies/delta_neutral_mm';
import { DeltaNeutralMM2 } from '@/strategies/delta_neutral_mm_2';
import { DeltaNeutralMMVesuEndur } from '@/strategies/delta_neutral_mm_vesu_endur';
import { Box, Link } from '@chakra-ui/react';
import { VesuRebalanceStrategies } from '@strkfarm/sdk';
import { VesuRebalanceStrategy } from '@/strategies/vesu_rebalance';
import { atomWithQuery } from 'jotai-tanstack-query';

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

  const autoStrkStrategy = new AutoTokenStrategy(
    'STRK',
    'Auto Compounding STRK',
    "Stake your STRK or zkLend's zSTRK token to receive DeFi Spring $STRK rewards every 7 days. The strategy auto-collects your rewards and re-invests them in the zkLend STRK pool, giving you higher return through compounding. You receive frmzSTRK LP token as representation for your stake on STRKFarm. You can withdraw anytime by redeeming your frmzSTRK for zSTRK and see your STRK in zkLend.",
    'zSTRK',
    CONSTANTS.CONTRACTS.AutoStrkFarm,
    {
      maxTVL: 2000000,
      isAudited: true,
      isPaused: false,
      alerts: alerts2,
    },
  );
  const autoUSDCStrategy = new AutoTokenStrategy(
    'USDC',
    'Auto Compounding USDC',
    "Stake your USDC or zkLend's zUSDC token to receive DeFi Spring $STRK rewards every 7 days. The strategy auto-collects your $STRK rewards, swaps them to USDC and re-invests them in the zkLend USDC pool, giving you higher return through compounding. You receive frmzUSDC LP token as representation for your stake on STRKFarm. You can withdraw anytime by redeeming your frmzUSDC for zUSDC and see your STRK in zkLend.",
    'zUSDC',
    CONSTANTS.CONTRACTS.AutoUsdcFarm,
    {
      maxTVL: 2000000,
      isAudited: true,
      isPaused: false,
      alerts: alerts2,
    },
  );

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

  const DNMMDescription = `Deposit your {{token1}} to automatically loop your funds between zkLend and Nostra to create a delta neutral position. This strategy is designed to maximize your yield on {{token1}}. Your position is automatically adjusted periodically to maintain a healthy health factor. You receive a NFT as representation for your stake on STRKFarm. You can withdraw anytime by redeeming your NFT for {{token1}}.`;
  const usdcTokenInfo = getTokenInfoFromName('USDC');
  const deltaNeutralMMUSDCETH = new DeltaNeutralMM(
    usdcTokenInfo,
    'USDC Sensei',
    Mustache.render(DNMMDescription, { token1: 'USDC', token2: 'ETH' }),
    'ETH',
    CONSTANTS.CONTRACTS.DeltaNeutralMMUSDCETH,
    [1, 0.615384615, 1, 0.584615385, 0.552509024], // precomputed factors based on strategy math
    StrategyLiveStatus.RETIRED,
    {
      maxTVL: 1500000,
      isAudited: true,
      alerts,
      isPaused: true,
    },
  );

  const deltaNeutralMMETHUSDC = new DeltaNeutralMM(
    getTokenInfoFromName('ETH'),
    'ETH Sensei',
    Mustache.render(DNMMDescription, { token1: 'ETH', token2: 'USDC' }),
    'USDC',
    CONSTANTS.CONTRACTS.DeltaNeutralMMETHUSDC,
    [1, 0.609886, 1, 0.920975, 0.510078], // precomputed factors based on strategy math
    StrategyLiveStatus.RETIRED,
    {
      maxTVL: 1000,
      alerts,
      isAudited: true,
      isPaused: true,
    },
  );
  const deltaNeutralMMSTRKETH = new DeltaNeutralMM(
    getTokenInfoFromName('STRK'),
    'STRK Sensei',
    Mustache.render(DNMMDescription, { token1: 'STRK', token2: 'ETH' }),
    'ETH',
    CONSTANTS.CONTRACTS.DeltaNeutralMMSTRKETH,
    [1, 0.384615, 1, 0.492308, 0.233276], // precomputed factors based on strategy math, last is the excess deposit1 that is happening
    StrategyLiveStatus.RETIRED,
    {
      maxTVL: 1500000,
      isAudited: true,
      alerts,
      isPaused: true,
    },
  );

  const deltaNeutralMMETHUSDCReverse = new DeltaNeutralMM2(
    getTokenInfoFromName('ETH'),
    'ETH Sensei XL',
    Mustache.render(DNMMDescription, { token1: 'ETH', token2: 'USDC' }),
    'USDC',
    CONSTANTS.CONTRACTS.DeltaNeutralMMETHUSDCXL,
    [1, 0.5846153846, 1, 0.920975, 0.552509], // precomputed factors based on strategy math
    StrategyLiveStatus.RETIRED,
    {
      maxTVL: 2000,
      alerts,
      isAudited: false,
      isPaused: true,
    },
  );

  const xSTRKDescription = `Deposit your {{token1}} to automatically loop your funds via Endur and Vesu to create a delta neutral position. This strategy is designed to maximize your yield on {{token1}}. Your position is automatically adjusted periodically to maintain a healthy health factor. You receive a NFT as representation for your stake on STRKFarm. You can withdraw anytime by redeeming your NFT for {{token2}}.`;
  const deltaNeutralxSTRKSTRK = new DeltaNeutralMMVesuEndur(
    getTokenInfoFromName('STRK'),
    'xSTRK Sensei',
    Mustache.render(xSTRKDescription, { token1: 'STRK', token2: 'xSTRK' }),
    'xSTRK',
    CONSTANTS.CONTRACTS.DeltaNeutralxSTRKSTRKXL,
    [1, 1, 0.725, 1.967985], // precomputed factors based on strategy math
    StrategyLiveStatus.ACTIVE,
    {
      maxTVL: 500000,
      alerts: [
        // {
        //   type: 'warning',
        //   text: 'Note: Deposits may fail sometimes due to high utilisation on Vesu. We are working to add a dynamic TVL limit to better show limits.',
        //   tab: 'deposit',
        // },
        {
          type: 'info',
          text: 'Depeg-risk: If xSTRK price on DEXes deviates from expected price, you may lose money or may have to wait for the price to recover.',
          tab: 'all',
        },
      ],
      isAudited: false,
    },
  );

  const vesuRebalanceStrats = VesuRebalanceStrategies.map((v) => {
    return new VesuRebalanceStrategy(
      getTokenInfoFromName(v.depositTokens[0].symbol),
      v.name,
      v.description,
      v,
      StrategyLiveStatus.HOT,
      {
        maxTVL: 0,
        isAudited: v.auditUrl ? true : false,
        auditUrl: v.auditUrl,
        isPaused: false,
      },
    );
  });

  // const xSTRKStrategy = new AutoXSTRKStrategy(
  //   'Stake STRK',
  //   'Endur is Starknet’s dedicated staking platform, where you can stake STRK to earn staking rewards. This strategy, built on Endur, is an incentivized vault that boosts returns by offering additional rewards. In the future, it may transition to auto-compounding on DeFi Spring, reinvesting rewards for maximum growth. Changes will be announced at least three days in advance on our socials.',
  //   CONSTANTS.CONTRACTS.AutoxSTRKFarm,
  //   {
  //     maxTVL: 2000000,
  //     alerts: [],
  //     is_promoted: true,
  //   },
  // );

  const strategies: IStrategy<any>[] = [
    autoStrkStrategy,
    autoUSDCStrategy,
    deltaNeutralMMUSDCETH,
    deltaNeutralMMETHUSDC,
    deltaNeutralMMSTRKETH,
    deltaNeutralMMETHUSDCReverse,
    deltaNeutralxSTRKSTRK,
    ...vesuRebalanceStrats,
    // xSTRKStrategy,
  ];

  return strategies;
}

export const STRATEGIES_INFO = getStrategies();

export const getPrivatePools = (get: any) => {
  // A placeholder to fetch any external pools/rewards info
  // that is not necessarily available in the allPools (i.e. not public)
  const endurRewardInfo = get(EndurAtoms.rewardInfo);
  const endurRewardPoolInfo = getDefaultPoolInfo();
  endurRewardPoolInfo.pool.id = 'endur_strk_reward';
  endurRewardPoolInfo.protocol.name = endur.name;
  endurRewardPoolInfo.protocol.link = endur.link;
  endurRewardPoolInfo.protocol.logo = endur.logo;
  endurRewardPoolInfo.pool.name = 'STRK';
  endurRewardPoolInfo.pool.logos = [getTokenInfoFromName('STRK').logo];
  endurRewardPoolInfo.apr = endurRewardInfo.data || 0;

  return [endurRewardPoolInfo];
};

const strategiesAtomAsync = atomWithQuery((get) => {
  return {
    queryKey: ['strategies'],
    queryFn: async () => {
      const strategies = getStrategies();
      const allPools = get(allPoolsAtomUnSorted);
      const requiredPools = allPools.filter(
        (p) =>
          p.protocol.name === 'zkLend' ||
          p.protocol.name === 'Nostra' ||
          p.protocol.name === 'Vesu' ||
          p.protocol.name === endur.name,
      );

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
  if (status == StrategyLiveStatus.NEW) {
    return 1;
  } else if (status == StrategyLiveStatus.ACTIVE) {
    return 2;
  } else if (status == StrategyLiveStatus.COMING_SOON) {
    return 3;
  } else if (status == StrategyLiveStatus.HOT) {
    return 5;
  }
  return 4;
}

export function getLiveStatusEnum(status: number) {
  if (status == 1) {
    return StrategyLiveStatus.NEW;
  } else if (status == 2) {
    return StrategyLiveStatus.ACTIVE;
  } else if (status == 3) {
    return StrategyLiveStatus.COMING_SOON;
  } else if (status == 5) {
    return StrategyLiveStatus.HOT;
  }
  return StrategyLiveStatus.RETIRED;
}
