'use client';

import {
  Alert,
  AlertIcon,
  Box,
  Container,
  Skeleton,
  Stack,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
} from '@chakra-ui/react';
import { useProvider } from '@starknet-react/core';
import { useAtomValue } from 'jotai';
import React, { useMemo } from 'react';

import strategyAbi from '@/abi/strategy.abi.json';
import CONSTANTS from '@/constants';
import { addressAtom } from '@/store/claims.atoms';
import MyNumber from '@/utils/MyNumber';
import { Contract } from 'starknet';
import { getDisplayCurrencyAmount } from '@/utils';

const STRATEGY_ADDRESSES: {
  [key: string]: {
    address: string;
    token: string;
    decimals: number;
  };
} = {
  strk_sensei: {
    address: CONSTANTS.CONTRACTS.DeltaNeutralMMSTRKETH,
    token: 'STRK',
    decimals: 18,
  },
  eth_sensei: {
    address: CONSTANTS.CONTRACTS.DeltaNeutralMMETHUSDC,
    token: 'ETH',
    decimals: 18,
  },
  usdc_sensei: {
    address: CONSTANTS.CONTRACTS.DeltaNeutralMMUSDCETH,
    token: 'USDC',
    decimals: 6,
  },
  eth_sensei_xl: {
    address: CONSTANTS.CONTRACTS.DeltaNeutralMMETHUSDCXL,
    token: 'ETH',
    decimals: 18,
  },
};

export default function Recovery() {
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

  React.useEffect(() => {
    (async () => {
      try {
        setIsLoading(true);

        const contractCalls = Object.entries(STRATEGY_ADDRESSES).map(
          async ([key, strategyInfo]) => {
            const contract = new Contract(
              strategyAbi,
              strategyInfo.address,
              provider,
            );
            const res = await contract.call('nostra_position', [address]);
            console.log(`revoery`, strategyInfo.address, address, res);
            return {
              key,
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
  return (
    <Container maxWidth={'1000px'} margin={'0 auto'}>
      <Box
        display={{ base: 'block', md: 'flex' }}
        alignItems="center"
        justifyContent="space-between"
      >
        <Box
          padding={'15px 0px'}
          borderRadius="10px"
          margin={'20px 0px 10px'}
          width={{ base: '100%', md: '70%' }}
        >
          <Text
            fontSize={{ base: '28px', md: '35px' }}
            lineHeight={'30px'}
            marginBottom={'10px'}
            textAlign={'start'}
          >
            <b className="theme-gradient-text">Claim your amount</b>
          </Text>
          <Text
            color="color2"
            textAlign={'start'}
            fontSize={{ base: '12px', md: '14px' }}
            marginBottom={'0px'}
            maxW={'70%'}
          >
            We were able to partially recover the funds from affected strategies
            after the zkLend exploit. You can check and claim this amount here.
          </Text>
        </Box>

        <Box
          display={'flex'}
          alignItems={'center'}
          flexDir={'column'}
          gap={'2'}
          w={'140px'}
          width={{ base: '100%', md: '30%' }}
        >
          <Box
            _disabled={{ opacity: 0.4 }}
            aria-disabled={true}
            bg={'white'}
            borderRadius="6px"
            padding={'6px 20px'}
            cursor={'pointer'}
            fontWeight={600}
          >
            Claim
          </Box>
          <Text color="color2" fontSize={'12px'} textAlign={'center'}>
            Claims opening soon
          </Text>
        </Box>
      </Box>

      <Box my="3">
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
          <AlertIcon />
          Check your eligible claims by connecting your wallet. Please note that
          approximately 40-50% of your original funds are expected to be
          available. If you don&apos;t see the expected amount, kindly reach out
          to us on Telegram before February 20th (End of Day) for assistance.
        </Alert>
      </Box>

      <Container width="100%" float={'left'} padding={'0px'} marginTop={'16px'}>
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
    </Container>
  );
}
