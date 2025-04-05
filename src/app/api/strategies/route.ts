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

export const revalidate = 3600; // 1 hr

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
    return NextResponse.json({
      status: true,
      strategies: stratsData,
    });
  } catch (err) {
    console.error('Error /api/strategies', err);
    return NextResponse.json({
      status: false,
      strategies: [],
    });
  }
}

// export async function GETTT() {
//   return NextResponse.json({
//     status: true,
//     strategies: [
//       {
//         name: 'Vesu Fusion STRK',
//         id: 'vesu_fusion_strk',
//         apy: 0.09792071607840036,
//         depositToken: [
//           '0x4718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d',
//         ],
//         leverage: 1,
//         contract: [
//           {
//             name: 'STRK',
//             address:
//               '0x7fb5bcb8525954a60fde4e8fb8220477696ce7117ef264775a1770e23571929',
//           },
//         ],
//         tvlUsd: 239.321076172105,
//         status: { number: 1, value: 'Hot & New 🔥' },
//         riskFactor: 0.75,
//         logos: [
//           'https://assets.coingecko.com/coins/images/26433/small/starknet.png',
//         ],
//         isAudited: true,
//         auditUrl:
//           'https://assets.strkfarm.com/strkfarm/audit_report_vesu_and_ekubo_strats.pdf',
//         actions: [],
//         investmentFlows: [
//           {
//             title: 'Your Deposit',
//             subItems: [
//               { key: 'Net yield', value: '9.79%' },
//               { key: 'Performance Fee', value: '10.00%' },
//             ],
//             linkedFlows: [
//               {
//                 title: 'Pool name: Re7 xSTRK',
//                 subItems: [
//                   { key: 'APY', value: '11.01%' },
//                   { key: 'Weight', value: '98.00 / 100.00%' },
//                 ],
//                 linkedFlows: [],
//                 style: { backgroundColor: '#35484f' },
//               },
//               {
//                 title: 'Pool name: Genesis',
//                 subItems: [
//                   { key: 'APY', value: '4.32%' },
//                   { key: 'Weight', value: '2.00 / 100.00%' },
//                 ],
//                 linkedFlows: [],
//                 style: { backgroundColor: '#35484f' },
//               },
//               {
//                 title: 'Pool name: Re7 USDC',
//                 subItems: [
//                   { key: 'APY', value: '4.32%' },
//                   { key: 'Weight', value: '0.00 / 100.00%' },
//                 ],
//                 linkedFlows: [],
//                 style: { color: 'gray' },
//               },
//               {
//                 title: 'Pool name: Re7 Starknet Ecosystem',
//                 subItems: [
//                   { key: 'APY', value: '4.32%' },
//                   { key: 'Weight', value: '0.00 / 100.00%' },
//                 ],
//                 linkedFlows: [],
//                 style: { color: 'gray' },
//               },
//               {
//                 title: 'Pool name: Alterscope wstETH',
//                 subItems: [
//                   { key: 'APY', value: '4.32%' },
//                   { key: 'Weight', value: '0.00 / 20.00%' },
//                 ],
//                 linkedFlows: [],
//                 style: { color: 'gray' },
//               },
//               {
//                 title: 'Pool name: Alterscope Cornerstone',
//                 subItems: [
//                   { key: 'APY', value: '4.32%' },
//                   { key: 'Weight', value: '0.00 / 20.00%' },
//                 ],
//                 linkedFlows: [],
//                 style: { color: 'gray' },
//               },
//               {
//                 title: 'Pool name: Alterscope CASH',
//                 subItems: [
//                   { key: 'APY', value: '4.32%' },
//                   { key: 'Weight', value: '0.00 / 20.00%' },
//                 ],
//                 linkedFlows: [],
//                 style: { color: 'gray' },
//               },
//               {
//                 title: 'Pool name: Alterscope xSTRK',
//                 subItems: [
//                   { key: 'APY', value: '4.32%' },
//                   { key: 'Weight', value: '0.00 / 20.00%' },
//                 ],
//                 linkedFlows: [],
//                 style: { color: 'gray' },
//               },
//               {
//                 title: 'Pool name: Re7 rUSDC',
//                 subItems: [
//                   { key: 'APY', value: '4.32%' },
//                   { key: 'Weight', value: '0.00 / 100.00%' },
//                 ],
//                 linkedFlows: [],
//                 style: { color: 'gray' },
//               },
//             ],
//             style: { backgroundColor: '#6e53dc' },
//           },
//         ],
//       },
//       {
//         name: 'Vesu Fusion USDC',
//         id: 'vesu_fusion_usdc',
//         apy: 0.0849054883852517,
//         depositToken: [
//           '0x53c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8',
//         ],
//         leverage: 1,
//         contract: [
//           {
//             name: 'USDC',
//             address:
//               '0xa858c97e9454f407d1bd7c57472fc8d8d8449a777c822b41d18e387816f29c',
//           },
//         ],
//         tvlUsd: 1006.076823806659,
//         status: { number: 1, value: 'Hot & New 🔥' },
//         riskFactor: 0.75,
//         logos: [
//           'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png',
//         ],
//         isAudited: true,
//         auditUrl:
//           'https://assets.strkfarm.com/strkfarm/audit_report_vesu_and_ekubo_strats.pdf',
//         actions: [],
//         investmentFlows: [
//           {
//             title: 'Your Deposit',
//             subItems: [
//               { key: 'Net yield', value: '8.49%' },
//               { key: 'Performance Fee', value: '10.00%' },
//             ],
//             linkedFlows: [
//               {
//                 title: 'Pool name: Re7 Starknet Ecosystem',
//                 subItems: [
//                   { key: 'APY', value: '9.55%' },
//                   { key: 'Weight', value: '97.81 / 100.00%' },
//                 ],
//                 linkedFlows: [],
//                 style: { backgroundColor: '#35484f' },
//               },
//               {
//                 title: 'Pool name: Re7 USDC',
//                 subItems: [
//                   { key: 'APY', value: '4.36%' },
//                   { key: 'Weight', value: '1.99 / 100.00%' },
//                 ],
//                 linkedFlows: [],
//                 style: { backgroundColor: '#35484f' },
//               },
//               {
//                 title: 'Pool name: Genesis',
//                 subItems: [
//                   { key: 'APY', value: '3.95%' },
//                   { key: 'Weight', value: '0.20 / 100.00%' },
//                 ],
//                 linkedFlows: [],
//                 style: { backgroundColor: '#35484f' },
//               },
//               {
//                 title: 'Pool name: Alterscope wstETH',
//                 subItems: [
//                   { key: 'APY', value: '3.85%' },
//                   { key: 'Weight', value: '0.00 / 20.00%' },
//                 ],
//                 linkedFlows: [],
//                 style: { color: 'gray' },
//               },
//               {
//                 title: 'Pool name: Alterscope Cornerstone',
//                 subItems: [
//                   { key: 'APY', value: '3.85%' },
//                   { key: 'Weight', value: '0.00 / 20.00%' },
//                 ],
//                 linkedFlows: [],
//                 style: { color: 'gray' },
//               },
//               {
//                 title: 'Pool name: Alterscope CASH',
//                 subItems: [
//                   { key: 'APY', value: '3.85%' },
//                   { key: 'Weight', value: '0.00 / 20.00%' },
//                 ],
//                 linkedFlows: [],
//                 style: { color: 'gray' },
//               },
//               {
//                 title: 'Pool name: Alterscope xSTRK',
//                 subItems: [
//                   { key: 'APY', value: '3.85%' },
//                   { key: 'Weight', value: '0.00 / 20.00%' },
//                 ],
//                 linkedFlows: [],
//                 style: { color: 'gray' },
//               },
//               {
//                 title: 'Pool name: Re7 rUSDC',
//                 subItems: [
//                   { key: 'APY', value: '3.85%' },
//                   { key: 'Weight', value: '0.00 / 100.00%' },
//                 ],
//                 linkedFlows: [],
//                 style: { color: 'gray' },
//               },
//             ],
//             style: { backgroundColor: '#6e53dc' },
//           },
//         ],
//       },
//       {
//         name: 'Vesu Fusion ETH',
//         id: 'vesu_fusion_eth',
//         apy: 0.047693629534058146,
//         depositToken: [
//           '0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
//         ],
//         leverage: 1,
//         contract: [
//           {
//             name: 'ETH',
//             address:
//               '0x5eaf5ee75231cecf79921ff8ded4b5ffe96be718bcb3daf206690ad1a9ad0ca',
//           },
//         ],
//         tvlUsd: 123.41689619165199,
//         status: { number: 1, value: 'Hot & New 🔥' },
//         riskFactor: 0.75,
//         logos: ['https://opbnb.bscscan.com/token/images/ether.svg'],
//         isAudited: true,
//         auditUrl:
//           'https://assets.strkfarm.com/strkfarm/audit_report_vesu_and_ekubo_strats.pdf',
//         actions: [],
//         investmentFlows: [
//           {
//             title: 'Your Deposit',
//             subItems: [
//               { key: 'Net yield', value: '4.77%' },
//               { key: 'Performance Fee', value: '10.00%' },
//             ],
//             linkedFlows: [
//               {
//                 title: 'Pool name: Re7 wstETH',
//                 subItems: [
//                   { key: 'APY', value: '5.31%' },
//                   { key: 'Weight', value: '98.00 / 100.00%' },
//                 ],
//                 linkedFlows: [],
//                 style: { backgroundColor: '#35484f' },
//               },
//               {
//                 title: 'Pool name: Genesis',
//                 subItems: [
//                   { key: 'APY', value: '4.92%' },
//                   { key: 'Weight', value: '2.00 / 100.00%' },
//                 ],
//                 linkedFlows: [],
//                 style: { backgroundColor: '#35484f' },
//               },
//               {
//                 title: 'Pool name: Re7 USDC',
//                 subItems: [
//                   { key: 'APY', value: '4.82%' },
//                   { key: 'Weight', value: '0.00 / 100.00%' },
//                 ],
//                 linkedFlows: [],
//                 style: { color: 'gray' },
//               },
//               {
//                 title: 'Pool name: Alterscope wstETH',
//                 subItems: [
//                   { key: 'APY', value: '4.82%' },
//                   { key: 'Weight', value: '0.00 / 20.00%' },
//                 ],
//                 linkedFlows: [],
//                 style: { color: 'gray' },
//               },
//               {
//                 title: 'Pool name: Alterscope Cornerstone',
//                 subItems: [
//                   { key: 'APY', value: '4.82%' },
//                   { key: 'Weight', value: '0.00 / 20.00%' },
//                 ],
//                 linkedFlows: [],
//                 style: { color: 'gray' },
//               },
//               {
//                 title: 'Pool name: Alterscope CASH',
//                 subItems: [
//                   { key: 'APY', value: '4.82%' },
//                   { key: 'Weight', value: '0.00 / 20.00%' },
//                 ],
//                 linkedFlows: [],
//                 style: { color: 'gray' },
//               },
//               {
//                 title: 'Pool name: Alterscope xSTRK',
//                 subItems: [
//                   { key: 'APY', value: '4.82%' },
//                   { key: 'Weight', value: '0.00 / 20.00%' },
//                 ],
//                 linkedFlows: [],
//                 style: { color: 'gray' },
//               },
//               {
//                 title: 'Pool name: Re7 rUSDC',
//                 subItems: [
//                   { key: 'APY', value: '4.82%' },
//                   { key: 'Weight', value: '0.00 / 100.00%' },
//                 ],
//                 linkedFlows: [],
//                 style: { color: 'gray' },
//               },
//             ],
//             style: { backgroundColor: '#6e53dc' },
//           },
//         ],
//       },
//       {
//         name: 'Vesu Fusion USDT',
//         id: 'vesu_fusion_usdt',
//         apy: 0.035171100000000004,
//         depositToken: [
//           '0x68f5c6a61780768455de69077e07e89787839bf8166decfbf92b645209c0fb8',
//         ],
//         leverage: 1,
//         contract: [
//           {
//             name: 'USDT',
//             address:
//               '0x115e94e722cfc4c77a2f15c4aefb0928c1c0029e5a57570df24c650cb7cec2c',
//           },
//         ],
//         tvlUsd: 2.000052,
//         status: { number: 1, value: 'Hot & New 🔥' },
//         riskFactor: 0.75,
//         logos: [
//           'https://assets.coingecko.com/coins/images/325/small/Tether.png',
//         ],
//         isAudited: true,
//         auditUrl:
//           'https://assets.strkfarm.com/strkfarm/audit_report_vesu_and_ekubo_strats.pdf',
//         actions: [],
//         investmentFlows: [
//           {
//             title: 'Your Deposit',
//             subItems: [
//               { key: 'Net yield', value: '3.52%' },
//               { key: 'Performance Fee', value: '10.00%' },
//             ],
//             linkedFlows: [
//               {
//                 title: 'Pool name: Genesis',
//                 subItems: [
//                   { key: 'APY', value: '3.91%' },
//                   { key: 'Weight', value: '100.00 / 100.00%' },
//                 ],
//                 linkedFlows: [],
//                 style: { backgroundColor: '#35484f' },
//               },
//               {
//                 title: 'Pool name: Alterscope wstETH',
//                 subItems: [
//                   { key: 'APY', value: '3.84%' },
//                   { key: 'Weight', value: '0.00 / 20.00%' },
//                 ],
//                 linkedFlows: [],
//                 style: { color: 'gray' },
//               },
//               {
//                 title: 'Pool name: Alterscope Cornerstone',
//                 subItems: [
//                   { key: 'APY', value: '3.84%' },
//                   { key: 'Weight', value: '0.00 / 20.00%' },
//                 ],
//                 linkedFlows: [],
//                 style: { color: 'gray' },
//               },
//               {
//                 title: 'Pool name: Alterscope CASH',
//                 subItems: [
//                   { key: 'APY', value: '3.84%' },
//                   { key: 'Weight', value: '0.00 / 20.00%' },
//                 ],
//                 linkedFlows: [],
//                 style: { color: 'gray' },
//               },
//               {
//                 title: 'Pool name: Alterscope xSTRK',
//                 subItems: [
//                   { key: 'APY', value: '3.84%' },
//                   { key: 'Weight', value: '0.00 / 20.00%' },
//                 ],
//                 linkedFlows: [],
//                 style: { color: 'gray' },
//               },
//             ],
//             style: { backgroundColor: '#6e53dc' },
//           },
//         ],
//       },
//       {
//         name: 'Ekubo xSTRK/STRK',
//         id: 'ekubo_cl_xstrkstrk',
//         apy: 1.1308996660059625,
//         depositToken: [
//           '0x28d709c875c0ceac3dce7065bec5328186dc89fe254527084d1689910954b0a',
//         ],
//         leverage: 1,
//         contract: [
//           {
//             name: 'Ekubo xSTRK/STRK',
//             address:
//               '0x1f083b98674bc21effee29ef443a00c7b9a500fd92cf30341a3da12c73f2324',
//           },
//         ],
//         tvlUsd: 20.53792646308871,
//         status: { number: 1, value: 'Hot & New 🔥' },
//         riskFactor: 0.875,
//         logos: [
//           'https://dashboard.endur.fi/endur-fi.svg',
//           'https://assets.coingecko.com/coins/images/26433/small/starknet.png',
//         ],
//         isAudited: true,
//         auditUrl:
//           'https://assets.strkfarm.com/strkfarm/audit_report_vesu_and_ekubo_strats.pdf',
//         actions: [],
//         investmentFlows: [
//           {
//             id: 'base',
//             title: 'Your Deposit',
//             subItems: [
//               { key: 'Net yield', value: '50.23%' },
//               { key: 'Performance Fee', value: '10.00%' },
//             ],
//             linkedFlows: [
//               {
//                 title: 'Ekubo xSTRK/STRK',
//                 subItems: [{ key: 'Pool', value: '0.01%, 200 tick spacing' }],
//                 linkedFlows: [],
//                 style: { backgroundColor: '#35484f' },
//               },
//             ],
//             style: { backgroundColor: '#6e53dc' },
//           },
//           {
//             id: 'rebalance',
//             title: 'Automated Rebalance',
//             subItems: [{ key: 'Range selection', value: '-200 to 200 ticks' }],
//             linkedFlows: [
//               {
//                 title: 'Ekubo xSTRK/STRK',
//                 subItems: [{ key: 'Pool', value: '0.01%, 200 tick spacing' }],
//                 linkedFlows: [],
//                 style: { backgroundColor: '#35484f' },
//               },
//             ],
//             style: { backgroundColor: 'purple' },
//           },
//         ],
//       },
//       {
//         name: 'xSTRK Sensei',
//         id: 'xstrk_sensei',
//         apy: 0.27397975107434713,
//         depositToken: [
//           '0x4718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d',
//         ],
//         leverage: 2.374827546066231,
//         contract: [
//           {
//             name: 'frmDNMMSTRKxSTRK',
//             address:
//               '0x7023a5cadc8a5db80e4f0fde6b330cbd3c17bbbf9cb145cbabd7bd5e6fb7b0b',
//           },
//         ],
//         tvlUsd: 51663.98830321935,
//         status: { number: 3, value: 'Active' },
//         riskFactor: 0.75,
//         logos: [''],
//         isAudited: false,
//         actions: [
//           {
//             name: 'Stake STRK to Endur',
//             protocol: { name: 'Endur', logo: 'https://endur.fi/favicon.ico' },
//             token: { name: 'STRK', logo: '/zklend/icons/tokens/strk.svg?w=20' },
//             amount: '1000.00',
//             isDeposit: true,
//             apy: 0.11536827233126012,
//           },
//           {
//             name: "Supply's your xSTRK to Vesu",
//             protocol: {
//               name: 'Vesu',
//               logo: 'https://static-assets-8zct.onrender.com/integrations/vesu/logo.png',
//             },
//             token: {
//               name: 'xSTRK (Re7 xSTRK)',
//               logo: '/imagedelivery/c1f44170-c1b0-4531-3d3b-5f0bacfe1300/logo',
//             },
//             amount: '1000.00',
//             isDeposit: true,
//             apy: 0.025090809515230683,
//           },
//           {
//             name: 'Borrow STRK from Vesu',
//             protocol: {
//               name: 'Vesu',
//               logo: 'https://static-assets-8zct.onrender.com/integrations/vesu/logo.png',
//             },
//             token: {
//               name: 'STRK (Re7 xSTRK)',
//               logo: '/zklend/icons/tokens/strk.svg?w=20',
//             },
//             amount: '725.00',
//             isDeposit: false,
//             apy: -0.080942,
//           },
//           {
//             name: 'Loop back to step 1, repeat 3 more times',
//             protocol: {
//               name: 'Vesu',
//               logo: 'https://static-assets-8zct.onrender.com/integrations/vesu/logo.png',
//             },
//             token: {
//               name: 'STRK (Re7 xSTRK)',
//               logo: '/zklend/icons/tokens/strk.svg?w=20',
//             },
//             amount: '541.1958750000001',
//             isDeposit: true,
//             apy: 0.2973677521690575,
//           },
//           {
//             name: 'Re-invest your STRK Rewards every 7 days (Compound)',
//             protocol: { name: 'Endur', logo: 'https://endur.fi/favicon.ico' },
//             token: { name: 'STRK', logo: '/zklend/icons/tokens/strk.svg?w=20' },
//             amount: '1000.00',
//             isDeposit: true,
//             apy: 0.03126941839594008,
//           },
//         ],
//         investmentFlows: [],
//       },
//     ],
//   });
// }
