'use client';
import {
  Box,
  Text,
  Alert,
  Stack,
  Skeleton,
  Container,
  Table,
  Thead,
  Tr,
  Th,
  Tbody,
  Td,
} from '@chakra-ui/react';
import CONSTANTS from '@/constants';
import React, { useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { useProvider, useSendTransaction } from '@starknet-react/core';
import strategyAbi from '@/abi/autoStrk.abi.json';
import { addressAtom } from '@/store/claims.atoms';
import { STRATEGY_ADDRESSES } from '../page';
import { Contract, uint256 } from 'starknet';
import MyNumber from '@/utils/MyNumber';
import toast from 'react-hot-toast';
import { getDisplayCurrencyAmount } from '@/utils';

const AUTO_COMPOUNDING: {
  [key: string]: {
    address: string;
    token: string;
    decimals: number;
  };
} = {
  strk_sensei: {
    address: CONSTANTS.CONTRACTS.AutoStrkFarm,
    token: 'STRK',
    decimals: 18,
  },
  eth_sensei: {
    address: CONSTANTS.CONTRACTS.AutoUsdcFarm,
    token: 'USDC',
    decimals: 6,
  },
};

const BATCH_ID = 1;

export default function ZklendRecoveryComp() {
  const _address = useAtomValue(addressAtom);
  const address = useMemo(() => {
    return _address || '';
  }, [_address]);

  const [balances, setBalances] = React.useState({
    strk_sensei: '0',
    eth_sensei: '0',
    usdc_sensei: '0',
    eth_sensei_xl: '0',
  });
  const [isLoading, setIsLoading] = React.useState(false);

  const { provider } = useProvider();

  const ALL_STRATS = { ...STRATEGY_ADDRESSES, ...AUTO_COMPOUNDING };
  React.useEffect(() => {
    (async () => {
      try {
        setIsLoading(true);

        const contractCalls = Object.entries(ALL_STRATS).map(
          async ([key, strategyInfo]) => {
            const contract = new Contract(
              strategyAbi,
              strategyInfo.address,
              provider,
            );
            const res = await contract.call('zklend_position', [
              address,
              uint256.bnToUint256(BATCH_ID),
            ]);
            console.log(`revoery`, strategyInfo.address, address, res);
            return {
              key,
              token: strategyInfo.token,
              balance: new MyNumber(
                res.toString(),
                strategyInfo.decimals,
              ).toEtherToFixedDecimals(4),
            };
          },
        );

        const results = await Promise.all(contractCalls);
        const updatedBalances = results.reduce(
          (acc, { key, balance }) => ({ ...acc, [key]: balance }),
          { ...balances },
        );
        console.log('revoery2', updatedBalances);
        setBalances(updatedBalances);
      } catch (error) {
        setIsLoading(false);
        console.error('revoery Error fetching balances:', error);
      } finally {
        setIsLoading(false);
      }
    })();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, provider]);

  const poolAmounts: Record<string, string> = useMemo(
    () => ({
      strk_sensei: balances.strk_sensei,
      eth_sensei: balances.eth_sensei,
      usdc_sensei: balances.usdc_sensei,
      eth_sensei_xl: balances.eth_sensei_xl,
    }),
    [balances],
  );

  const sumAmounts = useMemo(() => {
    return {
      USDC: poolAmounts.usdc_sensei,
      ETH: Number(poolAmounts.eth_sensei) + Number(poolAmounts.eth_sensei_xl),
      STRK: Number(poolAmounts.strk_sensei),
    };
  }, [poolAmounts]);

  const calls = useMemo(() => {
    const contracts = Object.entries(ALL_STRATS).map(([key, strategyInfo]) => {
      const contract = new Contract(
        strategyAbi,
        strategyInfo.address,
        provider,
      );
      return contract;
    });
    const calls = contracts
      .map((contract) => {
        const strategy_key = Object.keys(ALL_STRATS).find((key) => {
          return ALL_STRATS[key].address === contract.address;
        });
        if (!strategy_key) {
          return null;
        }
        const amount = poolAmounts[strategy_key];
        if (amount && Number(amount) > 0)
          return contract.populate('withdraw_nostra', [address]);
        return null;
      })
      .filter((call) => call !== null);
    return calls;
  }, [address, poolAmounts, provider]);

  const {
    sendAsync: writeAsync,
    data,
    status,
    isSuccess,
    isPending,
    error,
    isError,
  } = useSendTransaction({
    calls,
  });

  function handleClaims() {
    if (!address) {
      toast('Please connect your wallet to claim your funds.', {
        position: 'bottom-right',
      });
      return;
    }

    const contracts = Object.entries(ALL_STRATS).map(([key, strategyInfo]) => {
      const contract = new Contract(
        strategyAbi,
        strategyInfo.address,
        provider,
      );
      return contract;
    });

    const calls = contracts
      .map((contract) => {
        const strategy_key = Object.keys(ALL_STRATS).find((key) => {
          return ALL_STRATS[key].address === contract.address;
        });
        if (!strategy_key) {
          return null;
        }
        const amount = poolAmounts[strategy_key];
        if (amount && Number(amount) > 0)
          return contract.populate('withdraw_nostra', [address]);
        return null;
      })
      .filter((call) => call !== null);

    if (calls.length === 0) {
      toast('No funds to claim.', {
        position: 'bottom-right',
      });
      return;
    }

    writeAsync();
  }

  return (
    <Box width={'100%'} float={'left'}>
      <Box my="3" width={'100%'} float={'left'}>
        <Box
          display={{ base: 'block', md: 'flex' }}
          justifyContent={'space-between'}
          marginBottom={{ base: '20px', md: '0' }}
        >
          <Text as="h3" color="white">
            Recovery from zkLend:
          </Text>
          <Box
            display={'flex'}
            alignItems={'center'}
            flexDir={'column'}
            gap={'2'}
            w={'140px'}
            width={{ base: '100%', md: '30%' }}
            marginTop={{ base: '10px', md: '0' }}
          >
            <Box
              aria-disabled={true}
              bg={'white'}
              borderRadius="6px"
              padding={'6px 20px'}
              cursor={'pointer'}
              fontWeight={600}
              width={'100%'}
              textAlign={'center'}
              onClick={() => {
                handleClaims();
              }}
            >
              Claim
            </Box>
          </Box>
        </Box>
        <Alert
          status={'info'}
          fontSize={'14px'}
          color={'#a7a0c1'}
          borderRadius={'10px'}
          fontWeight={'medium'}
          border={'1px solid #633dbf'}
          bg="color2_50p"
          paddingY={'10px'}
          marginTop={'10px'}
          px={'16px'}
        >
          <span>
            1. Check your eligible claims by connecting your wallet. Please note
            that approximately 1-5% of your original funds are expected to be
            available. Please let us know of any descrepresies before 28th March
            on our{' '}
            <a
              href={CONSTANTS.COMMUNITY_TG}
              style={{ textDecoration: 'underline' }}
            >
              Telegram
            </a>
            .
            <br />
            2. Any newly recovered funds from{' '}
            <a
              href="https://x.com/zkLend/status/1892459438881329660"
              style={{ textDecoration: 'underline' }}
            >
              zkLend{"'"}s recovery
            </a>{' '}
            will be distributed to the affected users in a similar way in
            future. The details of the same will be announced on our{' '}
            <a
              href="https://x.com/strkfarm"
              style={{ textDecoration: 'underline' }}
            >
              X page
            </a>
            .
          </span>
        </Alert>
      </Box>

      <Container
        width="100%"
        float={'left'}
        padding={'0px'}
        marginTop={'16px'}
        marginBottom={'100px'}
      >
        {(!isLoading || !address) && (
          <Table variant="simple">
            <Thead display={{ base: 'none', md: 'table-header-group' }}>
              <Tr fontSize={'18px'} color={'white'} bg="#000">
                <Th textAlign={'left'}>Amount</Th>
              </Tr>
            </Thead>
            <Tbody>
              <Tr color={'white'} bg={'color1_50p'}>
                <Td>
                  <Box
                    width={'100%'}
                    textAlign={'left'}
                    fontWeight={600}
                    display={'flex'}
                    flexDirection={'column'}
                    justifyContent={'center'}
                  >
                    {isLoading && <Skeleton height="20px" />}

                    {address && !isLoading && (
                      <Box fontSize={'16px'}>
                        <Text>
                          {getDisplayCurrencyAmount(sumAmounts.ETH, 4)} ETH
                        </Text>
                      </Box>
                    )}

                    {!address && <Text>-</Text>}
                  </Box>
                </Td>
              </Tr>
              <Tr color={'white'} bg={'color2_50p'}>
                <Td>
                  <Box
                    width={'100%'}
                    textAlign={'left'}
                    fontWeight={600}
                    display={'flex'}
                    flexDirection={'column'}
                    justifyContent={'center'}
                  >
                    {isLoading && <Skeleton height="20px" />}

                    {address && !isLoading && (
                      <Box fontSize={'16px'}>
                        <Text>
                          {getDisplayCurrencyAmount(sumAmounts.USDC, 2)} USDC
                        </Text>
                      </Box>
                    )}

                    {!address && <Text>-</Text>}
                  </Box>
                </Td>
              </Tr>
              <Tr color={'white'} bg={'color1_50p'}>
                <Td>
                  <Box
                    width={'100%'}
                    textAlign={'left'}
                    fontWeight={600}
                    display={'flex'}
                    flexDirection={'column'}
                    justifyContent={'center'}
                  >
                    {isLoading && <Skeleton height="20px" />}

                    {address && !isLoading && (
                      <Box fontSize={'16px'}>
                        <Text>
                          {getDisplayCurrencyAmount(sumAmounts.STRK, 2)} STRK
                        </Text>
                      </Box>
                    )}

                    {!address && <Text>-</Text>}
                  </Box>
                </Td>
              </Tr>
            </Tbody>
          </Table>
        )}
        {isLoading && address && (
          <Stack>
            <Skeleton height="70px" />
            <Skeleton height="70px" />
            <Skeleton height="70px" />
          </Stack>
        )}
      </Container>
    </Box>
  );
}
