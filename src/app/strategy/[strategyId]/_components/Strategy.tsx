'use client';

import {
  Alert,
  AlertIcon,
  Avatar,
  AvatarGroup,
  Badge,
  Box,
  Card,
  Center,
  Flex,
  Grid,
  GridItem,
  HStack,
  Link,
  ListItem,
  OrderedList,
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
import {
  capitalize,
  getTokenInfoFromAddr,
  getUniqueById,
  shortAddress,
  timeAgo,
} from '@/utils';
import MyNumber from '@/utils/MyNumber';
import { ExternalLinkIcon } from '@chakra-ui/icons';
import { StrategyParams } from '../page';
import FlowChart from './FlowChart';
import { isMobile } from 'react-device-detect';
import { getRiskExplaination } from '@strkfarm/sdk';
import {
  STRKFarmBaseAPYsAtom,
  STRKFarmStrategyAPIResult,
} from '@/store/strkfarm.atoms';
import { TokenDeposit } from './TokenDeposit';

function HoldingsText({
  strategy,
  address,
  balData,
}: {
  strategy: StrategyInfo<any>;
  address: string | undefined;
  balData: any;
}) {
  if (strategy.settings.isInMaintenance)
    return <span style={{ color: 'orange' }}>Maintenance Mode</span>;
  if (!address) return 'Connect wallet';
  if (balData.isLoading || !balData.data?.tokenInfo) {
    return (
      <>
        <Spinner size="sm" marginTop={'5px'} />
      </>
    );
  }
  if (balData.isError) {
    console.error('Balance data error:', balData.error);
    return 'Error';
  }
  const value = Number(
    balData.data.amount.toEtherToFixedDecimals(
      balData.data.tokenInfo?.displayDecimals || 2,
    ),
  );
  if (value === 0 || strategy?.isRetired()) return '-';
  return `${balData.data.amount.toEtherToFixedDecimals(
    balData.data.tokenInfo?.displayDecimals || 2,
  )} ${balData.data.tokenInfo?.name}`;
}

function NetEarningsText({
  strategy,
  address,
  profit,
  balData,
}: {
  strategy: StrategyInfo<any>;
  address: string | undefined;
  profit: number;
  balData: any;
}) {
  if (
    !address ||
    profit === 0 ||
    strategy?.isRetired() ||
    strategy.settings.isInMaintenance
  )
    return '-';
  return `${profit?.toFixed(
    balData.data.tokenInfo?.displayDecimals || 2,
  )} ${balData.data.tokenInfo?.name}`;
}

function HoldingsAndEarnings({
  strategy,
  address,
  balData,
  profit,
}: {
  strategy: StrategyInfo<any>;
  address: string | undefined;
  balData: any;
  profit: number;
}) {
  // if (
  //   balData.isLoading ||
  //   !balData.data?.tokenInfo ||
  //   balData.isPending
  // ) {
  //   return (
  //     <Text>
  //       <b>Your Holdings: </b>
  //       {address ? <Spinner size="sm" marginTop={'5px'} /> : 'Connect wallet'}
  //     </Text>
  //   );
  // }
  // if (balData.isError) {
  //   return (
  //     <Text>
  //       <b>Your Holdings: Error</b>
  //     </Text>
  //   );
  // }
  return (
    <Flex width={'100%'} justifyContent={'space-between'}>
      <Box>
        <Text>
          <b>Your Holdings </b>
        </Text>
        <Text color="cyan">
          <HoldingsText
            strategy={strategy}
            address={address}
            balData={balData}
          />
        </Text>
      </Box>
      {!strategy.settings.isTransactionHistDisabled && (
        <Tooltip label={!strategy?.isRetired() && 'Life time earnings'}>
          <Box>
            <Text textAlign={'right'} fontWeight={'none'}>
              <b>Net earnings</b>
            </Text>
            <Text textAlign={'right'} color={profit >= 0 ? 'cyan' : 'red'}>
              <NetEarningsText
                strategy={strategy}
                address={address}
                profit={profit}
                balData={balData}
              />
            </Text>
          </Box>
        </Tooltip>
      )}
    </Flex>
  );
}

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
      <Flex marginBottom={'10px'}>
        <AvatarGroup size={'md'} spacing={'-20px'} mr={'5px'}>
          {strategy &&
            strategy.metadata.depositTokens.length > 0 &&
            strategy.metadata.depositTokens.map((token: any) => {
              return (
                <Avatar
                  key={token.address}
                  marginRight={'5px'}
                  src={token.logo}
                />
              );
            })}
          {strategy && strategy.metadata.depositTokens.length == 0 && (
            <Avatar marginRight={'5px'} src={strategy?.holdingTokens[0].logo} />
          )}
        </AvatarGroup>
        <Text
          marginTop={'6px'}
          fontSize={{ base: '18px', md: '25px' }}
          fontWeight={'bold'}
          color="white"
        >
          {strategy ? strategy.name : 'Strategy Not found'}
        </Text>
      </Flex>

      {strategy && (
        <VStack width={'100%'}>
          <Grid width={'100%'} templateColumns="repeat(5, 1fr)" gap={2}>
            <GridItem display="flex" colSpan={colSpan1}>
              <Card width="100%" padding={'15px'} color="white" bg="highlight">
                {!strategy?.isRetired() && (
                  <HarvestTime strategy={strategy} balData={balData} />
                )}
                <Box display={{ base: 'block', md: 'flex' }} marginTop={'10px'}>
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
                <Box
                  padding={'10px'}
                  borderRadius={'10px'}
                  bg={'bg'}
                  marginTop={'20px'}
                >
                  <HoldingsAndEarnings
                    strategy={strategy}
                    address={address}
                    balData={balData}
                    profit={profit}
                  />

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
                          href="https://docs.strkfarm.com/p/faq#q.-why-did-my-holdings-decrease-in-the-xstrk-sensei-strategy"
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
                {strategy?.isRetired() && (
                  <Alert
                    fontSize={'14px'}
                    color={'light_grey'}
                    borderRadius={'10px'}
                    bg="color2_50p"
                    paddingY={'10px'}
                    px={'14px'}
                    mt={'5'}
                  >
                    <AlertIcon />

                    <Text>
                      This strategy is retired due to zkLend exploit. You can
                      recover your partial funds from{' '}
                      <Link href="/recovery" color={'white'}>
                        here.
                      </Link>
                    </Text>
                  </Alert>
                )}
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
            <Card width={'100%'} color="white" bg="highlight" padding={'15px'}>
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
          <Grid width={'100%'} templateColumns="repeat(5, 1fr)" gap={2}>
            <GridItem colSpan={colSpan1} bg="highlight">
              {/* Risks card */}
              <Card
                width={'100%'}
                color="white"
                bg="highlight"
                padding={'15px'}
              >
                <Text
                  fontSize={'20px'}
                  marginBottom={'10px'}
                  fontWeight={'bold'}
                >
                  Risks
                </Text>
                <OrderedList>
                  {strategy.risks.map((r) => (
                    <ListItem
                      color="light_grey"
                      key={r}
                      fontSize={'13px'}
                      marginBottom={'10px'}
                      alignItems={'justify'}
                    >
                      {r}
                    </ListItem>
                  ))}
                </OrderedList>
                <Box>
                  {strategy.metadata.risk.riskFactor.map(
                    (r: any, i: number) => (
                      <Tooltip label={getRiskExplaination(r.type)} key={i}>
                        <Badge
                          padding={'5px 10px'}
                          borderRadius={'10px'}
                          opacity={0.8}
                          marginRight={'5px'}
                          marginTop={'10px'}
                        >
                          {r.type.valueOf()}
                        </Badge>
                      </Tooltip>
                    ),
                  )}
                </Box>
              </Card>
            </GridItem>
            <GridItem colSpan={colSpan2} bg={'highlight'}>
              {/* Transaction history card */}
              <Card
                width={'100%'}
                color="white"
                bg="highlight"
                padding={'15px'}
              >
                <Text fontSize={'20px'} fontWeight={'bold'}>
                  Transaction history
                </Text>
                {!strategy.settings.isTransactionHistDisabled && (
                  <Text
                    fontSize={'13px'}
                    marginBottom={'10px'}
                    color={'color2'}
                  >
                    There may be delays fetching data. If your transaction{' '}
                    {`isn't`} found, try again later.
                  </Text>
                )}

                {txHistoryResult.isSuccess && (
                  <>
                    {txHistory.findManyInvestment_flows.map((tx, index) => {
                      const token = getTokenInfoFromAddr(tx.asset);
                      const decimals = token?.decimals;

                      return (
                        <Box
                          className="text-cell"
                          key={index}
                          width={'100%'}
                          color="light_grey"
                          fontSize={'14px'}
                          display={{ base: 'block', md: 'flex' }}
                        >
                          <Flex
                            width={{ base: '100%' }}
                            justifyContent={'space-between'}
                          >
                            <Text width={'10%'}>{index + 1}.</Text>
                            <Box width={'40%'}>
                              <Text
                                textAlign={'right'}
                                color={tx.type == 'deposit' ? 'cyan' : 'red'}
                                fontWeight={'bold'}
                              >
                                {Number(
                                  new MyNumber(
                                    tx.amount,
                                    decimals!,
                                  ).toEtherToFixedDecimals(
                                    token.displayDecimals,
                                  ),
                                ).toLocaleString()}{' '}
                                {token?.name}
                              </Text>
                              <Text textAlign={'right'} color="color2_65p">
                                {capitalize(tx.type)}
                              </Text>
                            </Box>

                            <Box width={'50%'} justifyContent={'flex-end'}>
                              <Text
                                width={'100%'}
                                textAlign={'right'}
                                fontWeight={'bold'}
                              >
                                <Link
                                  href={`https://starkscan.co/tx/${tx.txHash}`}
                                  target="_blank"
                                >
                                  {shortAddress(tx.txHash)} <ExternalLinkIcon />
                                </Link>
                              </Text>
                              <Text
                                width={'100%'}
                                textAlign={'right'}
                                color="color2_65p"
                              >
                                {/* The default msg contains strategy name, since this for a specific strategy, replace it */}
                                {timeAgo(new Date(tx.timestamp * 1000))}
                              </Text>
                            </Box>
                          </Flex>
                        </Box>
                      );
                    })}
                  </>
                )}

                {/* If no filtered tx */}
                {!strategy.settings.isTransactionHistDisabled &&
                  txHistory.findManyInvestment_flows.length === 0 && (
                    <Text
                      fontSize={'14px'}
                      textAlign={'center'}
                      color="light_grey"
                    >
                      No transactions found
                    </Text>
                  )}
                {strategy.settings.isTransactionHistDisabled && (
                  <Text
                    fontSize={'14px'}
                    textAlign={'center'}
                    color="light_grey"
                    marginTop={'20px'}
                  >
                    Transaction history is not available for this strategy yet.
                    If enabled in future, will include the entire history.
                  </Text>
                )}
              </Card>
            </GridItem>
          </Grid>
        </VStack>
      )}
    </>
  );
};

export default Strategy;
