import { STRKFarmStrategyAPIResult } from '@/store/strkfarm.atoms';
import {
  getFeesHistoryAtom,
  UserDepsositsAtom,
} from '@/store/transactions.atom';
import { useAccount } from '@starknet-react/core';
import { useAtomValue } from 'jotai';
import { AtomWithQueryResult } from 'jotai-tanstack-query';
import { useMemo } from 'react';

export type StrategyDetails = STRKFarmStrategyAPIResult & {
  depositDetails: {
    amount: number;
    isLoading: boolean;
  };
  fees: {
    amount: number;
    isLoading: boolean;
  };
};

const useStrategyFees = (contracts: string[]) => {
  const memoedFees = useMemo(() => {
    return getFeesHistoryAtom(contracts);
  }, [contracts]);

  const fees: AtomWithQueryResult<Record<string, number>, Error> = useAtomValue(
    memoedFees,
  );
  return fees;
};

const useUserDeposits = (
  contracts: string[],
  stratsDepositSymbols: string[][],
) => {
  const { address } = useAccount();
  const depositsAtom = useMemo(() => {
    return UserDepsositsAtom(contracts, stratsDepositSymbols, address);
  }, [contracts, stratsDepositSymbols, address]);

  const deposits: AtomWithQueryResult<
    Record<string, number>,
    Error
  > = useAtomValue(depositsAtom);
  return deposits;
};

export const useStrategiesInfo = (
  strkFarmPools: STRKFarmStrategyAPIResult[],
) => {
  // Memoize the arrays to prevent infinite re-renders
  const contracts = useMemo(
    () => strkFarmPools.map((pool) => pool.contract[0].address),
    [strkFarmPools],
  );

  const tokenSymbols = useMemo(
    () =>
      strkFarmPools.map((pool) =>
        pool.depositToken.map((token) => token.symbol),
      ),
    [strkFarmPools],
  );

  const { data: fees, isLoading: feesLoading } = useStrategyFees(contracts);
  const { data: deposits, isLoading: depositsLoading } = useUserDeposits(
    contracts,
    tokenSymbols,
  );

  return strkFarmPools.map((pool) => {
    const contract = pool.contract[0].address;
    return {
      ...pool,
      depositDetails: {
        amount: deposits?.[contract] || 0,
        isLoading: depositsLoading,
      },
      fees: {
        amount: fees?.[contract] || 0,
        isLoading: feesLoading,
      },
    };
  });
};
