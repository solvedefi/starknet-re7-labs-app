'use client';

import Navbar, { getConnectors } from '@/components/Navbar';
import { MY_STORE } from '@/store';
import { ChakraBaseProvider, extendTheme } from '@chakra-ui/react';
import { mainnet } from '@starknet-react/chains';
import { StarknetConfig, jsonRpcProvider } from '@starknet-react/core';
import { Provider as JotaiProvider } from 'jotai';
import mixpanel from 'mixpanel-browser';
import { usePathname } from 'next/navigation';
import * as React from 'react';
import { Toaster } from 'react-hot-toast';
import { RpcProviderOptions, constants } from 'starknet';

import { isMobile } from 'react-device-detect';
import { ibmPlexMonoHeader, ibmPlexMonoLight, ibmPlexMonoMain } from '@/fonts';
import { StrategyDetailsProvider } from './providers/StrategyDetailsProvider';

mixpanel.init('118f29da6a372f0ccb6f541079cad56b');

// Kept for the not-yet-migrated Chakra routes (strategy page / modals). The
// home route renders no Chakra components, so this theme/provider is inert for
// it. Remove together with Chakra in the final migration phase.
const theme = extendTheme({
  colors: {
    transparent: 'rgba(0, 0, 0, 0)',
    opacity_50p: 'rgba(0, 0, 0, 0.5)',
    color1: 'rgba(53, 60, 79, 1)',
    color1_65p: 'rgba(53, 60, 79, 0.65)',
    color1_50p: 'rgba(53, 60, 79, 0.5)',
    color1_35p: 'rgba(53, 60, 79, 0.35)',
    color1_light: '#bcc9ff80',
    color2: 'rgba(132, 132, 195, 1)',
    color2Text: 'rgb(184 184 239)',
    color2_65p: 'rgba(132, 132, 195, 0.65)',
    color2_50p: 'rgba(132, 132, 195, 0.15)',
    highlight: '#1a1a27',
    light_grey: '#9ca9ad',
    disabled_text: '#818181',
    disabled_bg: '#5f5f5f',
    purple: '#6e53dc',
    cyan: '#7DFACB',
    bg: '#111119',
    grey_text: '#B6B6B6',
    yellow: '#EFDB72',
    red: '#e18787',
    tertiary: '#82828A',
  },
  components: {
    MenuItem: { bg: 'highlight' },
    Badge: { baseStyle: { lineHeight: 'initial', borderRadius: '4px' } },
  },
  fonts: {
    heading: ibmPlexMonoHeader.style.fontFamily,
    body: ibmPlexMonoMain.style.fontFamily,
    light: ibmPlexMonoLight.style.fontFamily,
  },
});

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
        {/* ChakraBaseProvider kept until the remaining (strategy/modal) routes
            are migrated off Chakra in a later phase. The home route below
            renders no Chakra components, so it no longer hangs in dev. */}
        <ChakraBaseProvider theme={theme}>
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
        </ChakraBaseProvider>
      </StarknetConfig>
    </JotaiProvider>
  );
}
