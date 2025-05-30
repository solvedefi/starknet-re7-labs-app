import { MenuItemProps, MenuListProps } from '@chakra-ui/react';
import { Call, num } from 'starknet';
import { TOKENS } from './constants';
import toast from 'react-hot-toast';
import {
  AmountsInfo,
  IStrategyActionHook,
  TokenInfo,
} from './strategies/IStrategy';
import {
  ContractAddr,
  TokenInfo as TokenInfoV2,
  Web3Number,
} from '@strkfarm/sdk';
import fetchWithRetry from './utils/fetchWithRetry';
import {
  BalanceResult,
  DUMMY_BAL_ATOM,
  getBalanceAtom,
} from './store/balance.atoms';
import { Atom, atom } from 'jotai';
import { AtomWithQueryResult } from 'jotai-tanstack-query';
import assert from 'assert';
import MyNumber from './utils/MyNumber';

export function getUniqueStrings(arr: Array<string>) {
  const _arr: string[] = [];
  arr.forEach((item) => {
    if (!_arr.includes(item)) _arr.push(item);
  });
  return _arr;
}

export function getUnique<T>(arr: Array<T>, uniqueField: string) {
  const _arr: T[] = [];
  const map: { [key: string]: boolean } = {};
  arr.forEach((item: any) => {
    if (!map[item[uniqueField]]) {
      _arr.push(item);
      map[item[uniqueField]] = true;
    }
  });
  return _arr;
}

export function getUniqueById<T>(arr: Array<T>) {
  return getUnique(arr, 'id');
}

export function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function shortAddress(_address: string, startChars = 4, endChars = 4) {
  const x = num.toHex(num.getDecimalString(_address));
  return truncate(x, startChars, endChars);
}

export function truncate(str: string, startChars: number, endChars: number) {
  if (str.length <= startChars + endChars) {
    return str;
  }

  return `${str.slice(0, startChars)}...${str.slice(str.length - endChars, str.length)}`;
}

export function standariseAddress(address: string | bigint) {
  let _a = address;
  if (!address) {
    _a = '0';
  }
  const a = num.getHexString(num.getDecimalString(_a.toString()));
  return a;
}

export const MyMenuListProps: MenuListProps = {
  bg: 'highlight',
  color: 'white',
  borderColor: 'bg',
  padding: 0,
};

export const MyMenuItemProps: MenuItemProps = {
  bg: 'highlight',
  _hover: {
    bg: 'bg',
  },
};

export function getTokenInfoFromAddr(tokenAddr: string) {
  const info = TOKENS.find(
    (t) => standariseAddress(t.token) === standariseAddress(tokenAddr),
  );
  if (!info) {
    throw new Error('Token not found');
  }
  return info;
}

export function getTokenInfoFromName(tokenName: string) {
  const info = TOKENS.find(
    (t) => t.name.toLowerCase() === tokenName.toLowerCase(),
  );
  if (!info) {
    throw new Error(`Token not found: ${tokenName}`);
  }
  return info;
}

export function generateReferralCode() {
  const code = Math.random().toString(36).slice(2, 8);
  return code;
}

export function getReferralUrl(referralCode: string) {
  if (
    window.location.origin.includes('app.strkfarm.xyz') ||
    window.location.origin.includes('app.strkfarm.com')
  ) {
    return `https://${getHosturl()}/r/${referralCode}`;
  }
  return `${window.location.origin}/r/${referralCode}`;
}

export function getDisplayCurrencyAmount(
  amount: string | number,
  decimals: number,
) {
  return Number(Number(amount).toFixed(decimals)).toLocaleString(undefined, {
    minimumFractionDigits: decimals,
  });
}

// returns time to endtime in days, hours, minutes
export function formatTimediff(endTime: Date) {
  const now = new Date();
  if (now.getTime() >= endTime.getTime()) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      isZero: true,
    };
  }

  // else return number of days, months, weeks, hours, minutrs, seconds to endtime
  const diff = endTime.getTime() - now.getTime();
  // get days floor
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  // after accounting days, get remaining hours
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  // after accounting days and hours, get remaining minutes
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  return {
    days,
    hours,
    minutes,
    isZero: false,
  };
}

export function copyReferralLink(refCode: string) {
  navigator.clipboard.writeText(getReferralUrl(refCode));

  toast.success('Referral link copied to clipboard', {
    position: 'bottom-right',
  });
}

export async function getPrice(tokenInfo: MyMultiTokenInfo, source?: string) {
  console.log(`getPrice::${source}`, tokenInfo.name);
  try {
    return await getPriceFromMyAPI(tokenInfo);
  } catch (e) {
    console.warn('getPriceFromMyAPI error', e);
  }
  console.log('getPrice coinbase', tokenInfo.name);
  const priceInfo = await fetchWithRetry(
    `https://api.coinbase.com/v2/prices/${convertToV2TokenInfo(tokenInfo).symbol}-USDT/spot`,
    {},
    `Error fetching price for ${tokenInfo.name}`,
  );
  if (!priceInfo) {
    throw new Error('Failed to fetch price');
  }
  const data = await priceInfo.json();
  const price = Number(data.data.amount);
  return price;
}

export function getEndpoint() {
  return (
    (typeof window === 'undefined'
      ? process.env.HOSTNAME
      : window.location.origin) || 'https://app.strkfarm.com'
  );
}

