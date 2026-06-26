import { AtomWithQueryResult } from 'jotai-tanstack-query';
import { APRSplit, PoolInfo, PoolMetadata } from './pools';
import { CustomAtomWithQueryResult } from '@/utils/customAtomWithQuery';

export class IDapp<BaseAPYT> {
  name: string = '';
  link: string = '';
  logo: string = '';

  incentiveDataKey: string = '';
  _computePoolsInfo(data: any): PoolInfo[] {
    throw new Error('not implemented: _computePoolsInfo');
  }

  addBaseAPYs<BaseAPYT>(
    pools: PoolInfo[],
    data: CustomAtomWithQueryResult<BaseAPYT, Error>,
  ): PoolInfo[] {
    if (data.isError) {
      console.error('Error fetching lending base', data.error);
    }
    return pools.map((p) => {
      const { baseAPY, splitApr, metadata } = this.getBaseAPY(p, <any>data);
      const aprSplits = p.aprSplits;
      if (splitApr) p.aprSplits.unshift(splitApr);
      return {
        ...p,
        isLoading: data.isLoading,
        aprSplits,
        apr: baseAPY !== 'Err' ? p.apr + baseAPY : p.apr,
        ...metadata,
      };
    });
  }

  getBaseAPY(
    p: PoolInfo,
    data: AtomWithQueryResult<BaseAPYT, Error>,
  ): {
    baseAPY: number | 'Err';
    splitApr: APRSplit | null;
    metadata: PoolMetadata | null;
  } {
    throw new Error('not implemented: getBaseAPY');
  }
}
