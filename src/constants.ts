import { constants, RpcProvider } from 'starknet';
import { NFTInfo, TokenInfo } from './strategies/IStrategy';
import { getEndpoint, standariseAddress } from './utils';
import MyNumber from './utils/MyNumber';

const LOGOS = {
  USDT: '/zklend/icons/tokens/usdt.svg?w=20',
  USDC: '/zklend/icons/tokens/usdc.svg?w=20',
  WBTC: '/zklend/icons/tokens/wbtc.svg?w=20',
  tBTC: '/zklend/icons/tokens/wbtc.svg?w=20',
  ETH: '/zklend/icons/tokens/eth.svg?w=20',
  STRK: '/zklend/icons/tokens/strk.svg?w=20',
  DAI: '/zklend/icons/tokens/dai.svg?w=20',
  kSTRK: '/zklend/icons/tokens/kstrk.svg?w=20',
  xSTRK: '/imagedelivery/c1f44170-c1b0-4531-3d3b-5f0bacfe1300/logo',
};

export type TokenName =
  | 'USDT'
  | 'USDC'
  | 'ETH'
  | 'STRK'
  | 'WBTC'
  | 'tBTC'
  | 'DAI'
  | 'kSTRK'
  | 'xSTRK';

export const CONSTANTS = {
  DEX_INCENTIVE_URL:
    'https://kx58j6x5me.execute-api.us-east-1.amazonaws.com/starknet/fetchFile?file=strk_grant.json',
  NOSTRA_DEGEN_INCENTIVE_URL: 'https://api.nostra.finance/query/pool_aprs',
  CARMINE_INCENTIVES_URL: '/carmine/api/v1/mainnet/defispring',
  CARMINE_URL: '/carmine/api/v2/mainnet',
  LENDING_INCENTIVES_URL:
    'https://kx58j6x5me.execute-api.us-east-1.amazonaws.com/starknet/fetchFile?file=prod-api/lending/lending_strk_grant.json',
  LOGOS,
  COMMUNITY_TG: 'https://t.me/+HQ_eHaXmF-1lZDc1',
  NOSTRA: {
    LENDING_GRAPH_URL: '/nostra/app/data-yqlpb/endpoint/data/v1/action/find',
  },
  ZKLEND: {
    BASE_APR_API: '/zklend/api/pools',
  },
  NIMBORA: {
    DEX_APR_API: '/nimbora/yield-dex/strategies',
    STAKING_APR_API: '/nimbora/staking/strategy',
  },
  JEDI: {
    BASE_API: '/jediswap/graphql',
  },
  EKUBO: {
    CLAIMS_URL:
      '/ekubo/airdrops/{{address}}?token=0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d',
    BASE_API: '/ekubo',
  },
  HAIKO: {
    BASE_APR_API: '/haiko/markets?network=mainnet',
  },
  STRKFarm: {
    BASE_APR_API: '/api/strategies',
    // BASE_APR_API: 'https://app.strkfarm.com/api/strategies',
  },
  MY_SWAP: {
    POOLS_API: '/myswap/data/pools/all.json',
    BASE_APR_API: '/myswap/data/pools',
  },
  CONTRACTS: {
    Master: '0x50314707690c31597849ed66a494fb4279dc060f8805f21593f52906846e28e',
    AutoStrkFarm:
      '0x541681b9ad63dff1b35f79c78d8477f64857de29a27902f7298f7b620838ea',
    AutoUsdcFarm:
      '0x16912b22d5696e95ffde888ede4bd69fbbc60c5f873082857a47c543172694f',
    AutoxSTRKFarm:
      '0x2102068cf222a37076b9e322c6428cb9e7110591c8df8a733df2110fdb0c329',
    DeltaNeutralMMUSDCETH:
      '0x04937b58e05a3a2477402d1f74e66686f58a61a5070fcc6f694fb9a0b3bae422',
    DeltaNeutralMMSTRKETH:
      '0x20d5fc4c9df4f943ebb36078e703369c04176ed00accf290e8295b659d2cea6',
    DeltaNeutralMMETHUSDC:
      '0x9d23d9b1fa0db8c9d75a1df924c3820e594fc4ab1475695889286f3f6df250',
    DeltaNeutralMMETHUSDCXL:
      '0x9140757f8fb5748379be582be39d6daf704cc3a0408882c0d57981a885eed9',
    DeltaNeutralxSTRKSTRKXL:
      '0x7023a5cadc8a5db80e4f0fde6b330cbd3c17bbbf9cb145cbabd7bd5e6fb7b0b',
  },
  MOBILE_MSG: 'Desktop/Tablet only',
};

