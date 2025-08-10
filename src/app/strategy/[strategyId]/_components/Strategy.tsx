'use client';

import {
  Alert,
  AlertIcon,
  Avatar,
  AvatarGroup,
  Box,
  Card,
  Center,
  Flex,
  Grid,
  GridItem,
  HStack,
  Spinner,
  Text,
  Tooltip,
  VStack,
  Wrap,
  WrapItem,
} from '@chakra-ui/react';
import { atom, useAtomValue, useSetAtom } from 'jotai';
import mixpanel from 'mixpanel-browser';
import { useCallback, useEffect, useMemo, useState } from 'react';

import HarvestTime from '@/components/HarvestTime';
import { DUMMY_BAL_ATOM, returnEmptyBal } from '@/store/balance.atoms';
import { addressAtom } from '@/store/claims.atoms';
import { strategiesAtom, StrategyInfo } from '@/store/strategies.atoms';
import { TxHistoryAtom } from '@/store/transactions.atom';
import { getTokenInfoFromAddr, getUniqueById } from '@/utils';
import MyNumber from '@/utils/MyNumber';
import { StrategyParams } from '../page';
import FlowChart from './FlowChart';
import { isMobile } from 'react-device-detect';
import {
  STRKFarmBaseAPYsAtom,
  STRKFarmStrategyAPIResult,
} from '@/store/strkfarm.atoms';
import { TokenDeposit } from './TokenDeposit';
import styles from '../../../border.module.css';

