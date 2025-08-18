import { useEffect, useState } from 'react';
import { useAtomValue } from 'jotai';
import { strategiesAtom } from '@/store/strategies.atoms';
import { AmountsInfo } from '@/strategies/IStrategy';
import { Box, Text, HStack, Spinner, Alert, AlertIcon } from '@chakra-ui/react';
import { useAccount } from '@starknet-react/core';

type AccountDepositProps = {
  strategyAddress: string;
};

const AccountDeposit = ({ strategyAddress }: AccountDepositProps) => {
  const strategies = useAtomValue(strategiesAtom);
  const [userTVL, setUserTVL] = useState<AmountsInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { address } = useAccount();

  const strategy = strategies.find((s) => s.id === strategyAddress);

  useEffect(() => {
    const getUserDeposits = async () => {
      if (!strategy || !address) {
        setUserTVL(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const tvlInfo = await strategy.getUserTVL(address);
        setUserTVL(tvlInfo);
      } catch (err) {
        console.error('Error fetching user TVL:', err);
        setError('Failed to fetch deposit information');
        setUserTVL(null);
      } finally {
        setLoading(false);
      }
    };

    getUserDeposits();
  }, [strategy, address]);

  let content = null;

  if (!strategy || error) {
    return (
      <Alert status="error">
        <AlertIcon />
        {error || `Strategy not found: ${strategyAddress}`}
      </Alert>
    );
  }

  if (loading) {
    return (
      <HStack p={4}>
        <Spinner size="sm" />
        <Text>Loading deposit information...</Text>
      </HStack>
    );
  }

  if (!address || !userTVL || userTVL.usdValue === 0) {
    return (
      <Box p={4}>
        <Text color="white" textAlign="center">
          -
        </Text>
      </Box>
    );
  }

  content = content || `$${userTVL.usdValue.toFixed(2)}`;

  return (
    <Text
      fontFamily="IBM Plex Mono"
      textAlign="right"
      color="white"
      fontSize="16px"
    >
      {content}
    </Text>
  );
};

export default AccountDeposit;