export const TOKENS: TokenInfo[] = [
  {
    token: '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
    name: 'ETH',
    decimals: 18,
    displayDecimals: 4,
    logo: CONSTANTS.LOGOS.ETH,
    minAmount: MyNumber.fromEther('10', 18),
    maxAmount: MyNumber.fromEther('10000', 18),
    stepAmount: MyNumber.fromEther('10', 18),
    isERC4626: false,
  },
  {
    token: standariseAddress(
      '0x4718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d',
    ),
    name: 'STRK',
    decimals: 18,
    displayDecimals: 2,
    logo: CONSTANTS.LOGOS.STRK,
    minAmount: MyNumber.fromEther('10', 18),
    maxAmount: MyNumber.fromEther('10000', 18),
    stepAmount: MyNumber.fromEther('10', 18),
    isERC4626: false,
  },
  {
    token: standariseAddress(
      '0x03fe2b97c1fd336e750087d68b9b867997fd64a2661ff3ca5a7c771641e8e7ac',
    ),
    name: 'WBTC',
    decimals: 8,
    displayDecimals: 2,
    logo: CONSTANTS.LOGOS.WBTC,
    minAmount: MyNumber.fromEther('0.00001', 8),
    maxAmount: MyNumber.fromEther('10000', 8),
    stepAmount: MyNumber.fromEther('0.00001', 8),
    isERC4626: false,
  },
  {
    token: standariseAddress(
      '0x04daa17763b286d1e59b97c283c0b8c949994c361e426a28f743c67bdfe9a32f',
    ),
    name: 'tBTC',
    decimals: 18,
    displayDecimals: 2,
    logo: CONSTANTS.LOGOS.WBTC,
    minAmount: MyNumber.fromEther('0.00001', 18),
    maxAmount: MyNumber.fromEther('10000', 18),
    stepAmount: MyNumber.fromEther('0.00001', 18),
    isERC4626: false,
  },
  // ! todo change this
  {
    token: standariseAddress(
      '0x28d709c875c0ceac3dce7065bec5328186dc89fe254527084d1689910954b0a',
    ),
    name: 'xSTRK',
    decimals: 18,
    displayDecimals: 2,
    logo: CONSTANTS.LOGOS.xSTRK,
    minAmount: MyNumber.fromEther('10', 18),
    maxAmount: MyNumber.fromEther('10000', 18),
    stepAmount: MyNumber.fromEther('10', 18),
    isERC4626: false,
  },
  {
    token: '0x06d8fa671ef84f791b7f601fa79fea8f6ceb70b5fa84189e3159d532162efc21',
    name: 'zSTRK',
    decimals: 18,
    displayDecimals: 2,
    logo: CONSTANTS.LOGOS.STRK,
    minAmount: MyNumber.fromEther('10', 18),
    maxAmount: MyNumber.fromEther('10000', 18),
    stepAmount: MyNumber.fromEther('10', 18),
    isERC4626: false,
  },
  {
    token: '0x057146f6409deb4c9fa12866915dd952aa07c1eb2752e451d7f3b042086bdeb8',
    name: 'iETH-c', // nostra eth collateral
    decimals: 18,
    displayDecimals: 2,
    logo: CONSTANTS.LOGOS.ETH,
    minAmount: MyNumber.fromEther('10', 18),
    maxAmount: MyNumber.fromEther('10000', 18),
    stepAmount: MyNumber.fromEther('10', 18),
    isERC4626: false,
  },
  {
    token: '0x1b5bd713e72fdc5d63ffd83762f81297f6175a5e0a4771cdadbc1dd5fe72cb1',
    name: 'zETH',
    decimals: 18,
    displayDecimals: 4,
    logo: CONSTANTS.LOGOS.ETH,
    minAmount: MyNumber.fromEther('0.001', 18),
    maxAmount: MyNumber.fromEther('10000', 18),
    stepAmount: MyNumber.fromEther('0.0001', 18),
    isERC4626: false,
  },
  {
    token: CONSTANTS.CONTRACTS.AutoStrkFarm,
    name: 'frmzSTRK',
    decimals: 18,
    displayDecimals: 2,
    logo: CONSTANTS.LOGOS.STRK,
    minAmount: MyNumber.fromEther('10', 18),
    maxAmount: MyNumber.fromEther('10000', 18),
    stepAmount: MyNumber.fromEther('10', 18),
    isERC4626: true,
  },
  {
    token: '0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8',
    name: 'USDC',
    decimals: 6,
    displayDecimals: 2,
    logo: CONSTANTS.LOGOS.USDC,
    minAmount: MyNumber.fromEther('10', 6),
    maxAmount: MyNumber.fromEther('10000', 6),
    stepAmount: MyNumber.fromEther('10', 6),
    isERC4626: false,
  },
  {
    token: '0x068f5c6a61780768455de69077e07e89787839bf8166decfbf92b645209c0fb8',
    name: 'USDT',
    decimals: 6,
    displayDecimals: 2,
    logo: CONSTANTS.LOGOS.USDT,
    minAmount: MyNumber.fromEther('10', 6),
    maxAmount: MyNumber.fromEther('10000', 6),
    stepAmount: MyNumber.fromEther('10', 6),
    isERC4626: false,
  },
  {
    token: '0x047ad51726d891f972e74e4ad858a261b43869f7126ce7436ee0b2529a98f486',
    name: 'zUSDC',
    decimals: 6,
    displayDecimals: 2,
    logo: CONSTANTS.LOGOS.USDC,
    minAmount: MyNumber.fromEther('10', 6),
    maxAmount: MyNumber.fromEther('10000', 6),
    stepAmount: MyNumber.fromEther('10', 6),
    isERC4626: false,
  },
  {
    token: CONSTANTS.CONTRACTS.AutoUsdcFarm,
    name: 'frmzUSDC',
    decimals: 6,
    displayDecimals: 2,
    logo: CONSTANTS.LOGOS.USDC,
    minAmount: MyNumber.fromEther('10', 6),
    maxAmount: MyNumber.fromEther('10000', 6),
    stepAmount: MyNumber.fromEther('10', 6),
    isERC4626: true,
  },
  {
    token: CONSTANTS.CONTRACTS.AutoxSTRKFarm,
    name: 'frmxSTRK',
    decimals: 18,
    displayDecimals: 2,
    logo: CONSTANTS.LOGOS.xSTRK,
    minAmount: MyNumber.fromEther('0.01', 18),
    maxAmount: MyNumber.fromEther('10000', 18),
    stepAmount: MyNumber.fromEther('0.01', 18),
    isERC4626: true,
  },
  {
    token: standariseAddress(
      '0x045cd05ee2caaac3459b87e5e2480099d201be2f62243f839f00e10dde7f500c',
    ),
    name: 'kSTRK',
    decimals: 18,
    displayDecimals: 2,
    logo: CONSTANTS.LOGOS.STRK,
    minAmount: MyNumber.fromEther('10', 18),
    maxAmount: MyNumber.fromEther('10000', 18),
    stepAmount: MyNumber.fromEther('10', 18),
    isERC4626: false,
  },
];

