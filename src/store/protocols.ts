import strkfarmLogo from '@public/logo.png';
import { atom } from 'jotai';
import { Category, PoolInfo, PoolType } from './pools';
import { getLiveStatusEnum } from '@/strategies/IStrategy';
import { StrategyDetails } from '@/hooks/useStrategiesInfo';

export const privatePoolsAtom = atom(() => {
  return [] as PoolInfo[];
});

export function getPoolInfoFromStrategy(strat: StrategyDetails): PoolInfo {
  const category = [Category.Others];
  if (strat.name.includes('STRK')) {
    category.push(Category.STRK);
  } else if (strat.name.includes('USDC')) {
    category.push(Category.Stable);
  } else if (strat.name.includes('ETH')) {
    category.push(Category.ETH);
  }
  const item = {
    pool: {
      id: strat.id,
      name: strat.name,
      logos: [...strat.logos],
    },
    contract: strat.contract,
    depositDetails: { ...strat.depositDetails, tokens: strat.depositToken },
    fees: strat.fees,
    volume: strat.volume,
    yields: strat.yields,
    protocol: {
      name: 'Re7 Labs',
      link: `/strategy/${strat.id}`,
      logo: strkfarmLogo.src,
    },
    tvl: strat.tvlUsd,
    apr: strat.calculatedApr,
    aprSplits: [
      {
        apr:
          strat.tvlUsd > 0
            ? strat.fees
              ? (strat.fees.amount * 52) / strat.tvlUsd
              : 0
            : 0,
        title: 'Strategy APY',
        description: 'Includes fees',
      },
    ],
    category,
    type: PoolType.Derivatives,
    borrow: {
      apr: 0,
      borrowFactor: 0,
    },
    lending: {
      collateralFactor: 0,
    },
    additional: {
      riskFactor: strat.riskFactor,
      tags: [getLiveStatusEnum(strat.status.number)],
      isAudited: strat.isAudited,
      auditUrl: strat.auditUrl,
      leverage: strat.leverage,
      is_promoted: strat.name.includes('Stake'),
    },
  };

  if (strat.apySplit.rewardsApy > 0) {
    item.aprSplits.push({
      apr: strat.apySplit.rewardsApy,
      title: 'Rewards APY',
      description: 'Additional incentives by STRKFarm',
    });
  }
  return item;
}
