'use client';

import { atom, useAtomValue, useSetAtom } from 'jotai';
import mixpanel from 'mixpanel-browser';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Info, Loader2, TriangleAlert } from 'lucide-react';

import HarvestTime from '@/components/HarvestTime';
import { DUMMY_BAL_ATOM, returnEmptyBal } from '@/store/balance.atoms';
import { addressAtom } from '@/store/claims.atoms';
import { strategiesAtom, StrategyInfo } from '@/store/strategies.atoms';
import { TxHistoryAtom } from '@/store/transactions.atom';
import { formatTokenBalance, getTokenInfoFromAddr } from '@/utils';
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
import { userStrategyWiseTVLAtom } from '@/store/utils.atoms';
import { HowDoesItWorkModal } from './HowDoesItWorkModal';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SimpleTooltip } from '@/components/ui/simple-tooltip';

const Strategy = ({ params }: StrategyParams) => {
  const address = useAtomValue(addressAtom);
  const strategies = useAtomValue(strategiesAtom);
  const [isMounted, setIsMounted] = useState(false);
  const {
    data: userStrategyWiseTVL,
    isPending: userStrategyWiseTVLPending,
    error: userStrategyWiseTVLError,
  } = useAtomValue(userStrategyWiseTVLAtom(params.strategyId));

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
        <div
          className="flex flex-col gap-[8.86px] bg-[#171717]"
          style={{ width: isMobile ? '100%' : '1040px' }}
        >
          <div className="grid w-full grid-cols-10 gap-[44px]">
            <div className="col-span-10 flex md:col-span-5">
              <div className="w-full bg-[#171717] text-white">
                <div className="mb-5 flex w-full flex-col">
                  <div className="flex w-full">
                    <div className="mr-[5px] flex -space-x-[25px]">
                      {strategy &&
                        strategy.metadata.depositTokens.length > 0 &&
                        strategy.metadata.depositTokens.map((token: any) => {
                          return (
                            <Avatar
                              key={token.address}
                              className="mr-[5px] h-[47px] w-[47px]"
                            >
                              <AvatarImage src={token.logo} />
                              <AvatarFallback />
                            </Avatar>
                          );
                        })}
                      {strategy &&
                        strategy.metadata.depositTokens.length == 0 && (
                          <Avatar className="mr-[5px] h-12 w-12">
                            <AvatarImage
                              src={strategy?.holdingTokens[0].logo}
                            />
                            <AvatarFallback />
                          </Avatar>
                        )}
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="flex flex-col items-start gap-0">
                        <p className="ml-2.5 text-[18px] font-bold leading-normal text-white md:text-[25px]">
                          {strategy ? strategy.name : 'Strategy Not found'}
                        </p>
                        <p
                          className="-mt-[5px] ml-2.5 text-[20px] font-light text-white"
                          style={{
                            fontFamily: 'var(--font-ibm-plex-mono-light)',
                          }}
                        >
                          By Ekubo
                        </p>
                      </div>
                    </div>
                  </div>
                  {/* Temporary warning for USDC vault */}
                  {strategy.name.includes('USDC.e') && (
                    <div className="flex w-full flex-col items-center justify-center gap-2 rounded-[10px] border border-[#FCC01E] bg-[#FCC01E1A] py-2">
                      <div className="flex items-center gap-2">
                        <TriangleAlert className="h-4 w-4 text-orange-400" />
                        <p>Vault currently under migration</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm">
                          You can switch your USDC.e to USDC on AVNU{' '}
                          <span className="underline hover:text-[#2E45D0]">
                            <Link
                              href="https://app.avnu.fi/en/usdc.e-usdc"
                              target="_blank"
                            >
                              here
                            </Link>
                          </span>
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm">
                          See AVNU&apos;s{' '}
                          <span className="underline hover:text-[#2E45D0]">
                            <Link
                              href="https://docs.avnu.fi/updates/circle-usdc-migration"
                              target="_blank"
                            >
                              docs
                            </Link>
                          </span>{' '}
                          for more information.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {!strategy?.isRetired() && (
                  <HarvestTime strategy={strategy} balData={balData} />
                )}
                <div className={`${styles.border_gray} mt-5`}>
                  {!userStrategyWiseTVLError && (
                    <div className="flex w-full justify-between">
                      <div className="flex w-full items-center justify-between">
                        <p className="theme-strategy-subtitle">
                          <b>Total Position Value </b>
                        </p>
                        <p className="text-[21px]">
                          {address ? (
                            userStrategyWiseTVLPending ? (
                              <Loader2 className="mt-[5px] h-4 w-4 animate-spin" />
                            ) : userStrategyWiseTVL === 0 ||
                              strategy?.isRetired() ? (
                              '-'
                            ) : (
                              `USD ${userStrategyWiseTVL.toFixed(2)}`
                            )
                          ) : (
                            'Connect wallet'
                          )}
                        </p>
                      </div>
                    </div>
                  )}
                  {userStrategyWiseTVLError && (
                    <p className="theme-strategy-subtitle">
                      <b>Total Position Value: Error</b>
                    </p>
                  )}

                  {/* Show individual holdings is more tokens */}
                  <div className="h-[15px]">
                    {individualBalances.length > 1 &&
                      balData.data?.amount.compare('0', 'gt') && (
                        <SimpleTooltip label="Detailed info of your individual token holdings in the strategy. This can vary with time depending on market conditions. The above value is the holdings in aggregated as a single token.">
                          <div className="flex items-center gap-2 text-[10px] text-light_grey">
                            <p>Detailed Split:</p>
                            {individualBalances.map((bx, index) => {
                              return (
                                <p key={index}>
                                  {formatTokenBalance(
                                    bx?.amount,
                                    bx.tokenInfo?.displayDecimals || 2,
                                  )}{' '}
                                  {bx?.tokenInfo?.name}
                                </p>
                              );
                            })}
                          </div>
                        </SimpleTooltip>
                      )}
                  </div>

                  {address &&
                    balData.data &&
                    strategy.id == 'xstrk_sensei' &&
                    profit < 0 &&
                    profit /
                      Number(balData.data.amount.toEtherToFixedDecimals(6)) <
                      -0.01 && (
                      <div className="mt-2.5 flex items-center gap-2 rounded-[10px] bg-color2_50p p-2.5 text-xs text-light_grey">
                        <Info className="h-4 w-4 shrink-0" />
                        <span>
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
                        </span>
                      </div>
                    )}
                </div>
                <HowDoesItWorkModal strategy={strategy} />
              </div>
            </div>

            <div className="col-span-10 flex w-full md:col-span-5">
              {!strategy ||
                (strategy.isSingleTokenDepositView && (
                  <TokenDeposit strategy={strategy} isDualToken={false} />
                ))}
              {strategy && !strategy.isSingleTokenDepositView && (
                <TokenDeposit strategy={strategy} isDualToken={true} />
              )}
            </div>
          </div>

          {!isMobile && (
            <div className="w-full bg-[#171717] p-[15px] text-white">
              <p className="mb-0 text-[20px] font-bold">Behind the scenes</p>
              <p className="mb-2.5 text-sm">
                Actions done automatically by the strategy (smart-contract) with
                an investment of $1000
              </p>
              {strategy.steps.length > 0 && (
                <div>
                  <div className="text-cell hidden w-full text-white md:flex">
                    <p className="w-1/2 px-2.5 py-[5px]">Action</p>
                    <p className="w-[30%] px-2.5 py-[5px] text-left">
                      Protocol
                    </p>
                    <p className="w-[10%] px-2.5 py-[5px] text-right">Amount</p>
                    <p className="w-[10%] px-2.5 py-[5px] text-right">Yield</p>
                  </div>
                  {strategyCached &&
                    strategyCached.actions.map((action, index) => (
                      <div
                        className="text-cell block w-full text-sm text-light_grey md:flex"
                        key={index}
                      >
                        <p className="w-full px-2.5 py-[5px] md:w-1/2">
                          {index + 1}
                          {')'} {action.name}
                        </p>
                        <p className="flex w-full items-center px-2.5 py-[5px] md:w-[30%]">
                          <Avatar className="mr-0.5 h-4 w-4 bg-black">
                            <AvatarImage src={action.token.logo} />
                            <AvatarFallback />
                          </Avatar>{' '}
                          {action.token.name} on
                          <Avatar className="ml-[5px] mr-0.5 h-4 w-4 bg-black">
                            <AvatarImage src={action.protocol.logo} />
                            <AvatarFallback />
                          </Avatar>{' '}
                          {action.protocol.name}
                        </p>
                        <p className="block w-full px-2.5 py-[5px] md:hidden md:w-[10%]">
                          ${Number(action.amount).toLocaleString()} yields{' '}
                          {(action.apy * 100).toFixed(2)}%
                        </p>
                        <p className="hidden w-full px-2.5 py-[5px] text-right md:block md:w-[10%]">
                          ${Number(action.amount).toLocaleString()}
                        </p>
                        <p className="hidden w-full px-2.5 py-[5px] text-right md:block md:w-[10%]">
                          {(action.apy * 100).toFixed(2)}%
                        </p>
                      </div>
                    ))}
                  {(!strategyCached || strategyCached.actions.length == 0) && (
                    <div className="flex w-full items-center justify-center p-2.5">
                      <Loader2 className="h-3 w-3 animate-spin text-white" />
                    </div>
                  )}
                </div>
              )}
              <FlowChart strategyId={strategy.id} />
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default Strategy;