export const NFTS: NFTInfo[] = [
  {
    name: 'frmDNMMUSDCETH',
    address: CONSTANTS.CONTRACTS.DeltaNeutralMMUSDCETH,
    logo: CONSTANTS.LOGOS.USDC,
    config: {
      mainTokenName: 'USDC',
    },
  },
  {
    name: 'frmDNMMSTRKETH',
    address: CONSTANTS.CONTRACTS.DeltaNeutralMMSTRKETH,
    logo: CONSTANTS.LOGOS.STRK,
    config: {
      mainTokenName: 'STRK',
    },
  },
  {
    name: 'frmDNMMETHUSDC',
    address: CONSTANTS.CONTRACTS.DeltaNeutralMMETHUSDC,
    logo: CONSTANTS.LOGOS.ETH,
    config: {
      mainTokenName: 'ETH',
    },
  },
  {
    name: 'frmDNMMETHUSDC2',
    address: CONSTANTS.CONTRACTS.DeltaNeutralMMETHUSDCXL,
    logo: CONSTANTS.LOGOS.ETH,
    config: {
      mainTokenName: 'ETH',
    },
  },
  {
    name: 'frmDNMMSTRKxSTRK',
    address: CONSTANTS.CONTRACTS.DeltaNeutralxSTRKSTRKXL,
    logo: CONSTANTS.LOGOS.STRK,
    config: {
      mainTokenName: 'STRK',
    },
  },
];

