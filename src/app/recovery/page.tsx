'use client';

import {
  getLinkProps,
  getStrategyWiseHoldingsInfo,
} from '@/components/YieldCard';
import { addressAtom } from '@/store/claims.atoms';
import { getPoolInfoFromStrategy } from '@/store/protocols';
import {
  STRKFarmBaseAPYsAtom,
  STRKFarmStrategyAPIResult,
} from '@/store/strkfarm.atoms';
import { userStatsAtom } from '@/store/utils.atoms';
import { isLive } from '@/strategies/IStrategy';
import { getDisplayCurrencyAmount } from '@/utils';
import {
  Alert,
  AlertIcon,
  Avatar,
  AvatarGroup,
  Box,
  Container,
  Flex,
  Heading,
  HStack,
  Image,
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
import { useAtomValue } from 'jotai';
import React from 'react';

export default function Recovery() {
  const strkFarmPoolsRes = useAtomValue(STRKFarmBaseAPYsAtom);
  const { data: userData } = useAtomValue(userStatsAtom);
  const address = useAtomValue(addressAtom);

  const strkFarmPools = React.useMemo(() => {
    if (!strkFarmPoolsRes || !strkFarmPoolsRes.data)
      return [] as STRKFarmStrategyAPIResult[];
    return strkFarmPoolsRes.data.strategies
      .sort((a, b) => b.apy - a.apy)
      .map((pool) => {
        if (pool.id === 'xstrk_sensei' || pool.id === 'endur_strk') {
          pool.isRetired = true;
        } else {
          pool.isRetired = false;
        }
        return pool;
      });
  }, [strkFarmPoolsRes]);

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
                              {address &&
                                isPoolLive &&
                                strat.protocol.name === 'STRKFarm' && (
                                  <Text fontSize={'16px'}>
                                    {holdingsInfo.amount !== 0 ? (
                                      <Flex
                                        justifyContent={'flex-end'}
                                        marginTop={'-5px'}
                                        width={'100%'}
                                        opacity={0.9}
                                        gap={'2'}
                                      >
                                        <Text
                                          textAlign={'right'}
                                          fontSize={'16px'}
                                        >
                                          {getDisplayCurrencyAmount(
                                            holdingsInfo.amount,
                                            holdingsInfo.tokenInfo
                                              .displayDecimals,
                                          ).toLocaleString()}
                                        </Text>
                                        <Box
                                          display="flex"
                                          alignItems="center"
                                          gap="1"
                                          fontSize={'14px'}
                                          opacity={0.6}
                                        >
                                          {holdingsInfo.tokenInfo.name}
                                          <Image
                                            width={'16px'}
                                            src={holdingsInfo.tokenInfo.logo}
                                            ml={'4px'}
                                            mr={'1px'}
                                            filter={'grayscale(1)'}
                                            alt="token-amount"
                                          />
                                        </Box>
                                      </Flex>
                                    ) : (
                                      <Text>-</Text>
                                    )}
                                  </Text>
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
      {/* {strkFarmPools.length === 0 && (
        <Stack>
          <Skeleton height="70px" />
          <Skeleton height="70px" />
          <Skeleton height="70px" />
          <Skeleton height="70px" />
        </Stack>
      )} */}
    </Container>
  );
}