const Strategy = ({ params }: StrategyParams) => {
  const address = useAtomValue(addressAtom);
  const strategies = useAtomValue(strategiesAtom);
  const [isMounted, setIsMounted] = useState(false);

  const strategy: StrategyInfo<any> | undefined = useMemo(() => {
    const id = params.strategyId;
    return strategies.find((s) => s.id === id);
  }, [params.strategyId, strategies.map((id) => id).toString()]);

  const strategyAddress = useMemo(() => {
    const holdingTokens = strategy?.holdingTokens;
    if (holdingTokens && holdingTokens.length) {
      const holdingTokenInfo: any = holdingTokens[0];
      return (holdingTokenInfo.address || holdingTokenInfo.token) as string;
    }
    return '';
  }, [strategy]);

  const setBalQueryEnable = useSetAtom(strategy?.balEnabled || atom(false));

  useEffect(() => {
    setBalQueryEnable(true);
  }, []);

  const balData = useAtomValue(strategy?.balanceSummaryAtom || DUMMY_BAL_ATOM);
  const individualBalances = useAtomValue(
    strategy?.balancesAtom || atom([returnEmptyBal()]),
  );

  // fetch tx history
  const txHistoryAtom = useMemo(
    () => TxHistoryAtom(strategyAddress, address!),
    [address, strategyAddress],
  );

  const txHistoryResult = useAtomValue(txHistoryAtom);
  const txHistory = useMemo(() => {
    if (txHistoryResult.data) {
      return {
        findManyInvestment_flows: [
          ...txHistoryResult.data.findManyInvestment_flows,
        ].sort((a, b) => {
          return b.timestamp - a.timestamp;
        }),
      };
    }
    console.log(
      'TxHistoryAtom',
      txHistoryResult.error,
      txHistoryResult.isError,
      txHistoryResult.isLoading,
    );
    return txHistoryResult.data || { findManyInvestment_flows: [] };
  }, [JSON.stringify(txHistoryResult.data)]);

  // compute profit
  // profit doesnt change quickly in real time, but total deposit amount can change
  // and it can impact the profit calc as txHistory may not be updated at the same time as balData
  // So, we compute profit once only
  const [profit, setProfit] = useState(0);
  const computeProfit = useCallback(() => {
    if (!txHistory.findManyInvestment_flows.length) return 0;
    const tokenInfo = getTokenInfoFromAddr(
      txHistory.findManyInvestment_flows[0].asset,
    );
    if (!tokenInfo) return 0;
    const netDeposits = txHistory.findManyInvestment_flows.reduce((acc, tx) => {
      const sign = tx.type === 'deposit' ? 1 : -1;
      return (
        acc +
        sign *
          Number(
            new MyNumber(tx.amount, tokenInfo.decimals).toEtherToFixedDecimals(
              4,
            ),
          )
      );
    }, 0);
    const currentValue = Number(
      balData.data?.amount.toEtherToFixedDecimals(4) || '0',
    );
    if (currentValue === 0) return 0;

    if (netDeposits === 0) return 0;
    setProfit(currentValue - netDeposits);
  }, [txHistory, balData]);

  useEffect(() => {
    if (profit == 0) {
      computeProfit();
    }
  }, [txHistory, balData]);

  useEffect(() => {
    mixpanel.track('Strategy page open', { name: params.strategyId });
  }, [params.strategyId]);

  const colSpan1: any = { base: '5', md: '3' };
  const colSpan2: any = { base: '5', md: '2' };

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const strategiesInfo = useAtomValue(STRKFarmBaseAPYsAtom);
  const strategyCached = useMemo(() => {
    if (!strategiesInfo || !strategiesInfo.data) return null;
    const strategiesList: STRKFarmStrategyAPIResult[] =
      strategiesInfo.data.strategies;
    return strategiesList.find((s: any) => s.id === params.strategyId);
  }, [strategiesInfo, params.strategyId]);

  if (!isMounted) return null;

  return (
    <>
      {strategy && (
        <VStack width={'100%'} bg={'#171717'}>
          <Grid width={'100%'} templateColumns="repeat(5, 1fr)" gap={2}>
            <GridItem display="flex" colSpan={colSpan1}>
              <Card width="100%" padding={'15px'} color="white" bg="#171717">
                <Flex>
                  <AvatarGroup size={'md'} spacing={'-20px'} mr={'5px'}>
                    {strategy &&
                      strategy.metadata.depositTokens.length > 0 &&
                      strategy.metadata.depositTokens.map((token: any) => {
                        return (
                          <Avatar
                            key={token.address}
                            marginRight={'5px'}
                            src={token.logo}
                            width={'30px'}
                            height={'30px'}
                          />
                        );
                      })}
                    {strategy &&
                      strategy.metadata.depositTokens.length == 0 && (
                        <Avatar
                          marginRight={'5px'}
                          src={strategy?.holdingTokens[0].logo}
                        />
                      )}
                  </AvatarGroup>
                  <Text
                    // marginTop={'6px'}
                    marginLeft={'10px'}
                    fontSize={{ base: '18px', md: '25px' }}
                    fontWeight={'bold'}
                    color="white"
                  >
                    {strategy ? strategy.name : 'Strategy Not found'}
                  </Text>
                </Flex>
                <Text
                  fontSize={'21px'}
                  fontWeight={'400'}
                  marginLeft={'55px'}
                  marginBottom={'20px'}
                >
                  Deployed on Ekubo
                </Text>
                {!strategy?.isRetired() && (
                  <HarvestTime strategy={strategy} balData={balData} />
                )}
                <Box className={styles.border_alt} marginTop={'20px'}>
                  {!balData.isLoading &&
                    !balData.isError &&
                    !balData.isPending &&
                    balData.data &&
                    balData.data.tokenInfo && (
                      <Flex width={'100%'} justifyContent={'space-between'}>
                        <Box
                          display={'flex'}
                          alignItems={'center'}
                          justifyContent={'space-between'}
                          width={'100%'}
                        >
                          <Text>
                            <b>Your Total Position Value </b>
                          </Text>
                          <Text>
                            {address
                              ? Number(
                                  balData.data.amount.toEtherToFixedDecimals(
                                    balData.data.tokenInfo?.displayDecimals ||
                                      2,
                                  ),
                                ) === 0 || strategy?.isRetired()
                                ? '-'
                                : `${balData.data.amount.toEtherToFixedDecimals(balData.data.tokenInfo?.displayDecimals || 2)} ${balData.data.tokenInfo?.name}`
                              : 'Connect wallet'}
                          </Text>
                        </Box>
                      </Flex>
                    )}
                  {(balData.isLoading || !balData.data?.tokenInfo) && (
                    <Text>
                      <b>Your Holdings: </b>
                      {address ? (
                        <Spinner size="sm" marginTop={'5px'} />
                      ) : (
                        'Connect wallet'
                      )}
                    </Text>
                  )}
                  {balData.isError && (
                    <Text>
                      <b>Your Holdings: Error</b>
                    </Text>
                  )}

                  {/* Show individual holdings is more tokens */}
                  {individualBalances.length > 1 &&
                    balData.data?.amount.compare('0', 'gt') && (
                      <Tooltip label="Detailed info of your individual token holdings in the strategy. This can vary with time depending on market conditions. The above value is the holdings in aggregated as a single token.">
                        <HStack
                          className="flex"
                          gap={2}
                          fontSize={'12px'}
                          color="light_grey"
                          marginTop={'5px'}
                          borderTop={'1px solid var(--chakra-colors-highlight)'}
                          paddingTop={'5px'}
                        >
                          <p>Detailed Split:</p>
                          {individualBalances.map((bx, index) => {
                            return (
                              <Text key={index}>
                                {bx?.amount.toEtherToFixedDecimals(
                                  bx.tokenInfo?.displayDecimals || 2,
                                )}{' '}
                                {bx?.tokenInfo?.name}
                              </Text>
                            );
                          })}
                        </HStack>
                      </Tooltip>
                    )}

                  {address &&
                    balData.data &&
                    strategy.id == 'xstrk_sensei' &&
                    profit < 0 &&
                    profit /
                      Number(balData.data.amount.toEtherToFixedDecimals(6)) <
                      -0.01 && (
                      <Alert
                        status={'info'}
                        fontSize={'12px'}
                        color={'light_grey'}
                        borderRadius={'10px'}
                        bg="color2_50p"
                        padding={'10px'}
                        marginTop={'10px'}
                      >
                        <AlertIcon />
                        Why did my holdings drop?{' '}
                        <a
                          href="https://docs.troves.fi/p/faq#q.-why-did-my-holdings-decrease-in-the-xstrk-sensei-strategy"
                          style={{
                            marginLeft: '5px',
                            textDecoration: 'underline',
                          }}
                          target="_blank"
                        >
                          Learn more
                        </a>
                      </Alert>
                    )}
                </Box>
                <Box display={{ base: 'block', md: 'flex' }} marginTop={'20px'}>
                  <Box width={{ base: '100%', md: '100%' }}>
                    <Text
                      fontSize={'20px'}
                      marginBottom={'0px'}
                      fontWeight={'bold'}
                    >
                      How does it work?
                    </Text>
                    <Box
                      color="light_grey"
                      marginBottom="5px"
                      fontSize={'14px'}
                    >
                      {strategy.description}
                    </Box>
                    <Wrap>
                      {getUniqueById(
                        strategy.actions.map((p) => ({
                          id: p.pool.protocol.name,
                          logo: p.pool.protocol.logo,
                        })),
                      ).map((p) => (
                        <WrapItem marginRight={'10px'} key={p.id}>
                          <Center>
                            <Avatar
                              size="2xs"
                              bg={'black'}
                              src={p.logo}
                              marginRight={'2px'}
                            />
                            <Text marginTop={'2px'}>{p.id}</Text>
                          </Center>
                        </WrapItem>
                      ))}
                    </Wrap>
                  </Box>
                </Box>
                {/*{strategy?.isRetired() && (*/}
                {/*  <Alert*/}
                {/*    fontSize={'14px'}*/}
                {/*    color={'light_grey'}*/}
                {/*    borderRadius={'10px'}*/}
                {/*    bg="color2_50p"*/}
                {/*    paddingY={'10px'}*/}
                {/*    px={'14px'}*/}
                {/*    mt={'5'}*/}
                {/*  >*/}
                {/*    <AlertIcon />*/}

                {/*    <Text>*/}
                {/*      This strategy is retired due to zkLend exploit. You can*/}
                {/*      recover your partial funds from{' '}*/}
                {/*      <Link href="/recovery" color={'white'}>*/}
                {/*        here.*/}
                {/*      </Link>*/}
                {/*    </Text>*/}
                {/*  </Alert>*/}
                {/*)}*/}
              </Card>
            </GridItem>

            <GridItem display="flex" colSpan={colSpan2}>
              {!strategy ||
                (strategy.isSingleTokenDepositView && (
                  <TokenDeposit strategy={strategy} isDualToken={false} />
                ))}
              {strategy && !strategy.isSingleTokenDepositView && (
                <TokenDeposit strategy={strategy} isDualToken={true} />
              )}
            </GridItem>
          </Grid>

          {!isMobile && (
            <Card width={'100%'} color="white" bg="#171717" padding={'15px'}>
              <Text fontSize={'20px'} marginBottom={'0px'} fontWeight={'bold'}>
                Behind the scenes
              </Text>
              <Text fontSize={'14px'} marginBottom={'10px'}>
                Actions done automatically by the strategy (smart-contract) with
                an investment of $1000
              </Text>
              {strategy.steps.length > 0 && (
                <div>
                  <Flex
                    color="white"
                    width={'100%'}
                    className="text-cell"
                    display={{ base: 'none', md: 'flex' }}
                  >
                    <Text width={'50%'} padding={'5px 10px'}>
                      Action
                    </Text>
                    <Text width={'30%'} textAlign={'left'} padding={'5px 10px'}>
                      Protocol
                    </Text>
                    <Text
                      width={'10%'}
                      textAlign={'right'}
                      padding={'5px 10px'}
                    >
                      Amount
                    </Text>
                    <Text
                      width={'10%'}
                      textAlign={'right'}
                      padding={'5px 10px'}
                    >
                      Yield
                    </Text>
                  </Flex>
                  {strategyCached &&
                    strategyCached.actions.map((action, index) => (
                      <Box
                        className="text-cell"
                        display={{ base: 'block', md: 'flex' }}
                        key={index}
                        width={'100%'}
                        color="light_grey"
                        fontSize={'14px'}
                      >
                        <Text
                          width={{ base: '100%', md: '50%' }}
                          padding={'5px 10px'}
                        >
                          {index + 1}
                          {')'} {action.name}
                        </Text>
                        <Text
                          width={{ base: '100%', md: '30%' }}
                          padding={'5px 10px'}
                        >
                          <Avatar
                            size="2xs"
                            bg={'black'}
                            src={action.token.logo}
                            marginRight={'2px'}
                          />{' '}
                          {action.token.name} on
                          <Avatar
                            size="2xs"
                            bg={'black'}
                            src={action.protocol.logo}
                            marginRight={'2px'}
                            marginLeft={'5px'}
                          />{' '}
                          {action.protocol.name}
                        </Text>
                        <Text
                          display={{ base: 'block', md: 'none' }}
                          width={{ base: '100%', md: '10%' }}
                          padding={'5px 10px'}
                        >
                          ${Number(action.amount).toLocaleString()} yields{' '}
                          {(action.apy * 100).toFixed(2)}%
                        </Text>
                        <Text
                          display={{ base: 'none', md: 'block' }}
                          width={{ base: '100%', md: '10%' }}
                          textAlign={'right'}
                          padding={'5px 10px'}
                        >
                          ${Number(action.amount).toLocaleString()}
                        </Text>
                        <Text
                          display={{ base: 'none', md: 'block' }}
                          width={{ base: '100%', md: '10%' }}
                          textAlign={'right'}
                          padding={'5px 10px'}
                        >
                          {(action.apy * 100).toFixed(2)}%
                        </Text>
                      </Box>
                    ))}
                  {(!strategyCached || strategyCached.actions.length == 0) && (
                    <Center width={'100%'} padding={'10px'}>
                      <Spinner size={'xs'} color="white" />
                    </Center>
                  )}
                </div>
              )}
              <FlowChart strategyId={strategy.id} />
            </Card>
          )}
        </VStack>
      )}
    </>
  );
};

export default Strategy;
