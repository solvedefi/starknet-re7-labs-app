import { NextResponse } from 'next/server';
import { RpcProvider } from 'starknet';
import { getLiveStatusNumber, getStrategies } from '@/store/strategies.atoms';
import MyNumber from '@/utils/MyNumber';
import { IStrategy, NFTInfo, TokenInfo } from '@/strategies/IStrategy';
import { STRKFarmStrategyAPIResult } from '@/store/strkfarm.atoms';
import { getDataFromRedis, getRewardsInfo, setDataToRedis } from '../lib';

export const revalidate = 1800; // 30 minutes
export const dynamic = 'force-dynamic';

const provider = new RpcProvider({
  nodeUrl: process.env.RPC_URL || 'https://starknet-mainnet.public.blastapi.io',
});

async function getStrategyInfo(
  strategy: IStrategy<any>,
): Promise<STRKFarmStrategyAPIResult> {
  const tvl = await strategy.getTVL();

  const data = {
    name: strategy.name,
    id: strategy.id,
    apy: strategy.netYield,
    apySplit: {
      baseApy: strategy.netYield,
      rewardsApy: 0,
    },
    depositToken: (
      await strategy.depositMethods({
        amount: MyNumber.fromZero(),
        address: '',
        provider,
        isMax: false,
      })
    )[0].amounts.map((t) => ({
      symbol: t.tokenInfo.symbol,
      name: t.tokenInfo.name,
      address: t.tokenInfo.address.address,
      decimals: t.tokenInfo.decimals,
    })),
    leverage: strategy.leverage,
    contract: strategy.holdingTokens.map((t) => ({
      name: t.name,
      address: (<any>t).token ? (<TokenInfo>t).token : (<NFTInfo>t).address,
    })),
    tvlUsd: tvl.usdValue || 0,
    status: {
      number: getLiveStatusNumber(strategy.liveStatus),
      value: strategy.liveStatus,
    },
    riskFactor: strategy.riskFactor,
    logos: strategy.metadata.depositTokens.map((t) => t.logo),
    isAudited: strategy.settings.auditUrl ? true : false,
    auditUrl: strategy.settings.auditUrl,
    actions: strategy.actions.map((action) => {
      return {
        name: action.name || '',
        protocol: {
          name: action.pool.protocol.name,
          logo: action.pool.protocol.logo,
        },
        token: {
          name: action.pool.pool.name,
          logo: action.pool.pool.logos[0],
        },
        amount: action.amount,
        isDeposit: action.isDeposit,
        apy: action.isDeposit ? action.pool.apr : -action.pool.borrow.apr,
      };
    }),
    investmentFlows: strategy.investmentFlows,
  };

  const rewardsInfo = await getRewardsInfo([
    {
      id: strategy.id,
      tvlUsd: data.tvlUsd,
      contract: data.contract,
    },
  ]);
  if (rewardsInfo.length > 0) {
    data.apySplit.rewardsApy = rewardsInfo[0].rewardAPY / 100;
    data.apy += rewardsInfo[0].rewardAPY / 100;
  }
  return data;
}

const REDIS_KEY = `${process.env.VK_REDIS_PREFIX}::strategies`;

export async function GET(req: Request) {
  console.log('GET /api/strategies', req.url);
  const cacheData = await getDataFromRedis(REDIS_KEY, req.url, revalidate);
  if (cacheData) {
    const resp = NextResponse.json(cacheData);
    resp.headers.set(
      'Cache-Control',
      `s-maxage=${revalidate}, stale-while-revalidate=300`,
    );
    return resp;
  }

  const strategies = getStrategies();

  const proms = strategies.map((strategy) => {
    if (!strategy.isLive()) return;
    return strategy.solve([], '1000');
  });

  await Promise.all(proms);
  // strategies.forEach((strategy) => {
  //   try {
  //     strategy.solve(allPools, '1000');
  //   } catch (err) {
  //     console.error('Error solving strategy', strategy.name, err);
  //   }
  // });

  const stratsDataProms: Promise<STRKFarmStrategyAPIResult>[] = [];
  for (let i = 0; i < strategies.length; i++) {
    stratsDataProms.push(getStrategyInfo(strategies[i]));
  }
  const stratsData = await Promise.all(stratsDataProms);

  const _strats = stratsData.sort((a, b) => {
    // sort based on risk factor, live status and apy
    const aRisk = a.riskFactor;
    const bRisk = b.riskFactor;
    const aLive = a.status.number;
    const bLive = b.status.number;
    if (aLive !== bLive) return aLive - bLive;
    if (aRisk !== bRisk) return aRisk - bRisk;
    return b.apy - a.apy;
  });

  try {
    const data = {
      status: true,
      strategies: _strats,
      lastUpdated: new Date().toISOString(),
    };
    await setDataToRedis(REDIS_KEY, data);
    const response = NextResponse.json(data);
    response.headers.set(
      'Cache-Control',
      `s-maxage=${revalidate}, stale-while-revalidate=300`,
    );
    return response;
  } catch (err) {
    console.error('Error /api/strategies', err);
    return NextResponse.json({
      status: false,
      strategies: [],
      lastUpdated: new Date().toISOString(),
    });
  }
}
