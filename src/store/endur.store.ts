import { atom } from 'jotai';

import { StrategyLiveStatus } from '@/strategies/IStrategy';
import { getTokenInfoFromName } from '@/utils';
import { customAtomWithFetch } from '@/utils/customAtomWithFetch';
import { IDapp } from './IDapp.store';
import { Category, PoolInfo, PoolType } from './pools';

interface PoolData {
  tvl: number;
  apr: {
    percentage: number;
    apr_cl: number;
    apr: number;
    incentive_apr: number;
  };
}

export interface IndexedPoolData {
  [key: string]: PoolData[];
}

export class Endur extends IDapp<IndexedPoolData> {
  name = 'Endur';
  link = 'https://endur.fi/r/strkfarm';
  logo = 'https://endur.fi/favicon.ico';
  incentiveDataKey: string = 'Endur';
}

export const endur = new Endur();

const EndurAtoms = {
  endurStats: customAtomWithFetch({
    url: 'https://app.endur.fi/api/stats',
    queryKey: 'Endur_stats',
  }),
  pools: atom((get) => {
    const empty: PoolInfo[] = [];
    const stats = get(EndurAtoms.endurStats);
    if (stats.data) {
      const poolInfo: PoolInfo = {
        pool: {
          id: 'endur_strk',
          name: 'STRK',
          logos: [getTokenInfoFromName('STRK').logo],
        },
        protocol: {
          name: endur.name,
          link: endur.link,
          logo: endur.logo,
        },
        apr: stats.data.apy,
        tvl: stats.data.tvl,
        aprSplits: [
          {
            apr: stats.data.apy,
            title: 'Net Yield',
            description: 'Includes fees & Defi spring rewards',
          },
        ],
        category: [Category.STRK],
        type: PoolType.Staking,
        additional: {
          riskFactor: 0.5,
          tags: [StrategyLiveStatus.HOT],
          isAudited: true,
        },
        borrow: {
          apr: 0,
          borrowFactor: 0,
        },
        lending: {
          collateralFactor: 0,
        },
      };
      return [poolInfo];
    }
    return empty;
  }),
};

export default EndurAtoms;
