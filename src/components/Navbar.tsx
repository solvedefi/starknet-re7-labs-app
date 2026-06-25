import { ChevronDown } from 'lucide-react';
import NextLink from 'next/link';
import { useAtom, useSetAtom } from 'jotai';
import {
  connect,
  ConnectOptionsWithConnectors,
  StarknetkitConnector,
} from 'starknetkit';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { getERC20Balance } from '@/store/balance.atoms';
import { addressAtom } from '@/store/claims.atoms';
import { lastWalletAtom } from '@/store/utils.atoms';
import {
  getEndpoint,
  getTokenInfoFromName,
  shortAddress,
  standariseAddress,
  truncate,
} from '@/utils';
import fulllogo from '@public/fulllogo.png';
import active from '@public/active.png';
import connectImg from '@public/connect.png';
import close from '@public/close.png';
import {
  InjectedConnector,
  useAccount,
  useConnect,
  useDisconnect,
  useStarkProfile,
} from '@starknet-react/core';
import mixpanel from 'mixpanel-browser';
import { useEffect, useMemo, useState } from 'react';
import { isMobile } from 'react-device-detect';
import { constants } from 'starknet';
import {
  ArgentMobileConnector,
  isInArgentMobileAppBrowser,
} from 'starknetkit/argentMobile';
import {
  BraavosMobileConnector,
  isInBraavosMobileAppBrowser,
} from 'starknetkit/braavosMobile';
import { WebWalletConnector } from 'starknetkit/webwallet';
import TncModal from './TncModal';

export function getConnectors(isMobile: boolean) {
  const mobileConnector = ArgentMobileConnector.init({
    options: {
      dappName: 'Re7',
      url: getEndpoint(),
      chainId: constants.NetworkName.SN_MAIN,
    },
    inAppBrowserOptions: {},
  }) as StarknetkitConnector;

  const mobileBraavosConnector = BraavosMobileConnector.init({
    inAppBrowserOptions: {},
  }) as StarknetkitConnector;

  const argentXConnector = new InjectedConnector({
    options: {
      id: 'argentX',
      name: 'Ready',
    },
  });

  const braavosConnector = new InjectedConnector({
    options: {
      id: 'braavos',
      name: 'Braavos',
    },
  });

  const keplrConnector = new InjectedConnector({
    options: {
      id: 'keplr',
      name: 'Keplr',
    },
  });

  const fordefiConnector = new InjectedConnector({
    options: {
      id: 'fordefi',
      name: 'FordeFi',
    },
  });

  const isInstalled = [
    argentXConnector,
    braavosConnector,
    keplrConnector,
    fordefiConnector,
  ].map((wallet) => {
    return {
      id: wallet.id,
      isInstalled:
        typeof window === 'undefined'
          ? false
          : window[`starknet_${wallet.id}`] !== undefined,
    };
  });

  const webWalletConnector = new WebWalletConnector({
    url: 'https://web.argent.xyz',
  }) as StarknetkitConnector;

  if (isInArgentMobileAppBrowser()) {
    return [mobileConnector];
  } else if (isInBraavosMobileAppBrowser()) {
    return [mobileBraavosConnector];
  } else if (isMobile) {
    return [mobileConnector, mobileBraavosConnector, webWalletConnector];
  }

  const defaultConnectors = [
    argentXConnector,
    braavosConnector,
    keplrConnector,
    fordefiConnector,
  ];

  // put uninstall wallets at the end
  const sortedConnectors: any[] = defaultConnectors.sort((a, b) => {
    const aInstalled = isInstalled.find(
      (wallet) => wallet.id === a.id,
    )?.isInstalled;
    const bInstalled = isInstalled.find(
      (wallet) => wallet.id === b.id,
    )?.isInstalled;

    if (aInstalled && bInstalled) {
      return 0;
    } else if (aInstalled) {
      return -1;
    }
    return 1;
  });

  sortedConnectors.push(mobileConnector);
  sortedConnectors.push(webWalletConnector);
  return sortedConnectors;
}

interface NavbarProps {
  hideTg?: boolean;
  forceShowConnect?: boolean;
}

