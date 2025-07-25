import ERC4626Abi from '@/abi/erc4626.abi.json';
import { NFTInfo, TokenInfo } from '@/strategies/IStrategy';
import MyNumber from '@/utils/MyNumber';
import { NFTS } from '@/constants';
import { Contract, RpcProvider, num, uint256 } from 'starknet';
import { atomWithQuery } from 'jotai-tanstack-query';
import { addressAtom } from '@/store/claims.atoms';
import ERC20Abi from '@/abi/erc20.abi.json';
import DeltaNeutralAbi from '@/abi/deltraNeutral.abi.json';
import DeltaNeutralAbi2 from '@/abi/deltaNeutral.2.abi.json';
import { Atom } from 'jotai';
import {
  getTokenInfoFromAddr,
  getTokenInfoFromName,
  standariseAddress,
} from '@/utils';

export interface BalanceResult {
  amount: MyNumber;
  tokenInfo: TokenInfo | undefined;
}

export function returnEmptyBal(): BalanceResult {
  return {
    amount: MyNumber.fromZero(),
    tokenInfo: undefined,
  };
}

export async function getERC20Balance(
  token: TokenInfo | undefined,
  address: string | undefined,
) {
  console.log('getERC20Balance', token?.token, address);
  if (!token) return returnEmptyBal();
  if (!address) return returnEmptyBal();

  const provider = new RpcProvider({
    nodeUrl: process.env.NEXT_PUBLIC_RPC_URL,
  });
  const erc20Contract = new Contract(ERC20Abi, token.token, provider);
  const balance = await erc20Contract.call('balanceOf', [address]);
  return {
    amount: new MyNumber(balance.toString(), token.decimals),
    tokenInfo: token,
  };
}

export async function getERC4626Balance(
  token: TokenInfo | undefined,
  address: string | undefined,
) {
  if (!token) return returnEmptyBal();
  if (!address) return returnEmptyBal();

  const bal = await getERC20Balance(token, address);
  const provider = new RpcProvider({
    nodeUrl: process.env.NEXT_PUBLIC_RPC_URL,
  });
  const erc4626Contract = new Contract(ERC4626Abi, token.token, provider);
  const balance = await erc4626Contract.call('convert_to_assets', [
    uint256.bnToUint256(bal.amount.toString()),
  ]);

  const asset = await erc4626Contract.call('asset', []);
  const assetInfo = getTokenInfoFromAddr(standariseAddress(asset as string));
  if (!assetInfo) {
    throw new Error('ERC4626: Asset not found');
  }
  return {
    amount: new MyNumber(balance.toString(), token.decimals),
    tokenInfo: assetInfo,
  };
}

export async function getERC721PositionValue(
  token: NFTInfo | undefined,
  address: string | undefined,
) {
  if (!token) return returnEmptyBal();
  if (!address) return returnEmptyBal();

  const provider = new RpcProvider({
    nodeUrl: process.env.NEXT_PUBLIC_RPC_URL,
  });
  let result: any = null;
  try {
    const erc721Contract = new Contract(
      DeltaNeutralAbi,
      token.address,
      provider,
    );
    const tokenId = num.getDecimalString(address);
    result = await erc721Contract.call('describe_position', [tokenId]);
  } catch (err) {
    const erc721Contract = new Contract(
      DeltaNeutralAbi2,
      token.address,
      provider,
    );
    const tokenId = num.getDecimalString(address);
    result = await erc721Contract.call('describe_position', [tokenId]);
  }
  const tokenInfo = getTokenInfoFromName(token.config.mainTokenName);
  return {
    amount: new MyNumber(
      uint256.uint256ToBN(result[1].estimated_size).toString(),
      tokenInfo.decimals,
    ),
    tokenInfo,
  };
}

export function getERC20BalanceAtom(token: TokenInfo | undefined) {
  return atomWithQuery((get) => {
    return {
      queryKey: ['getERC20Balance', token?.token, get(addressAtom)],
      queryFn: async ({ queryKey }: any): Promise<BalanceResult> => {
        return getERC20Balance(token, get(addressAtom));
      },
      refetchInterval: 5000,
    };
  });
}

function getERC4626BalanceAtom(token: TokenInfo | undefined) {
  return atomWithQuery((get) => {
    return {
      queryKey: ['getERC4626Balance', token?.token],
      queryFn: async ({ queryKey }: any): Promise<BalanceResult> => {
        return getERC4626Balance(token, get(addressAtom));
      },
      refetchInterval: 5000,
    };
  });
}

function getERC721PositionValueAtom(token: NFTInfo | undefined) {
  return atomWithQuery((get) => {
    return {
      queryKey: ['getERC721PositionValue', token?.address],
      queryFn: async ({ queryKey }: any): Promise<BalanceResult> => {
        try {
          return await getERC721PositionValue(token, get(addressAtom));
        } catch (e) {
          return returnEmptyBal();
        }
      },
      refetchInterval: 5000,
    };
  });
}

export async function getBalance(
  token: TokenInfo | NFTInfo | undefined,
  address: string,
) {
  if (token) {
    if (Object.prototype.hasOwnProperty.call(token, 'isERC4626')) {
      const _token = <TokenInfo>token;
      if (_token.isERC4626) return getERC4626Balance(_token, address);
    } else {
      const _token = <NFTInfo>token;
      const isNFT = NFTS.find((nft) => nft.address === _token.address);
      if (isNFT) return getERC721PositionValue(_token, address);
    }
    return getERC20Balance(<TokenInfo>token, address);
  }

  return returnEmptyBal();
}

export function getBalanceAtom(
  token: TokenInfo | NFTInfo | undefined,
  enabledAtom: Atom<boolean>,
) {
  if (token) {
    if (Object.prototype.hasOwnProperty.call(token, 'isERC4626')) {
      const _token = <TokenInfo>token;
      if (_token.isERC4626) return getERC4626BalanceAtom(_token);
    } else {
      const _token = <NFTInfo>token;
      const isNFT = NFTS.find((nft) => nft.address === _token.address);
      if (isNFT) return getERC721PositionValueAtom(_token);
    }
  }

  // fallback option for now. if token is undefined, this will return 0 anyways
  return getERC20BalanceAtom(<TokenInfo>token);
}

export const DUMMY_BAL_ATOM = atomWithQuery((get) => {
  return {
    queryKey: ['DUMMY_BAL_ATOM'],
    queryFn: async ({ queryKey }: any): Promise<BalanceResult> => {
      return returnEmptyBal();
    },
    refetchInterval: 100000000,
  };
});
