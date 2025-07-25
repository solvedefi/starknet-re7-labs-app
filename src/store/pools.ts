import CONSTANTS from '@/constants';
import { StrategyLiveStatus } from '@/strategies/IStrategy';
import { customAtomWithFetch } from '@/utils/customAtomWithFetch';
import { CustomAtomWithQueryResult } from '@/utils/customAtomWithQuery';
import { Atom, atom } from 'jotai';
import { AtomWithQueryResult } from 'jotai-tanstack-query';

export enum Category {
  Stable = 'Stable Pools',
  STRK = 'STRK Pools',
  ETH = 'ETH Pools',
  Others = 'Others',
}

export enum PoolType {
  DEXV2 = 'V2 LP DEX',
  DEXV3 = 'Concentrated LP DEX',
  Lending = 'Lending',
  Derivatives = 'Derivatives',
  Staking = 'Staking',
}

export interface APRSplit {
  apr: number | 'Err';
  title: string;
  description: string;
}

export interface PoolMetadata {
  borrow: {
    apr: number;
    borrowFactor: number;
  };
  lending: {
    collateralFactor: number;
  };
}

export interface PoolInfo extends PoolMetadata {
  pool: {
    id: string;
    name: string;
    logos: string[];
  };
  protocol: {
    name: string;
    link: string;
    logo: string;
  };
  tvl: number;
  apr: number; // not in %
  aprSplits: APRSplit[];
  category: Category[];
  type: PoolType;
  isLoading?: boolean;
  additional: {
    leverage?: number;
    riskFactor: number;
    tags: StrategyLiveStatus[];
    isAudited: boolean;
    auditUrl?: string;
    is_promoted?: boolean;
  };
}

export function isPoolRetired(pool: PoolInfo) {
  return pool.additional.tags.includes(StrategyLiveStatus.RETIRED);
}

export function getDefaultPoolInfo(): PoolInfo {
  return {
    pool: {
      id: '',
      name: '',
      logos: [],
    },
    protocol: {
      name: '',
      link: '',
      logo: '',
    },
    apr: 0,
    tvl: 0,
    aprSplits: [],
    category: [Category.Others],
    type: PoolType.Derivatives,
    additional: {
      riskFactor: 0,
      tags: [],
      isAudited: false,
    },
    borrow: {
      apr: 0,
      borrowFactor: 0,
    },
    lending: {
      collateralFactor: 0,
    },
  };
}

type NostraPoolData = {
  id?: string;
  address?: string;
  isDegen?: boolean;
  tokenA?: string;
  tokenAAddress?: string;
  tokenB?: string;
  tokenBAddress?: string;
  volume?: string;
  fee?: string;
  swap?: number;
  tvl?: string;
  baseApr?: string;
  rewardApr?: string;
  rewardAllocation?: string;
};

type NostraPools = Record<string, NostraPoolData>;

export interface ProtocolAtoms {
  pools: Atom<PoolInfo[]>;
  baseAPRs?: Atom<AtomWithQueryResult<any, Error>>;
}

export interface ProtocolAtoms2 {
  pools: Atom<PoolInfo[]>;
  baseAPRs?: Atom<CustomAtomWithQueryResult<any, Error>>;
}

export const StrkIncentivesQueryKeyAtom = atom([
  'strk_incentives',
  'isNostraDegen',
]);

const _StrkLendingIncentivesAtom = customAtomWithFetch({
  queryKey: 'strk_lending_incentives',
  url: CONSTANTS.LENDING_INCENTIVES_URL,
});

export const StrkLendingIncentivesAtom = atom((get) => {
  const _data = get(_StrkLendingIncentivesAtom);
  if (_data.data) {
    let data = JSON.stringify(_data.data);
    data = data.replaceAll('NaN', '0');
    _data.data = JSON.parse(data);
  }
  return _data;
});

/**
  Given pool name, returns appropriate category
  @param poolName: name of the pool
  @param isStable: default condition, suitable for pools with just one token like lending
  @returns: Category[]
*/
export function getCategoriesFromName(
  poolName: string,
  isStable: boolean = ['USDC', 'USDT'].includes(poolName),
): Category[] {
  const categories = [];

  // a pool can be both STRK and ETH
  if (poolName.includes('STRK')) {
    categories.push(Category.STRK);
  }
  if (poolName.includes('ETH')) {
    categories.push(Category.ETH);
  }

  // if a pool is already STRK or ETH, it cant be stable
  if (isStable && categories.length === 0) {
    categories.push(Category.Stable);
  }

  // fallback
  if (categories.length === 0) {
    categories.push(Category.Others);
  }

  return categories;
}