export default function Navbar(props: NavbarProps) {
  const { address, connector, account } = useAccount();
  const { disconnectAsync } = useDisconnect();
  const setAddress = useSetAtom(addressAtom);
  const { data: starkProfile } = useStarkProfile({
    address,
    useDefaultPfp: true,
  });
  const { connect: connectSnReact } = useConnect();

  const [lastWallet, setLastWallet] = useAtom(lastWalletAtom);

  const getTokenBalance = async (token: string, address: string) => {
    const tokenInfo = getTokenInfoFromName(token);
    const balance = await getERC20Balance(tokenInfo, address);

    return balance.amount.toEtherToFixedDecimals(6);
  };

  const connectorConfig: ConnectOptionsWithConnectors = useMemo(() => {
    return {
      modalMode: 'alwaysAsk',
      modalTheme: 'dark',
      webWalletUrl: 'https://web.argent.xyz',
      argentMobileOptions: {
        dappName: 'Re7',
        chainId: constants.NetworkName.SN_MAIN,
        url: getEndpoint(),
      },
      dappName: 'Re7',
      connectors: getConnectors(isMobile) as StarknetkitConnector[],
    };
  }, [isMobile]);

  const [isWalletConnected, setIsWalletConnected] = useState(false);

  async function connectWallet(config = connectorConfig) {
    try {
      const { connector } = await connect(config);

      if (connector) {
        connectSnReact({ connector: connector as any });
        setIsWalletConnected(true);
      }
    } catch (error) {
      console.error('connectWallet error', error);
    }
  }

  useEffect(() => {
    const config = connectorConfig;
    connectWallet({
      ...config,
      modalMode: 'neverAsk',
    });
  }, []);

  useEffect(() => {
    (async () => {
      if (address) {
        setIsWalletConnected(true);
        const standardAddr = standariseAddress(address);
        const userProps = {
          address: standardAddr,
          ethAmount: await getTokenBalance('ETH', address),
          usdcAmount: await getTokenBalance('USDC', address),
          strkAmount: await getTokenBalance('STRK', address),
        };
        mixpanel.track('wallet connect trigger', userProps);
        mixpanel.identify(standariseAddress(standardAddr));
        mixpanel.people.set(userProps);
      } else {
        setIsWalletConnected(false);
      }
    })();
  }, [address]);

  // Set last wallet when a new wallet is connected
  useEffect(() => {
    console.log('lastWallet connector', connector?.name);
    if (connector) {
      const name: string = connector.id;
      setLastWallet(name);
      setIsWalletConnected(true);
    }
  }, [connector]);

  // set address atom
  useEffect(() => {
    console.log('tncinfo address', address);
    setAddress(address);
  }, [address]);

  const connectorDisplayDetails = useMemo(() => {
    const icon = connector?.icon;
    if (icon) {
      const iconString = typeof icon === 'string' ? icon : icon?.dark;
      const iconSrc = iconString.startsWith('data:image')
        ? iconString
        : `data:image/svg+xml;utf8,${encodeURIComponent(iconString)}`;
      return {
        icon: iconSrc,
        rounded: false,
      };
    }
    return {
      icon: active.src,
      rounded: true,
    };
  }, [connector]);

  const buttonClasses = cn(
    'flex items-center rounded-[146px] border border-[#2F2F2F] px-2 py-2.5 text-[0.8rem] text-white hover:border-white sm:px-5 sm:py-5 sm:text-[15px]',
  );
  const buttonStyle = {
    background: isWalletConnected
      ? 'linear-gradient(to right, #2E45D0, #B1525C)'
      : '#2F2F2F',
  };

  return (
    <div className="fixed top-0 z-[999] w-full bg-[#0C0C0C]">
      <TncModal />
      <div className="mx-auto w-full max-w-[1400px] px-5 pb-2.5 pt-5">
        <div className="flex w-full">
          <NextLink href="/" className="my-auto mr-auto text-left">
            <img src={fulllogo.src} alt="logo" className="h-10 md:h-[50px]" />
          </NextLink>

          {!address ? (
            <button
              type="button"
              className={buttonClasses}
              style={buttonStyle}
              onClick={() => connectWallet()}
            >
              <span className="flex items-center gap-2.5 p-2 sm:gap-5">
                <h3 className="mt-[3px]">CONNECT</h3>
                <img
                  src={connectImg.src}
                  alt="pfp"
                  className="-mr-[5px] h-3 w-3 rounded-full sm:-mr-2.5 sm:h-[18px] sm:w-[18px]"
                />
              </span>
            </button>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={buttonClasses}
                  style={buttonStyle}
                >
                  <span className="flex items-center gap-2">
                    <img
                      src={connectorDisplayDetails.icon}
                      alt="pfp"
                      className={cn(
                        'h-[15px] w-[15px]',
                        connectorDisplayDetails.rounded && 'rounded-full',
                      )}
                    />
                    <h3 className="mt-[3px]">
                      {starkProfile && starkProfile.name
                        ? truncate(starkProfile.name, 6, isMobile ? 0 : 6)
                        : shortAddress(address, 4, isMobile ? 0 : 4)}
                    </h3>
                    <ChevronDown className="h-4 w-4" />
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[180px] rounded-[9px] bg-highlight text-white">
                <DropdownMenuItem
                  className="h-[52px] cursor-pointer focus:bg-white/10"
                  onClick={() => {
                    disconnectAsync().then(() => {
                      console.log('wallet disconnected');
                      setLastWallet(null);
                      setIsWalletConnected(false);
                    });
                  }}
                >
                  DISCONNECT
                  <img src={close.src} alt="pfp" className="ml-auto h-3 w-3" />
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="h-[52px] cursor-pointer focus:bg-white/10"
                  onClick={() => connectWallet()}
                >
                  SWITCH
                  <img
                    src={connectImg.src}
                    alt="pfp"
                    className="ml-auto h-3.5 w-3.5"
                  />
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </div>
  );
}
