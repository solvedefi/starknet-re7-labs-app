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
  Avatar,
  AvatarGroup,
  Box,
  Button,
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
    return strkFarmPoolsRes.data.strategies.sort((a, b) => b.apy - a.apy);
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
            Lorem ipsum dolor sit amet consectetur adipisicing elit. Nostrum
            beatae aspernatur cum?
          </Text>
        </Box>
        <Button>Claim</Button>
      </Box>
      <Container width="100%" float={'left'} padding={'0px'} marginTop={'12px'}>
        <Table variant="simple">
          <Thead display={{ base: 'none', md: 'table-header-group' }}>
            <Tr fontSize={'18px'} color={'white'} bg="bg">
              <Th>Strategy name</Th>
              <Th textAlign={'right'}>Amount</Th>
            </Tr>
          </Thead>
          <Tbody>
            {strkFarmPools.length > 0 && (
              <>
                {strkFarmPools.map((pool, index) => {
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
                                <HStack spacing={2}>
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
      Yield
    </Container>
  );
}
