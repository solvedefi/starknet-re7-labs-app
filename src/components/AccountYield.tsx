import { strategiesAtom } from '@/store/strategies.atoms';
import { TxHistoryAtom } from '@/store/transactions.atom';
import { Text } from '@chakra-ui/react';
import { useAccount } from '@starknet-react/core';
import { useAtomValue } from 'jotai';
import { useMemo, useState } from 'react';

type AccountYieldProps = {
  strategyAddress: string;
};

export const AccountYield = ({ strategyAddress }: AccountYieldProps) => {
  const strategies = useAtomValue(strategiesAtom);
  const [userYield, setUserYield] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { address } = useAccount();

  const strategy = strategies.find((s) => s.id === strategyAddress);
  const strategyContractAddress = strategy?.holdingTokens[0].address;
  const txHistoryAtom = useMemo(
    () => TxHistoryAtom(strategyContractAddress!, address!),
    [address, strategyContractAddress],
  );

  const txHistoryResult = useAtomValue(txHistoryAtom);
  console.log('txHistoryResult1', txHistoryResult.data);
  console.log('txHistoryResult2', strategyContractAddress, address);
  const totalDeposits = useMemo(() => {
    if (!txHistoryResult.data) return 0;
    return txHistoryResult.data.findManyInvestment_flows.reduce((acc, tx) => {
      return acc + Number(tx.amount);
    }, 0);
  }, [txHistoryResult.data]);

  const totalWithdrawals = useMemo(() => {
    if (!txHistoryResult.data) return 0;
    return txHistoryResult.data.findManyInvestment_flows.reduce((acc, tx) => {
      return acc + Number(tx.amount);
    }, 0);
  }, [txHistoryResult.data]);

  console.log('totalDeposits', totalDeposits);
  console.log('totalWithdrawals', totalWithdrawals);

  return (
    <Text
      fontFamily="IBM Plex Mono"
      textAlign="right"
      color="white"
      fontSize="16px"
    >
      {totalDeposits - totalWithdrawals}
    </Text>
  );
};
