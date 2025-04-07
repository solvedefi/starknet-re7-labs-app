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

export async function GET(req: Request) {
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
    const response = NextResponse.json({
      status: true,
      strategies: stratsData,
      lastUpdated: new Date().toISOString(),
    });
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

async function GETT() {
  return NextResponse.json({
    status: true,
    strategies: [
      {
        name: 'Vesu Fusion STRK',
        id: 'vesu_fusion_strk',
        apy: 0.09702402495556883,
        apySplit: { baseApy: 0.09702402495556883, rewardsApy: 0 },
        depositToken: [
          '0x4718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d',
        ],
        leverage: 1,
        contract: [
          {
            name: 'STRK',
            address:
              '0x7fb5bcb8525954a60fde4e8fb8220477696ce7117ef264775a1770e23571929',
          },
        ],
        tvlUsd: 213.84654751138,
        status: { number: 1, value: 'Hot & New 🔥' },
        riskFactor: 0.75,
        logos: [
          'https://assets.coingecko.com/coins/images/26433/small/starknet.png',
        ],
        isAudited: true,
        auditUrl:
          'https://assets.strkfarm.com/strkfarm/audit_report_vesu_and_ekubo_strats.pdf',
        actions: [],
        investmentFlows: [
          {
            title: 'Your Deposit',
            subItems: [
              { key: 'Net yield', value: '9.70%' },
              { key: 'Performance Fee', value: '10.00%' },
            ],
            linkedFlows: [
              {
                title: 'Pool name: Re7 xSTRK',
                subItems: [
                  { key: 'APY', value: '10.91%' },
                  { key: 'Weight', value: '98.00 / 100.00%' },
                ],
                linkedFlows: [],
                style: { backgroundColor: '#35484f' },
              },
              {
                title: 'Pool name: Genesis',
                subItems: [
                  { key: 'APY', value: '4.36%' },
                  { key: 'Weight', value: '2.00 / 100.00%' },
                ],
                linkedFlows: [],
                style: { backgroundColor: '#35484f' },
              },
              {
                title: 'Pool name: Re7 USDC',
                subItems: [
                  { key: 'APY', value: '4.36%' },
                  { key: 'Weight', value: '0.00 / 100.00%' },
                ],
                linkedFlows: [],
                style: { color: 'gray' },
              },
              {
                title: 'Pool name: Re7 Starknet Ecosystem',
                subItems: [
                  { key: 'APY', value: '4.36%' },
                  { key: 'Weight', value: '0.00 / 100.00%' },
                ],
                linkedFlows: [],
                style: { color: 'gray' },
              },
              {
                title: 'Pool name: Alterscope wstETH',
                subItems: [
                  { key: 'APY', value: '4.36%' },
                  { key: 'Weight', value: '0.00 / 20.00%' },
                ],
                linkedFlows: [],
                style: { color: 'gray' },
              },
              {
                title: 'Pool name: Alterscope Cornerstone',
                subItems: [
                  { key: 'APY', value: '4.36%' },
                  { key: 'Weight', value: '0.00 / 20.00%' },
                ],
                linkedFlows: [],
                style: { color: 'gray' },
              },
              {
                title: 'Pool name: Alterscope CASH',
                subItems: [
                  { key: 'APY', value: '4.36%' },
                  { key: 'Weight', value: '0.00 / 20.00%' },
                ],
                linkedFlows: [],
                style: { color: 'gray' },
              },
              {
                title: 'Pool name: Alterscope xSTRK',
                subItems: [
                  { key: 'APY', value: '4.36%' },
                  { key: 'Weight', value: '0.00 / 20.00%' },
                ],
                linkedFlows: [],
                style: { color: 'gray' },
              },
              {
                title: 'Pool name: Re7 rUSDC',
                subItems: [
                  { key: 'APY', value: '4.36%' },
                  { key: 'Weight', value: '0.00 / 100.00%' },
                ],
                linkedFlows: [],
                style: { color: 'gray' },
              },
            ],
            style: { backgroundColor: '#6e53dc' },
          },
        ],
      },
      {
        name: 'Vesu Fusion USDC',
        id: 'vesu_fusion_usdc',
        apy: 0.08222842193428995,
        apySplit: { baseApy: 0.08222842193428995, rewardsApy: 0 },
        depositToken: [
          '0x53c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8',
        ],
        leverage: 1,
        contract: [
          {
            name: 'USDC',
            address:
              '0xa858c97e9454f407d1bd7c57472fc8d8d8449a777c822b41d18e387816f29c',
          },
        ],
        tvlUsd: 1016.454832861074,
        status: { number: 1, value: 'Hot & New 🔥' },
        riskFactor: 0.75,
        logos: [
          'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png',
        ],
        isAudited: true,
        auditUrl:
          'https://assets.strkfarm.com/strkfarm/audit_report_vesu_and_ekubo_strats.pdf',
        actions: [],
        investmentFlows: [
          {
            title: 'Your Deposit',
            subItems: [
              { key: 'Net yield', value: '8.22%' },
              { key: 'Performance Fee', value: '10.00%' },
            ],
            linkedFlows: [
              {
                title: 'Pool name: Re7 Starknet Ecosystem',
                subItems: [
                  { key: 'APY', value: '9.24%' },
                  { key: 'Weight', value: '97.81 / 100.00%' },
                ],
                linkedFlows: [],
                style: { backgroundColor: '#35484f' },
              },
              {
                title: 'Pool name: Re7 USDC',
                subItems: [
                  { key: 'APY', value: '4.39%' },
                  { key: 'Weight', value: '1.99 / 100.00%' },
                ],
                linkedFlows: [],
                style: { backgroundColor: '#35484f' },
              },
              {
                title: 'Pool name: Genesis',
                subItems: [
                  { key: 'APY', value: '3.98%' },
                  { key: 'Weight', value: '0.20 / 100.00%' },
                ],
                linkedFlows: [],
                style: { backgroundColor: '#35484f' },
              },
              {
                title: 'Pool name: Alterscope wstETH',
                subItems: [
                  { key: 'APY', value: '3.87%' },
                  { key: 'Weight', value: '0.00 / 20.00%' },
                ],
                linkedFlows: [],
                style: { color: 'gray' },
              },
              {
                title: 'Pool name: Alterscope Cornerstone',
                subItems: [
                  { key: 'APY', value: '3.87%' },
                  { key: 'Weight', value: '0.00 / 20.00%' },
                ],
                linkedFlows: [],
                style: { color: 'gray' },
              },
              {
                title: 'Pool name: Alterscope CASH',
                subItems: [
                  { key: 'APY', value: '3.87%' },
                  { key: 'Weight', value: '0.00 / 20.00%' },
                ],
                linkedFlows: [],
                style: { color: 'gray' },
              },
              {
                title: 'Pool name: Alterscope xSTRK',
                subItems: [
                  { key: 'APY', value: '3.87%' },
                  { key: 'Weight', value: '0.00 / 20.00%' },
                ],
                linkedFlows: [],
                style: { color: 'gray' },
              },
              {
                title: 'Pool name: Re7 rUSDC',
                subItems: [
                  { key: 'APY', value: '3.87%' },
                  { key: 'Weight', value: '0.00 / 100.00%' },
                ],
                linkedFlows: [],
                style: { color: 'gray' },
              },
            ],
            style: { backgroundColor: '#6e53dc' },
          },
        ],
      },
      {
        name: 'Vesu Fusion ETH',
        id: 'vesu_fusion_eth',
        apy: 0.047520955986261756,
        apySplit: { baseApy: 0.047520955986261756, rewardsApy: 0 },
        depositToken: [
          '0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
        ],
        leverage: 1,
        contract: [
          {
            name: 'ETH',
            address:
              '0x5eaf5ee75231cecf79921ff8ded4b5ffe96be718bcb3daf206690ad1a9ad0ca',
          },
        ],
        tvlUsd: 112.54521093847399,
        status: { number: 1, value: 'Hot & New 🔥' },
        riskFactor: 0.75,
        logos: ['https://opbnb.bscscan.com/token/images/ether.svg'],
        isAudited: true,
        auditUrl:
          'https://assets.strkfarm.com/strkfarm/audit_report_vesu_and_ekubo_strats.pdf',
        actions: [],
        investmentFlows: [
          {
            title: 'Your Deposit',
            subItems: [
              { key: 'Net yield', value: '4.75%' },
              { key: 'Performance Fee', value: '10.00%' },
            ],
            linkedFlows: [
              {
                title: 'Pool name: Re7 wstETH',
                subItems: [
                  { key: 'APY', value: '5.29%' },
                  { key: 'Weight', value: '98.00 / 100.00%' },
                ],
                linkedFlows: [],
                style: { backgroundColor: '#35484f' },
              },
              {
                title: 'Pool name: Genesis',
                subItems: [
                  { key: 'APY', value: '4.90%' },
                  { key: 'Weight', value: '2.00 / 100.00%' },
                ],
                linkedFlows: [],
                style: { backgroundColor: '#35484f' },
              },
              {
                title: 'Pool name: Re7 USDC',
                subItems: [
                  { key: 'APY', value: '4.80%' },
                  { key: 'Weight', value: '0.00 / 100.00%' },
                ],
                linkedFlows: [],
                style: { color: 'gray' },
              },
              {
                title: 'Pool name: Alterscope wstETH',
                subItems: [
                  { key: 'APY', value: '4.80%' },
                  { key: 'Weight', value: '0.00 / 20.00%' },
                ],
                linkedFlows: [],
                style: { color: 'gray' },
              },
              {
                title: 'Pool name: Alterscope Cornerstone',
                subItems: [
                  { key: 'APY', value: '4.80%' },
                  { key: 'Weight', value: '0.00 / 20.00%' },
                ],
                linkedFlows: [],
                style: { color: 'gray' },
              },
              {
                title: 'Pool name: Alterscope CASH',
                subItems: [
                  { key: 'APY', value: '4.80%' },
                  { key: 'Weight', value: '0.00 / 20.00%' },
                ],
                linkedFlows: [],
                style: { color: 'gray' },
              },
              {
                title: 'Pool name: Alterscope xSTRK',
                subItems: [
                  { key: 'APY', value: '4.80%' },
                  { key: 'Weight', value: '0.00 / 20.00%' },
                ],
                linkedFlows: [],
                style: { color: 'gray' },
              },
              {
                title: 'Pool name: Re7 rUSDC',
                subItems: [
                  { key: 'APY', value: '4.80%' },
                  { key: 'Weight', value: '0.00 / 100.00%' },
                ],
                linkedFlows: [],
                style: { color: 'gray' },
              },
            ],
            style: { backgroundColor: '#6e53dc' },
          },
        ],
      },
      {
        name: 'Vesu Fusion USDT',
        id: 'vesu_fusion_usdt',
        apy: 0.0354024,
        apySplit: { baseApy: 0.0354024, rewardsApy: 0 },
        depositToken: [
          '0x68f5c6a61780768455de69077e07e89787839bf8166decfbf92b645209c0fb8',
        ],
        leverage: 1,
        contract: [
          {
            name: 'USDT',
            address:
              '0x115e94e722cfc4c77a2f15c4aefb0928c1c0029e5a57570df24c650cb7cec2c',
          },
        ],
        tvlUsd: 2.000055,
        status: { number: 1, value: 'Hot & New 🔥' },
        riskFactor: 0.75,
        logos: [
          'https://assets.coingecko.com/coins/images/325/small/Tether.png',
        ],
        isAudited: true,
        auditUrl:
          'https://assets.strkfarm.com/strkfarm/audit_report_vesu_and_ekubo_strats.pdf',
        actions: [],
        investmentFlows: [
          {
            title: 'Your Deposit',
            subItems: [
              { key: 'Net yield', value: '3.54%' },
              { key: 'Performance Fee', value: '10.00%' },
            ],
            linkedFlows: [
              {
                title: 'Pool name: Genesis',
                subItems: [
                  { key: 'APY', value: '3.93%' },
                  { key: 'Weight', value: '100.00 / 100.00%' },
                ],
                linkedFlows: [],
                style: { backgroundColor: '#35484f' },
              },
              {
                title: 'Pool name: Alterscope wstETH',
                subItems: [
                  { key: 'APY', value: '3.87%' },
                  { key: 'Weight', value: '0.00 / 20.00%' },
                ],
                linkedFlows: [],
                style: { color: 'gray' },
              },
              {
                title: 'Pool name: Alterscope Cornerstone',
                subItems: [
                  { key: 'APY', value: '3.87%' },
                  { key: 'Weight', value: '0.00 / 20.00%' },
                ],
                linkedFlows: [],
                style: { color: 'gray' },
              },
              {
                title: 'Pool name: Alterscope CASH',
                subItems: [
                  { key: 'APY', value: '3.87%' },
                  { key: 'Weight', value: '0.00 / 20.00%' },
                ],
                linkedFlows: [],
                style: { color: 'gray' },
              },
              {
                title: 'Pool name: Alterscope xSTRK',
                subItems: [
                  { key: 'APY', value: '3.87%' },
                  { key: 'Weight', value: '0.00 / 20.00%' },
                ],
                linkedFlows: [],
                style: { color: 'gray' },
              },
            ],
            style: { backgroundColor: '#6e53dc' },
          },
        ],
      },
      {
        name: 'Ekubo xSTRK/STRK',
        id: 'ekubo_cl_xstrkstrk',
        apy: 0.2250861274873169,
        apySplit: { baseApy: 0.2250861274873169, rewardsApy: 0 },
        depositToken: [
          '0x28d709c875c0ceac3dce7065bec5328186dc89fe254527084d1689910954b0a',
        ],
        leverage: 1,
        contract: [
          {
            name: 'Ekubo xSTRK/STRK',
            address:
              '0x1f083b98674bc21effee29ef443a00c7b9a500fd92cf30341a3da12c73f2324',
          },
        ],
        tvlUsd: 116.1401966610899,
        status: { number: 1, value: 'Hot & New 🔥' },
        riskFactor: 0.875,
        logos: [
          'https://dashboard.endur.fi/endur-fi.svg',
          'https://assets.coingecko.com/coins/images/26433/small/starknet.png',
        ],
        isAudited: true,
        auditUrl:
          'https://assets.strkfarm.com/strkfarm/audit_report_vesu_and_ekubo_strats.pdf',
        actions: [],
        investmentFlows: [
          {
            id: 'base',
            title: 'Your Deposit',
            subItems: [
              { key: 'Net yield', value: '36.71%' },
              { key: 'Performance Fee', value: '10.00%' },
            ],
            linkedFlows: [
              {
                title: 'Ekubo xSTRK/STRK',
                subItems: [{ key: 'Pool', value: '0.01%, 200 tick spacing' }],
                linkedFlows: [],
                style: { backgroundColor: '#35484f' },
              },
            ],
            style: { backgroundColor: '#6e53dc' },
          },
          {
            id: 'rebalance',
            title: 'Automated Rebalance',
            subItems: [{ key: 'Range selection', value: '-200 to 200 ticks' }],
            linkedFlows: [
              {
                title: 'Ekubo xSTRK/STRK',
                subItems: [{ key: 'Pool', value: '0.01%, 200 tick spacing' }],
                linkedFlows: [],
                style: { backgroundColor: '#35484f' },
              },
            ],
            style: { backgroundColor: 'purple' },
          },
        ],
      },
      {
        name: 'xSTRK Sensei',
        id: 'xstrk_sensei',
        apy: 0.2789537137720841,
        apySplit: { baseApy: 0.2789537137720841, rewardsApy: 0 },
        depositToken: [
          '0x4718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d',
        ],
        leverage: 2.4164749547200968,
        contract: [
          {
            name: 'frmDNMMSTRKxSTRK',
            address:
              '0x7023a5cadc8a5db80e4f0fde6b330cbd3c17bbbf9cb145cbabd7bd5e6fb7b0b',
          },
        ],
        tvlUsd: 46290.62976632084,
        status: { number: 3, value: 'Active' },
        riskFactor: 0.75,
        logos: ['/zklend/icons/tokens/strk.svg?w=20'],
        isAudited: false,
        actions: [
          {
            name: 'Stake STRK to Endur',
            protocol: { name: 'Endur', logo: 'https://endur.fi/favicon.ico' },
            token: { name: 'STRK', logo: '/zklend/icons/tokens/strk.svg?w=20' },
            amount: '1000.00',
            isDeposit: true,
            apy: 0.11543828055292038,
          },
          {
            name: "Supply's your xSTRK to Vesu",
            protocol: {
              name: 'Vesu',
              logo: 'https://static-assets-8zct.onrender.com/integrations/vesu/logo.png',
            },
            token: {
              name: 'xSTRK (Re7 xSTRK)',
              logo: '/imagedelivery/c1f44170-c1b0-4531-3d3b-5f0bacfe1300/logo',
            },
            amount: '1000.00',
            isDeposit: true,
            apy: 0.025260354362073953,
          },
          {
            name: 'Borrow STRK from Vesu',
            protocol: {
              name: 'Vesu',
              logo: 'https://static-assets-8zct.onrender.com/integrations/vesu/logo.png',
            },
            token: {
              name: 'STRK (Re7 xSTRK)',
              logo: '/zklend/icons/tokens/strk.svg?w=20',
            },
            amount: '725.00',
            isDeposit: false,
            apy: -0.079453,
          },
          {
            name: 'Loop back to step 1, repeat 3 more times',
            protocol: {
              name: 'Vesu',
              logo: 'https://static-assets-8zct.onrender.com/integrations/vesu/logo.png',
            },
            token: {
              name: 'STRK (Re7 xSTRK)',
              logo: '/zklend/icons/tokens/strk.svg?w=20',
            },
            amount: '541.1958750000001',
            isDeposit: true,
            apy: 0.3021643996908885,
          },
          {
            name: 'Re-invest your STRK Rewards every 7 days (Compound)',
            protocol: { name: 'Endur', logo: 'https://endur.fi/favicon.ico' },
            token: { name: 'STRK', logo: '/zklend/icons/tokens/strk.svg?w=20' },
            amount: '1000.00',
            isDeposit: true,
            apy: 0.03232837717252962,
          },
        ],
        investmentFlows: [],
      },
      {
        name: 'Auto Compounding STRK',
        id: 'auto_token_strk',
        apy: 0,
        apySplit: { baseApy: 0, rewardsApy: 0 },
        depositToken: [
          '0x4718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d',
          '0x6d8fa671ef84f791b7f601fa79fea8f6ceb70b5fa84189e3159d532162efc21',
        ],
        leverage: 0,
        contract: [
          {
            name: 'frmzSTRK',
            address:
              '0x541681b9ad63dff1b35f79c78d8477f64857de29a27902f7298f7b620838ea',
          },
        ],
        tvlUsd: 0,
        status: { number: 5, value: 'Retired' },
        riskFactor: 0.5,
        logos: [''],
        isAudited: false,
        actions: [],
        investmentFlows: [],
      },
      {
        name: 'Auto Compounding USDC',
        id: 'auto_token_usdc',
        apy: 0,
        apySplit: { baseApy: 0, rewardsApy: 0 },
        depositToken: [
          '0x53c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8',
          '0x47ad51726d891f972e74e4ad858a261b43869f7126ce7436ee0b2529a98f486',
        ],
        leverage: 0,
        contract: [
          {
            name: 'frmzUSDC',
            address:
              '0x16912b22d5696e95ffde888ede4bd69fbbc60c5f873082857a47c543172694f',
          },
        ],
        tvlUsd: 0,
        status: { number: 5, value: 'Retired' },
        riskFactor: 0.5,
        logos: [''],
        isAudited: false,
        actions: [],
        investmentFlows: [],
      },
      {
        name: 'USDC Sensei',
        id: 'usdc_sensei',
        apy: 0,
        apySplit: { baseApy: 0, rewardsApy: 0 },
        depositToken: [
          '0x53c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8',
        ],
        leverage: 0,
        contract: [
          {
            name: 'frmDNMMUSDCETH',
            address:
              '0x04937b58e05a3a2477402d1f74e66686f58a61a5070fcc6f694fb9a0b3bae422',
          },
        ],
        tvlUsd: 0,
        status: { number: 5, value: 'Retired' },
        riskFactor: 0.75,
        logos: ['/zklend/icons/tokens/strk.svg?w=20'],
        isAudited: false,
        actions: [],
        investmentFlows: [],
      },
      {
        name: 'ETH Sensei',
        id: 'eth_sensei',
        apy: 0,
        apySplit: { baseApy: 0, rewardsApy: 0 },
        depositToken: [
          '0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
        ],
        leverage: 0,
        contract: [
          {
            name: 'frmDNMMETHUSDC',
            address:
              '0x9d23d9b1fa0db8c9d75a1df924c3820e594fc4ab1475695889286f3f6df250',
          },
        ],
        tvlUsd: 0,
        status: { number: 5, value: 'Retired' },
        riskFactor: 0.75,
        logos: ['/zklend/icons/tokens/strk.svg?w=20'],
        isAudited: false,
        actions: [],
        investmentFlows: [],
      },
      {
        name: 'STRK Sensei',
        id: 'strk_sensei',
        apy: 0,
        apySplit: { baseApy: 0, rewardsApy: 0 },
        depositToken: [
          '0x4718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d',
        ],
        leverage: 0,
        contract: [
          {
            name: 'frmDNMMSTRKETH',
            address:
              '0x20d5fc4c9df4f943ebb36078e703369c04176ed00accf290e8295b659d2cea6',
          },
        ],
        tvlUsd: 0,
        status: { number: 5, value: 'Retired' },
        riskFactor: 0.75,
        logos: ['/zklend/icons/tokens/strk.svg?w=20'],
        isAudited: false,
        actions: [],
        investmentFlows: [],
      },
      {
        name: 'ETH Sensei XL',
        id: 'eth_sensei_xl',
        apy: 0,
        apySplit: { baseApy: 0, rewardsApy: 0 },
        depositToken: [
          '0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
        ],
        leverage: 0,
        contract: [
          {
            name: 'frmDNMMETHUSDC2',
            address:
              '0x9140757f8fb5748379be582be39d6daf704cc3a0408882c0d57981a885eed9',
          },
        ],
        tvlUsd: 0,
        status: { number: 5, value: 'Retired' },
        riskFactor: 0.75,
        logos: ['/zklend/icons/tokens/strk.svg?w=20'],
        isAudited: false,
        actions: [],
        investmentFlows: [],
      },
    ],
    lastUpdated: '2025-04-06T18:52:26.899Z',
  });
}
