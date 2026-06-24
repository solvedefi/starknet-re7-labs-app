import { StrategyLiveStatus, TokenInfo } from '@/strategies/IStrategy';
import { Atom } from 'jotai';
import { AtomWithQueryResult } from 'jotai-tanstack-query';

export enum Category {
  Stable = 'Stable Pools',
  STRK = 'STRK Pools',
  ETH = 'ETH Pools',
  Others = 'Others',
}

export enum PoolType {
  Derivatives = 'Derivatives',
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

interface DepositDetails {
  tokens: Pick<TokenInfo, 'name' | 'address' | 'decimals'>[];
  amount: number;
  isLoading: boolean;
}
export interface PoolInfo extends PoolMetadata {
  pool: {
    id: string;
    name: string;
    logos: string[];
  };
  contract?: { name: string; address: string }[];
  depositDetails?: DepositDetails;
  fees?: {
    amount: number;
    isLoading: boolean;
  };
  yields?: {
    amount: number;
    isLoading: boolean;
  };
  volume?: {
    amount: number;
    isLoading: boolean;
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

export interface ProtocolAtoms {
  pools: Atom<PoolInfo[]>;
  baseAPRs?: Atom<AtomWithQueryResult<any, Error>>;
}

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
