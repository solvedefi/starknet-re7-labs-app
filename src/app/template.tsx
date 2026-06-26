'use client';

import Navbar, { getConnectors } from '@/components/Navbar';
import { MY_STORE } from '@/store';
import { mainnet } from '@starknet-react/chains';
import { StarknetConfig, jsonRpcProvider } from '@starknet-react/core';
import { Provider as JotaiProvider } from 'jotai';
import mixpanel from 'mixpanel-browser';
import { usePathname } from 'next/navigation';
import * as React from 'react';
import { Toaster } from 'react-hot-toast';
import { RpcProviderOptions, constants } from 'starknet';

import { isMobile } from 'react-device-detect';
import { StrategyDetailsProvider } from './providers/StrategyDetailsProvider';
import QueryDevtools from '@/components/QueryDevtools';

mixpanel.init('118f29da6a372f0ccb6f541079cad56b');

// @ts-ignore
BigInt.prototype.toJSON = function () {
  return this.toString();
};

export const CONNECTOR_NAMES = ['Braavos', 'Argent X', 'Argent (mobile)']; // 'Argent Web Wallet'];

export default function Template({ children }: { children: React.ReactNode }) {
  const chains = [mainnet];
  const provider = jsonRpcProvider({
    rpc: (chain) => {
      const args: RpcProviderOptions = {
        nodeUrl:
          'https://rpc.nethermind.io/mainnet-juno?apikey=t1HPjhplOyEQpxqVMhpwLGuwmOlbXN0XivWUiPAxIBs0kHVK',
        chainId: constants.StarknetChainId.SN_MAIN,
      };
      return args;
    },
  });
  const pathname = usePathname();

  return (
    <JotaiProvider store={MY_STORE}>
      <StarknetConfig
        chains={chains}
        provider={provider}
        connectors={getConnectors(isMobile)}
      >
        <div className="flex min-h-screen bg-[#171717]">
          <React.Suspense>
            <div className="block w-full p-0 pt-[100px]">
              <Navbar
                hideTg={pathname!.includes('slinks')}
                forceShowConnect={pathname!.includes('slinks')}
              />
              {children}
              <Toaster />
            </div>
            <StrategyDetailsProvider />
          </React.Suspense>
        </div>
        <QueryDevtools />
      </StarknetConfig>
    </JotaiProvider>
  );
}
