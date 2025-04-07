import { NextResponse } from 'next/server';
import { atom } from 'jotai';
import { PoolInfo, PoolType } from '@/store/pools';
import { RpcProvider } from 'starknet';
import { getLiveStatusNumber, getStrategies } from '@/store/strategies.atoms';
import MyNumber from '@/utils/MyNumber';
import { IStrategy, NFTInfo, TokenInfo } from '@/strategies/IStrategy';
import { STRKFarmStrategyAPIResult } from '@/store/strkfarm.atoms';
import { MY_STORE } from '@/store';
import VesuAtoms, { vesu } from '@/store/vesu.store';
import EndurAtoms, { endur } from '@/store/endur.store';
import kvRedis, { getDataFromRedis } from '../lib';

export const revalidate = 600; // 1 hr
export const dynamic = 'force-dynamic';

const allPoolsAtom = atom<PoolInfo[]>((get) => {
  const pools: PoolInfo[] = [];
  // undo
  const poolAtoms = [VesuAtoms, EndurAtoms];
  // const poolAtoms: ProtocolAtoms[] = [];
  return poolAtoms.reduce((_pools, p) => _pools.concat(get(p.pools)), pools);
});

async function getPools(store: any, retry = 0) {
  const allPools: PoolInfo[] | undefined = store.get(allPoolsAtom);

  console.log('allPools', allPools?.length);
  // undo
  const minProtocolsRequired: string[] = [vesu.name, endur.name];
  const hasRequiredPools = minProtocolsRequired.every((p) => {
    if (minProtocolsRequired.length == 0) return true;
    if (!allPools) return false;
    return allPools.some((pool) => {
      console.log(new Date(), 'pool.protocol.name', pool.protocol.name);
      return (
        pool.protocol.name === p &&
        (pool.type == PoolType.Lending || pool.type == PoolType.Staking)
      );
    });
  });
  console.log(new Date(), 'hasRequiredPools', hasRequiredPools);
  const MAX_RETRIES = 120;
  if (retry >= MAX_RETRIES) {
    throw new Error('Failed to fetch pools');
  } else if (!allPools || !hasRequiredPools) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return getPools(store, retry + 1);
  }
  return allPools;
}

const provider = new RpcProvider({
  nodeUrl: process.env.RPC_URL || 'https://starknet-mainnet.public.blastapi.io',
});

async function getStrategyInfo(
  strategy: IStrategy<any>,
): Promise<STRKFarmStrategyAPIResult> {
  const tvl = await strategy.getTVL();

  return {
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
    ).map((t) => t.amounts[0].tokenInfo.address.address),
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

  const allPools = await getPools(MY_STORE);
  const strategies = getStrategies();

  const proms = strategies.map((strategy) => {
    if (!strategy.isLive()) return;
    return strategy.solve(allPools, '1000');
  });

  await Promise.all(proms);
  // strategies.forEach((strategy) => {
  //   try {
  //     strategy.solve(allPools, '1000');
  //   } catch (err) {
  //     console.error('Error solving strategy', strategy.name, err);
  //   }
  // });

  const stratsDataProms: any[] = [];
  const _strats = strategies.sort((a, b) => {
    // sort based on risk factor, live status and apy
    const aRisk = a.riskFactor;
    const bRisk = b.riskFactor;
    const aLive = getLiveStatusNumber(a.liveStatus);
    const bLive = getLiveStatusNumber(b.liveStatus);
    if (aLive !== bLive) return aLive - bLive;
    if (aRisk !== bRisk) return aRisk - bRisk;
    return b.netYield - a.netYield;
  });
  for (let i = 0; i < _strats.length; i++) {
    stratsDataProms.push(getStrategyInfo(_strats[i]));
  }

  const stratsData = await Promise.all(stratsDataProms);

  try {
    const data = {
      status: true,
      strategies: stratsData,
      lastUpdated: new Date().toISOString(),
    };
    await kvRedis.set(REDIS_KEY, data);
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
