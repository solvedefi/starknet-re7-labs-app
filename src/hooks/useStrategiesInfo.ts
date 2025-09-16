import { getStrategies, strategiesAtom } from '@/store/strategies.atoms';
import { STRKFarmStrategyAPIResult } from '@/store/strkfarm.atoms';
import {
  getFeesHistoryAtom,
  UserDepsositsAtom,
} from '@/store/transactions.atom';
import { useAccount } from '@starknet-react/core';
import { EkuboCLVault } from '@strkfarm/sdk';
import { useAtomValue } from 'jotai';
import { AtomWithQueryResult } from 'jotai-tanstack-query';
import { useEffect, useMemo, useState } from 'react';

type LoadedNumericalValue = {
  amount: number;
  isLoading: boolean;
};

export type StrategyDetails = STRKFarmStrategyAPIResult & {
  depositDetails: LoadedNumericalValue;
  fees: LoadedNumericalValue;
  yields: LoadedNumericalValue;
  volume: LoadedNumericalValue;
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

const useUserYields = (deposits?: Record<string, number>) => {
  const [userYields, setUserYields] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { address } = useAccount();
  const strategies = useAtomValue(strategiesAtom);

  useEffect(() => {
    if (
      !address ||
      strategies.length === 0 ||
      deposits === undefined ||
      Object.keys(deposits).length === 0
    )
      return;
    setIsLoading(true);

    const tvlPromises = strategies.map(async (strategy) => {
      const contract = strategy.metadata.address.toString();
      const tvl = await strategy.getUserTVL(address || '0x0');

      const deposit = deposits?.[contract];
      if (deposit === undefined) return [contract, 0];

      return [contract, tvl.usdValue - deposit];
    });
    Promise.all(tvlPromises).then((userYields) => {
      setUserYields(Object.fromEntries(userYields));
      setIsLoading(false);
    });
  }, [strategies, deposits, address, setIsLoading]);

  return { data: userYields, isLoading };
};

const useVolume = (fees?: Record<string, number>) => {
  const [volume, setVolume] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({});
  const strategies = useMemo(getStrategies, []);
  useEffect(() => {
    if (fees === undefined || Object.keys(fees).length === 0) {
      setIsLoading({});
      setVolume({});
      return;
    }
    strategies.forEach((strategy) => {
      const contract = strategy.metadata.address.toString();
      setIsLoading((prev) => ({ ...prev, [contract]: true }));
      const contractFees = fees?.[contract];
      if (contractFees === undefined) return;
      strategy.getPoolKey().then((poolKey) => {
        const rawFeeQ128 = BigInt(poolKey.fee);
        const feePct = EkuboCLVault.div2Power128(rawFeeQ128);
        const volume = contractFees / feePct;
        setVolume((prev) => ({ ...prev, [contract]: volume }));
        setIsLoading((prev) => ({ ...prev, [contract]: false }));
      });
    });
  }, [strategies, fees]);

  return { data: volume, isLoading };
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

  const {
    data: fees,
    isLoading: feesLoading,
    isPending: feesPending,
  } = useStrategyFees(contracts);
  const {
    data: deposits,
    isLoading: depositsLoading,
    isPending: depositsPending,
  } = useUserDeposits(contracts, tokenSymbols);

  const { data: yields, isLoading: yieldsLoading } = useUserYields(deposits);

  const { data: volume, isLoading: volumeLoading } = useVolume(fees);

  return strkFarmPools.map((pool) => {
    const contract = pool.contract[0].address;
    return {
      ...pool,
      depositDetails: {
        amount: deposits?.[contract] || 0,
        isLoading: depositsLoading || depositsPending,
      },
      fees: {
        amount: fees?.[contract] || 0,
        isLoading: feesLoading || feesPending,
      },
      yields: {
        amount: yields[contract] || 0,
        isLoading: yieldsLoading || depositsLoading || depositsPending,
      },
      volume: {
        amount: volume?.[contract] || 0,
        isLoading: volumeLoading[contract] ?? true,
      },
    };
  });
};