export function getHosturl() {
  const FALLBACK = 'strkfarm.com';
  try {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      // Check if hostname is an IPv4 or IPv6 address
      // prettier-ignore
      const isIP =
        (/^(\d{1,3}\.){3}\d{1,3}$/).test(hostname) || // IPv4
        (/^\[?([a-fA-F0-9:]+)\]?$/).test(hostname); // IPv6 (with or without brackets)
      if (isIP) return FALLBACK;
      return hostname.split('.').slice(-2).join('.');
    }
    return FALLBACK;
  } catch (e) {
    return FALLBACK;
  }
}

export async function getPriceFromMyAPI(tokenInfo: MyMultiTokenInfo) {
  console.log('getPrice from redis', tokenInfo.name);

  const endpoint = getEndpoint();
  const url = `${endpoint}/api/price/${convertToV2TokenInfo(tokenInfo).symbol}`;
  console.log('getPrice url', url);
  const priceInfoRes = await fetch(url);
  const priceInfo = await priceInfoRes.json();
  const now = new Date();
  const priceTime = new Date(priceInfo.timestamp);
  if (now.getTime() - priceTime.getTime() > 900000) {
    // 15 mins
    console.log('getPrice priceInfo', priceInfo);
    console.log('getPrice priceTime', now, tokenInfo.name);
    throw new Error('Price is stale');
  }
  const price = Number(priceInfo.price);
  return price;
}

export function timeAgo(date: Date): string {
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);

  if (hours < 1) return `${minutes}min ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  if (weeks < 4) return `${weeks}w ago`;
  if (months < 3) return `${months}mon ago`;

  // If more than 3 months, return in DD MMM, YY format
  return date.toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: '2-digit',
  });
}

export type MyMultiTokenInfo = TokenInfo | TokenInfoV2;
export type MyTokenInfo = TokenInfoV2;

export function convertToV2TokenInfo(token: MyMultiTokenInfo): MyTokenInfo {
  const _token: any = token;
  const isTokenInfoV1 = _token.token !== undefined;
  if (!isTokenInfoV1) {
    return token as TokenInfoV2;
  }
  return {
    name: token.name,
    symbol: token.name,
    address: ContractAddr.from((token as TokenInfo).token),
    decimals: token.decimals,
    logo: token.logo,
    displayDecimals: token.displayDecimals,
  };
}

export function convertToV1TokenInfo(
  token: MyMultiTokenInfo,
  isERC4626 = false,
): TokenInfo {
  const _token: any = token;
  const isTokenInfoV1 = _token.token !== undefined;
  if (isTokenInfoV1) {
    return token as TokenInfo;
  }

  const v2Token = token as TokenInfoV2;
  return {
    name: v2Token.symbol,
    address: v2Token.address.address,
    decimals: v2Token.decimals,
    logo: v2Token.logo,
    displayDecimals: v2Token.displayDecimals,
    token: v2Token.address.address,
    isERC4626,
    minAmount: MyNumber.fromEther('0', v2Token.decimals),
    maxAmount: MyNumber.fromEther('0', v2Token.decimals),
    stepAmount: new MyNumber('1', v2Token.decimals),
  };
}

export type MyMultiWeb3Number = Web3Number | MyNumber;
export type MyWeb3Number = Web3Number;
export function convertToV2Web3Number(amount: MyMultiWeb3Number): MyWeb3Number {
  console.log(
    'convertToV2Web3Number',
    typeof amount,
    amount instanceof Web3Number,
  );
  if (amount instanceof Web3Number) {
    return amount;
  }
  return Web3Number.fromWei(amount.toString(), amount.decimals);
}

export function convertToMyNumber(amount: MyWeb3Number): MyNumber {
  return new MyNumber(amount.toWei(), amount.decimals);
}

export function ZeroAmountsInfo(tokens: MyMultiTokenInfo[]): AmountsInfo {
  const res: AmountsInfo = {
    usdValue: 0,
    amounts: [],
  };
  for (let i = 0; i < tokens.length; i++) {
    const token: any = tokens[i];
    const isTokenInfoV1 = token.token !== undefined;
    res.amounts.push({
      amount: Web3Number.fromWei('0', tokens[i].decimals),
      tokenInfo: isTokenInfoV1
        ? convertToV2TokenInfo(TOKENS[i])
        : (tokens[i] as TokenInfoV2),
      usdValue: 0,
    });
  }
  return res;
}

export function DummyStrategyActionHook(
  tokens: MyMultiTokenInfo[],
): IStrategyActionHook {
  return buildStrategyActionHook([], tokens, null, true);
}

export function buildStrategyActionHook(
  calls: Call[],
  tokens: MyMultiTokenInfo[],
  balanceAtoms: Atom<AtomWithQueryResult<BalanceResult, Error>>[] | null = null,
  isDummy: boolean = false,
): IStrategyActionHook {
  if (balanceAtoms) {
    assert(
      balanceAtoms.length === tokens.length,
      'balanceAtoms length mismatch',
    );
  }
  return {
    calls,
    amounts: tokens.map((token, index) => {
      const _token: any = token;
      const isTokenInfoV1 = _token.token !== undefined;
      const tokenInfoV1 = getTokenInfoFromName(_token.symbol || _token.name);
      if (!tokenInfoV1) {
        if (!tokenInfoV1) {
          throw new Error('Token not found');
        }
      }
      let balanceAtom = balanceAtoms ? balanceAtoms[index] : null;
      if (!balanceAtom) {
        balanceAtom = isDummy
          ? DUMMY_BAL_ATOM
          : getBalanceAtom(tokenInfoV1, atom(true));
      }
      return {
        balanceAtom,
        tokenInfo: isTokenInfoV1
          ? convertToV2TokenInfo(_token)
          : (token as TokenInfoV2),
      };
    }),
  };
}
