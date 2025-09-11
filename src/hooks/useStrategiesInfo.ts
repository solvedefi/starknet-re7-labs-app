import { tokenPricesAtom } from '@/store/balance.atoms';
import { STRKFarmStrategyAPIResult } from '@/store/strkfarm.atoms';
import { getUserTxHistory } from '@/store/transactions.atom';
import { getTokenInfoFromName } from '@/utils';
import { useAccount } from '@starknet-react/core';
import { Web3Number } from '@strkfarm/sdk';
import { useAtomValue } from 'jotai';
import { AtomWithQueryResult } from 'jotai-tanstack-query';
import { useEffect, useMemo, useState } from 'react';

export type StrategyDetails = STRKFarmStrategyAPIResult & {
  depositDetails: {
    amount: number;
    isLoading: boolean;
  };
};

const calculateDeposit = async (
  contract: string,
  tokenSymbols: string[],
  accountAddress: string,
  tokenPrices: Record<string, number>,
) => {
  const token0 = getTokenInfoFromName(tokenSymbols[0]);
  const token1 = getTokenInfoFromName(tokenSymbols[1]);

  const res = await getUserTxHistory(contract, accountAddress || '0x0');
  const tokenAmounts = res.reverse().reduce(
    (acc, deposit) => {
      const delta0 = Web3Number.fromWei(deposit.amount0, token0.decimals);
      const delta1 = Web3Number.fromWei(deposit.amount1, token1.decimals);
      const actionCoefficient = deposit.type === 'deposit' ? 1 : -1;
      const update = [
        Math.max(0, acc[0] + delta0.toNumber() * actionCoefficient),
        Math.max(0, acc[1] + delta1.toNumber() * actionCoefficient),
      ];

      return update;
    },
    [0, 0],
  );

  return (
    tokenAmounts[0] * tokenPrices[token0.name] +
    tokenAmounts[1] * tokenPrices[token1.name]
  );
};

const useUserDeposits = (
  contracts: string[],
  stratsDepositSymbols: string[][],
) => {
  const { address: accountAddress } = useAccount();
  const [deposits, setDeposits] = useState<
    Record<string, { amount: number; isLoading: boolean }>
  >({});

  const memoedTokenPrice = useMemo(() => {
    const tokens = new Set(
      stratsDepositSymbols
        .map((symbols) => symbols.map((symbol) => getTokenInfoFromName(symbol)))
        .flat(),
    );

    return tokenPricesAtom(Array.from(tokens));
  }, [JSON.stringify(stratsDepositSymbols.flat().sort())]);

  const tokenPrices: AtomWithQueryResult<
    Record<string, number>,
    Error
  > = useAtomValue(memoedTokenPrice);

  useEffect(() => {
    contracts.forEach(async (contract, index) => {
      if (!accountAddress) {
        setDeposits({});
        return;
      }
      setDeposits((prev) => ({
        ...prev,
        [index]: { amount: 0, isLoading: true },
      }));

      console.log('tokenPrices DATA', tokenPrices.data);
      if (!tokenPrices.data) return;
      const dep = await calculateDeposit(
        contract,
        stratsDepositSymbols[index],
        accountAddress,
        tokenPrices.data,
      );
      setDeposits((prev) => ({
        ...prev,
        [index]: { amount: dep, isLoading: false },
      }));
    });
  }, [accountAddress, tokenPrices.data, tokenPrices.isLoading]);

  return deposits;
};

export const useStrategiesInfo = (
  strkFarmPools: STRKFarmStrategyAPIResult[],
) => {
  const contracts = strkFarmPools.map((pool) => pool.contract[0].address);
  const tokenSymbols = strkFarmPools.map((pool) =>
    pool.depositToken.map((token) => token.symbol),
  );

  const deposits = useUserDeposits(contracts, tokenSymbols);

  return strkFarmPools.map((pool, index) => {
    return {
      ...pool,
      depositDetails: {
        amount: deposits[index]?.amount || 0,
        isLoading: deposits[index]?.isLoading || false,
      },
    };
  });
};
