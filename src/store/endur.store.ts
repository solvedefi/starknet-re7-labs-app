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
