import { TOKENS } from '@/constants';
import { atomWithQuery } from 'jotai-tanstack-query';
import { atomWithStorage, createJSONStorage } from 'jotai/utils';
import { addressAtom } from './claims.atoms';
import fetchWithRetry from '@/utils/fetchWithRetry';
import { SingleTokenInfo } from '@strkfarm/sdk';
import { atom } from 'jotai';
import { atomFamily } from 'jotai/utils';
import { getPrice, standariseAddress } from '@/utils';

interface DAppStats {
  tvl: number;
}

export const dAppStatsAtom = atomWithQuery((get) => ({
  queryKey: ['stats'],
  queryFn: async (): Promise<DAppStats> => {
    const res = await fetchWithRetry(
      '/api/stats',
      {},
      'Error fetching TVL info',
    );
    if (!res) return { tvl: 0 };
    return await res.json();
  },
}));

export interface StrategyWise {
  id: string;
  usdValue: number;
  holdings: SingleTokenInfo[];
}

export interface UserStats {
  holdingsUSD: number;
  strategyWise: StrategyWise[];
}

export const userStatsAtom = atomWithQuery((get) => ({
  queryKey: ['user_stats', get(addressAtom)],
  queryFn: async ({ queryKey }: any): Promise<UserStats | null> => {
    console.log('queryKey', queryKey);
    const [_, addr] = queryKey;
    if (!addr) {
      return null;
    }
    const res = await fetchWithRetry(
      `/api/stats/${addr}`,
      {},
      'Error fetching user stats',
    );
    if (!res) return null;
    const data: UserStats = await res.json();
    if (data.holdingsUSD !== 0 && !data.holdingsUSD) return null;
    return data;
  },
  refetchInterval: 5000,
}));

export const userStrategyWiseTVLAtom = atomFamily((strategyId: string) => {
  return atom((get) => {
    const userStats = get(userStatsAtom);
    const isPending = userStats.isPending;
    const error = userStats.error;

    if (!userStats || !userStats.data || !userStats.data.strategyWise) {
      return {
        data: 0,
        isPending,
        error,
      };
    }
    const strategy = userStats.data.strategyWise.find(
      (s) => s.id === strategyId,
    );
    return {
      data: strategy && strategy.usdValue ? strategy.usdValue : 0,
      isPending,
      error,
    };
  });
});

interface Price {
  tokenName: string;
  tokenAddress: string;
  decimals: number;
  price: number;
}

export const tokenPricesAtom = atomWithQuery(() => ({
  queryKey: ['prices'],
  queryFn: async (): Promise<Price[]> => {
    const tokenPrices = TOKENS.map(async (token) => {
      try {
        const price = await getPrice(token);
        return {
          tokenName: token.name,
          tokenAddress: standariseAddress(token.token),
          decimals: token.decimals,
          price,
        };
      } catch (e) {
        return {
          tokenName: token.name,
          tokenAddress: standariseAddress(token.token),
          decimals: token.decimals,
          price: 0,
        };
      }
    });
    return await Promise.all(tokenPrices);
  },
}));

// export const strategyTVLAtom = atom((get) => {
//     const prices = get(pricesAtom);
//     const tvl = prices.reduce((acc, price) => {
//         let tokenInfo = TOKENS.find(t => t.name == price.tokenName)
//         if (tokenInfo) {
//             return acc + (parseFloat(price.price) * tokenInfo.totalSupply)
//         }
//         return acc;
//     }, 0)
//     return tvl;
// })

const ISSERVER = typeof window === 'undefined';
declare let localStorage: any;

export const lastWalletAtom = atomWithStorage<null | string>(
  'starknetLastConnectedWallet',
  null,
  {
    setItem: (key, value) => {
      localStorage.setItem(key, value);
    },
    getItem: (key: string) => {
      return localStorage.getItem(key);
    },
    removeItem: (key: string) => {
      localStorage.removeItem(key);
    },
  },
);

export function createAtomWithStorage<T>(
  key: string,
  defaultValue: T,
  getter?: (key: string, initialValue: T) => PromiseLike<T>,
) {
  let storageConfig = createJSONStorage<T>(() => {
    if (!ISSERVER) return localStorage;
    return null;
  });
  if (getter) {
    storageConfig = { ...storageConfig, getItem: getter };
  }
  return atomWithStorage<T>(key, defaultValue, storageConfig, {
    getOnInit: true,
  });
}
