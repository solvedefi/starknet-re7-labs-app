'use client';

import {
  Alert,
  AlertIcon,
  Avatar,
  AvatarGroup,
  Box,
  Container,
  Heading,
  HStack,
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
import React from 'react';

import strategyAbi from '@/abi/strategy.abi.json';
import {
  getLinkProps,
  getStrategyWiseHoldingsInfo,
} from '@/components/YieldCard';
import CONSTANTS from '@/constants';
import { addressAtom } from '@/store/claims.atoms';
import { getPoolInfoFromStrategy } from '@/store/protocols';
import { STRKFarmBaseAPYsAtom } from '@/store/strkfarm.atoms';
import { userStatsAtom } from '@/store/utils.atoms';
import { isLive } from '@/strategies/IStrategy';
import MyNumber from '@/utils/MyNumber';
import { Contract } from 'starknet';

const STRATEGY_ADDRESSES = {
  strk_sensei: CONSTANTS.CONTRACTS.DeltaNeutralMMSTRKETH,
  eth_sensei: CONSTANTS.CONTRACTS.DeltaNeutralMMETHUSDC,
  usdc_sensei: CONSTANTS.CONTRACTS.DeltaNeutralMMUSDCETH,
  eth_sensei_xl: CONSTANTS.CONTRACTS.DeltaNeutralMMETHUSDCXL,
};

export default function Recovery() {
  const strkFarmPoolsRes = useAtomValue(STRKFarmBaseAPYsAtom);
  const { data: userData } = useAtomValue(userStatsAtom);
  const address = useAtomValue(addressAtom);

  const [balances, setBalances] = React.useState({
    strk_sensei: '0',
    eth_sensei: '0',
    usdc_sensei: '0',
    eth_sensei_xl: '0',
  });
  const [isLoading, setIsLoading] = React.useState(false);

  const { provider } = useProvider();

  const strkFarmPools = React.useMemo(() => {
    if (!strkFarmPoolsRes?.data?.strategies || !address) return [];

    return strkFarmPoolsRes.data.strategies
      .map((pool) => ({
        ...pool,
        isRetired: ['xstrk_sensei', 'endur_strk'].includes(pool.id),
      }))
      .sort((a, b) =>
        a.id === 'xstrk_sensei'
          ? -1
          : b.id === 'xstrk_sensei'
            ? 1
            : b.apy - a.apy,
      );
  }, [address, strkFarmPoolsRes]);

  React.useEffect(() => {
    if (!strkFarmPoolsRes?.data?.strategies || !address) return;

    (async () => {
      try {
        setIsLoading(true);

        const contractCalls = Object.entries(STRATEGY_ADDRESSES).map(
          async ([key, address]) => {
            const contract = new Contract(strategyAbi, address, provider);
            const res = await contract.call('nostra_position', [address]);
            return {
              key,
              balance: new MyNumber(res.toString(), 18).toEtherToFixedDecimals(
                2,
              ),
            };
          },
        );

        const results = await Promise.all(contractCalls);
        const updatedBalances = results.reduce(
          (acc, { key, balance }) => ({ ...acc, [key]: balance }),
          { ...balances },
        );

        setBalances(updatedBalances);
      } catch (error) {
        setIsLoading(false);
        console.error('Error fetching balances:', error);
      } finally {
        setIsLoading(false);
      }
    })();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, provider, strkFarmPoolsRes]);

  const poolAmounts: Record<string, string> = {
    strk_sensei: balances.strk_sensei,
    eth_sensei: balances.eth_sensei,
    usdc_sensei: balances.usdc_sensei,
    eth_sensei_xl: balances.eth_sensei_xl,
  };

  return (
    <Container maxWidth={'1000px'} margin={'0 auto'}>
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Box padding={'15px 0px'} borderRadius="10px" margin={'20px 0px 10px'}>
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
            due to zkLend exploit. You can check and claim this amount here
          </Text>
        </Box>

        <Box
          display={'flex'}
          alignItems={'center'}
          flexDir={'column'}
          gap={'2'}
          w={'140px'}
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
        <Table variant="simple">
          <Thead display={{ base: 'none', md: 'table-header-group' }}>
            <Tr fontSize={'18px'} color={'white'} bg="#000">
              <Th>Strategy name</Th>
              <Th textAlign={'right'}>Amount</Th>
            </Tr>
          </Thead>
          <Tbody>
            {strkFarmPools.length > 0 && (
              <>
                {strkFarmPools
                  .sort((a, b) => {
                    if (a.id === 'xstrk_sensei') return -1;
                    if (b.id === 'xstrk_sensei') return 1;
                    return 0;
                  })
                  .map((pool, index) => {
                    const strat = getPoolInfoFromStrategy(pool);

                    const holdingsInfo = getStrategyWiseHoldingsInfo(
                      userData,
                      strat.pool.id,
                    );

                    const isPoolLive =
                      strat.additional &&
                      strat.additional.tags[0] &&
                      isLive(strat.additional.tags[0]);

                    return (
                      <React.Fragment key={index}>
                        <Tr
                          color={'white'}
                          bg={index % 2 === 0 ? 'color1_50p' : 'color2_50p'}
                          display={{ base: 'none', md: 'table-row' }}
                          as={'a'}
                          {...getLinkProps(strat, true)}
                        >
                          <Td>
                            <Box>
                              <HStack spacing={2}>
                                <AvatarGroup
                                  size="xs"
                                  max={2}
                                  marginRight={'10px'}
                                >
                                  {strat.pool.logos.map((logo) => (
                                    <Avatar key={logo} src={logo} />
                                  ))}
                                </AvatarGroup>
                                <Box>
                                  <HStack
                                    spacing={2}
                                    display={'flex'}
                                    alignItems={'center'}
                                    gap={'2.5'}
                                  >
                                    <Heading size="sm" marginTop={'2px'}>
                                      {strat.pool.name}
                                    </Heading>
                                  </HStack>
                                </Box>
                              </HStack>
                            </Box>
                          </Td>
                          <Td>
                            <Box
                              width={'100%'}
                              textAlign={'right'}
                              fontWeight={600}
                              display={'flex'}
                              flexDirection={'column'}
                              justifyContent={'center'}
                              alignItems={'flex-end'}
                            >
                              {isLoading && <Skeleton height="20px" />}

                              {address &&
                                isPoolLive &&
                                strat.protocol.name === 'STRKFarm' &&
                                !isLoading && (
                                  <Box fontSize={'16px'}>
                                    {poolAmounts[pool.id] ?? <Text>-</Text>}
                                  </Box>
                                )}

                              {(!isPoolLive || !address) && <Text>-</Text>}
                            </Box>
                          </Td>
                        </Tr>
                      </React.Fragment>
                    );
                  })}
              </>
            )}
          </Tbody>
        </Table>
        {strkFarmPools.length === 0 && (
          <Stack>
            <Skeleton height="70px" />
            <Skeleton height="70px" />
            <Skeleton height="70px" />
            <Skeleton height="70px" />
          </Stack>
        )}
      </Container>
    </Container>
  );
}
