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
  Button,
} from '@chakra-ui/react';
import CONSTANTS, { provider, TOKENS } from '@/constants';
import React, { useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { useSendTransaction } from '@starknet-react/core';
import strategyAbi from '@/abi/autoStrk.abi.json';
import { addressAtom } from '@/store/claims.atoms';
import { Contract, num, uint256 } from 'starknet';
import MyNumber from '@/utils/MyNumber';
import toast from 'react-hot-toast';
import { getDisplayCurrencyAmount, standariseAddress } from '@/utils';

type StratInfo = {
  address: string;
  token: string;
  decimals: number;
};

type STRATEGY_KEY = 'strk_auto' | 'eth_auto';
export const STRATEGY_ADDRESSES = {
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

const AUTO_COMPOUNDING = {
  strk_auto: {
    address: CONSTANTS.CONTRACTS.AutoStrkFarm,
    token: 'STRK',
    decimals: 18,
  },
  eth_auto: {
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

  const ALL_STRATS: Record<STRATEGY_KEY, StratInfo> = {
    ...AUTO_COMPOUNDING,
    ...STRATEGY_ADDRESSES,
  };

  const [balances, setBalances] = React.useState(
    Object.entries(ALL_STRATS).reduce(
      (acc, [key, value]) => {
        return { ...acc, [key]: { balance: '0', token: value.token } };
      },
      {} as Record<STRATEGY_KEY, { balance: '0'; token: '' }>,
    ),
  );
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      try {
        if (!address) return;
        setIsLoading(true);

        const contractCalls = Object.entries(ALL_STRATS).map(
          async ([key, strategyInfo]) => {
            const contract = new Contract(
              strategyAbi,
              strategyInfo.address,
              provider,
            );
            const res: any = await contract.call('zklend_position', [
              address,
              uint256.bnToUint256(BATCH_ID),
            ]);
            const token = num.getHexString(res[0].toString());
            const tokenInfo = TOKENS.find(
              (t) => standariseAddress(t.token) === standariseAddress(token),
            );
            const tokenName = tokenInfo?.name;
            const amt = res[1];
            console.log(`revoery`, strategyInfo.address, tokenInfo, res);
            return {
              key,
              token: tokenName,
              balance: new MyNumber(
                amt.toString(),
                tokenInfo?.decimals || 0,
              ).toEtherToFixedDecimals(4),
            };
          },
        );

        const results = await Promise.all(contractCalls);
        const updatedBalances = results.reduce(
          (acc, { key, balance, token }) => ({
            ...acc,
            [key]: {
              balance,
              token,
            },
          }),
          { ...balances },
        );
        console.log('revoery2', updatedBalances);
        setBalances(updatedBalances);
      } catch (error) {
        setIsLoading(false);
        console.error('revoery Error fetchingg balances:', error);
      } finally {
        setIsLoading(false);
      }
    })();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, provider]);

  const sumAmounts = useMemo(() => {
    const obj = Object.entries(balances).reduce(
      (acc, [key, value]) => {
        const tokenName: 'ETH' | 'USDC' | 'STRK' = value.token as any;
        if (!['ETH', 'USDC', 'STRK'].includes(tokenName)) {
          console.error('Invalid token name:', tokenName);
          throw new Error('Invalid token name');
        }
        acc[tokenName] += Number(value.balance);
        return acc;
      },
      { ETH: 0, USDC: 0, STRK: 0 },
    );
    return obj;
  }, [balances]);

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
        const strategy_key = Object.keys(ALL_STRATS).find((_key: any) => {
          const key: STRATEGY_KEY = _key;
          return ALL_STRATS[key].address === contract.address;
        }) as STRATEGY_KEY | undefined;
        if (!strategy_key) {
          return null;
        }
        const amount = balances[strategy_key].balance;
        if (amount && Number(amount) > 0)
          return contract.populate('withdraw_zklend', [
            uint256.bnToUint256(BATCH_ID),
            address,
          ]);
        return null;
      })
      .filter((call) => call !== null);
    return calls;
  }, [address, balances, provider]);

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
            alignItems={'center'}
            flexDir={'column'}
            gap={'2'}
            w={'140px'}
            width={{ base: '100%', md: '30%' }}
            marginTop={{ base: '10px', md: '0' }}
          >
            <Button
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
              disabled={true}
              _disabled={{ backgroundColor: 'gray', cursor: 'not-allowed' }}
            >
              Claim
            </Button>
            <Text color="gray" textAlign={'center'}>
              Claims open after 28th Mar
            </Text>
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