function getNetwork(): constants.StarknetChainId {
  if (process.env.NEXT_PUBLIC_NETWORK == 'sepolia') {
    return constants.StarknetChainId.SN_SEPOLIA;
  }
  return constants.StarknetChainId.SN_MAIN;
}

export const provider = new RpcProvider({
  nodeUrl: process.env.NEXT_PUBLIC_RPC_URL,
});

// ? When updating this, ensure there is redirect available for this route
// ? to respect version of doc in github
export const LATEST_TNC_DOC_VERSION = 'tnc/v1';
export const TnC_DOC_URL = `${getEndpoint()}/${LATEST_TNC_DOC_VERSION}`;
export const SIGNING_DATA = {
  types: {
    StarkNetDomain: [
      { name: 'name', type: 'felt' },
      { name: 'version', type: 'felt' },
      { name: 'chainId', type: 'felt' },
    ],
    Tnc: [
      { name: 'message', type: 'felt' },
      { name: 'document', type: 'felt' },
    ],
  },
  primaryType: 'Tnc',
  domain: {
    name: 'STRKFarm',
    version: '1',
    chainId: getNetwork(),
  },
  message: {
    message: 'Read and Agree T&C',
    document: `${TnC_DOC_URL.replace('https://', '').replace('http://', '').slice(0, 25)}`,
  },
};

interface Vault {
  name: string;
  address: string;
  launchBlock: number;
  baseToken: string;
  quoteToken: string;
}

export const VAULTS: Vault[] = [
  {
    name: 'USDC/USDT',
    address:
      '0x3a4f8debaf12af97bb911099bc011d63d6c208d4c5ba8e15d7f437785b0aaa2',
    launchBlock: 1501761,
    baseToken: 'USDC',
    quoteToken: 'USDT',
  },
  {
    name: 'ETH/USDC',
    address:
      '0x160d8fa4569ef6a12e6bf47cb943d7b5ebba8a41a69a14c1d943050ba5ff947',
    launchBlock: 1501761,
    baseToken: 'ETH',
    quoteToken: 'USDC',
  },
  {
    name: 'STRK/USDC',
    address:
      '0x351b36d0d9d8b40010658825adeeddb1397436cd41acd0ff6c6e23aaa8b5b30',
    launchBlock: 1501762,
    baseToken: 'STRK',
    quoteToken: 'USDC',
  },
  {
    name: 'STRK/ETH',
    address:
      '0x4ce3024b0ee879009112d7b0e073f8a87153dd35b029347d4247ffe48d28f51',
    launchBlock: 1501763,
    baseToken: 'STRK',
    quoteToken: 'ETH',
  },
  {
    name: 'WBTC/USDC',
    address:
      '0x2bcaef2eb7706875a5fdc6853dd961a0590f850bc3a031c59887189b5e84ba1',
    launchBlock: 1501764,
    baseToken: 'WBTC',
    quoteToken: 'USDC',
  },
  // {
  //   name: 'tBTC/USDC',
  //   address: "0x4aad891a2d4432fba06b6558631bb13f6bbd7f6f33ab8c3111e344889ea4456",
  //   launchBlock: 1501764,
  //   baseToken: 'tBTC',
  //   quoteToken: 'USDC'
  // },
  {
    name: 'WBTC/ETH',
    address:
      '0x1c9232b8186d9317652f05055615f18a120c2ad9e5ee96c39e031c257fb945b',
    launchBlock: 1501765,
    baseToken: 'WBTC',
    quoteToken: 'ETH',
  },
  {
    name: 'WBTC/STRK',
    address:
      '0x1248e385c23a929a015ec298a26560fa7745bbd6e41a886550e337b02714b1b',
    launchBlock: 1501766,
    baseToken: 'WBTC',
    quoteToken: 'STRK',
  },
];

export default CONSTANTS;
