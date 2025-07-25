import CONSTANTS from '@/constants';
import strkfarmLogo from '@public/logo.png';
import { atom } from 'jotai';
import { atomWithQuery, AtomWithQueryResult } from 'jotai-tanstack-query';
import { IDapp } from './IDapp.store';
import {
  APRSplit,
  Category,
  getCategoriesFromName,
  PoolInfo,
  PoolMetadata,
  PoolType,
  ProtocolAtoms,
} from './pools';
import { IInvestmentFlow } from '@strkfarm/sdk';
import { getLiveStatusEnum } from '@/strategies/IStrategy';

export interface STRKFarmStrategyAPIResult {
  name: string;
  id: string;
  apy: number;
  apySplit: {
    baseApy: number;
    rewardsApy: number;
  };
  depositToken: {
    name: string;
    address: string;
    symbol: string;
    decimals: number;
  }[];
  leverage: number;
  contract: { name: string; address: string }[];
  tvlUsd: number;
  status: {
    number: number;
    value: string;
  };
  riskFactor: number;
  logos: string[];
  isAudited: boolean;
  auditUrl?: string;
  actions: {
    name: string;
    protocol: {
      name: string;
      logo: string;
    };
    token: {
      name: string;
      logo: string;
    };
    amount: string;
    isDeposit: boolean;
    apy: number;
  }[];
  investmentFlows: IInvestmentFlow[];
}

export class STRKFarm extends IDapp<STRKFarmStrategyAPIResult> {
  name = 'Re7 Labs';
  logo = strkfarmLogo.src;
  incentiveDataKey = '';

  _computePoolsInfo(data: any) {
    const rawPools: STRKFarmStrategyAPIResult[] = data.strategies;
    const pools: PoolInfo[] = [];
    return rawPools.map((rawPool) => {
      const poolName = rawPool.name;
      const riskFactor = rawPool.riskFactor;

      const isStable = poolName.includes('USDC') || poolName.includes('USDT');
      const categories: Category[] = getCategoriesFromName(poolName, isStable);

      const rewardsApy: APRSplit[] = [];
      if (rawPool.apySplit.rewardsApy > 0) {
        rewardsApy.push({
          apr: rawPool.apySplit.rewardsApy,
          title: 'Rewards APY',
          description: 'Incentives by STRKFarm',
        });
      }

      const poolInfo: PoolInfo = {
        pool: {
          id: rawPool.id,
          name: poolName,
          logos: [...rawPool.logos],
        },
        protocol: {
          name: this.name,
          link: `/strategy/${rawPool.id}`,
          logo: this.logo,
        },
        apr:
          rewardsApy.length && rewardsApy[0].apr != 'Err'
            ? rewardsApy[0].apr
            : 0,
        tvl: rawPool.tvlUsd,
        aprSplits: [...rewardsApy],
        category: categories,
        type: PoolType.Derivatives,
        lending: {
          collateralFactor: 0,
        },
        borrow: {
          borrowFactor: 0,
          apr: 0,
        },
        additional: {
          riskFactor,
          tags: [getLiveStatusEnum(rawPool.status.number)],
          isAudited: rawPool.isAudited,
          auditUrl: rawPool.auditUrl,
          is_promoted: poolName.includes('Stake'),
        },
      };
      console.log('rawPool', poolName, poolInfo);
      return poolInfo;
    });
  }

  getBaseAPY(p: PoolInfo, data: AtomWithQueryResult<any, Error>) {
    const aprData: STRKFarmStrategyAPIResult[] = data.data.strategies;
    let baseAPY: number | 'Err' = 'Err';
    let splitApr: APRSplit | null = null;
    const metadata: PoolMetadata | null = null;
    if (data.isSuccess) {
      const item = aprData.find((doc) => doc.id === p.pool.id);
      if (item) {
        baseAPY = item.apySplit.baseApy;
        splitApr = {
          apr: item.apySplit.baseApy,
          title: 'Strategy APY',
          description: 'Includes fees & Defi spring rewards',
        };
      }
    }
    return {
      baseAPY,
      splitApr,
      metadata,
    };
  }
}

export const STRKFarmBaseAPYsAtom = atomWithQuery((get) => ({
  queryKey: ['strkfarm_base_aprs'],
  queryFn: async ({
    queryKey,
  }): Promise<{
    strategies: STRKFarmStrategyAPIResult[];
  }> => {
    const response = await fetch(`${CONSTANTS.STRKFarm.BASE_APR_API}`);
    const data = await response.json();
    return data;
  },
}));

export const strkfarm = new STRKFarm();
const STRKFarmAtoms: ProtocolAtoms = {
  baseAPRs: STRKFarmBaseAPYsAtom,
  pools: atom((get) => {
    const empty: PoolInfo[] = [];
    if (!STRKFarmAtoms.baseAPRs) return empty;
    const baseInfo = get(STRKFarmAtoms.baseAPRs);
    if (baseInfo.data) {
      const pools = strkfarm._computePoolsInfo(baseInfo.data);
      return strkfarm.addBaseAPYs(pools, baseInfo);
    }
    return empty;
  }),
};
export default STRKFarmAtoms;
