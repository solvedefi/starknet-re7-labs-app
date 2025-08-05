import { ChevronDownIcon } from '@chakra-ui/icons';
import {
  Box,
  Button,
  Center,
  Container,
  Flex,
  Image,
  Link,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Text,
  useDisclosure,
} from '@chakra-ui/react';
import { useAtom, useSetAtom } from 'jotai';
import {
  connect,
  ConnectOptionsWithConnectors,
  StarknetkitConnector,
} from 'starknetkit';

import { getERC20Balance } from '@/store/balance.atoms';
import { addressAtom } from '@/store/claims.atoms';
import { lastWalletAtom } from '@/store/utils.atoms';
import {
  getEndpoint,
  getTokenInfoFromName,
  MyMenuItemProps,
  MyMenuListProps,
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
      name: 'Argent X',
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

  const isInstalled = [argentXConnector, braavosConnector, keplrConnector].map(
    (wallet) => {
      return {
        id: wallet.id,
        isInstalled:
          typeof window === 'undefined'
            ? false
            : window[`starknet_${wallet.id}`] !== undefined,
      };
    },
  );

  const webWalletConnector = new WebWalletConnector({
    url: 'https://web.argent.xyz',
  }) as StarknetkitConnector;

  if (isInArgentMobileAppBrowser()) {
    return [mobileConnector];
  } else if (isInBraavosMobileAppBrowser()) {
    return [mobileBraavosConnector];
  } else if (isMobile) {
    return [
      braavosConnector,
      mobileConnector,
      mobileBraavosConnector,
      webWalletConnector,
    ];
  }

  const defaultConnectors = [
    argentXConnector,
    braavosConnector,
    keplrConnector,
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

  const isWalletConnect: boolean = false;

  const [lastWallet, setLastWallet] = useAtom(lastWalletAtom);

  const getTokenBalance = async (token: string, address: string) => {
    const tokenInfo = getTokenInfoFromName(token);
    const balance = await getERC20Balance(tokenInfo, address);

    return balance.amount.toEtherToFixedDecimals(6);
  };

  console.log(account, 'account');

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
      const name: string = connector.name;
      setLastWallet(name);
      setIsWalletConnected(true);
    }
  }, [connector]);

  // set address atom
  useEffect(() => {
    console.log('tncinfo address', address);
    setAddress(address);
  }, [address]);

  const { isOpen, onOpen, onClose } = useDisclosure();

  return (
    <Container
      width={'100%'}
      padding={'0'}
      position={'fixed'}
      bg="#0C0C0C"
      zIndex={999}
      top="0"
    >
      <TncModal />
      <Box
        width={'100%'}
        maxWidth="1400px"
        margin={'0px auto'}
        padding={'20px 20px 10px'}
      >
        <Flex width={'100%'}>
          <Link href="/" margin="auto auto auto 0" textAlign={'left'}>
            <Image
              src={fulllogo.src}
              alt="logo"
              height={{ base: '30px', md: '40px' }}
            />
          </Link>
          {true && (
            <Menu>
              <MenuButton
                as={Button}
                rightIcon={address ? <ChevronDownIcon /> : <></>}
                iconSpacing={{ base: '1px', sm: '5px' }}
                sx={{
                  background: isWalletConnected
                    ? 'linear-gradient(to right, #2E45D0, #B1525C)'
                    : '#2F2F2F',
                }}
                color="white"
                borderColor="#2F2F2F"
                borderRadius="146px"
                borderWidth="1px"
                _hover={{
                  bg: isWalletConnected
                    ? 'linear-gradient(to right, #2E45D0, #B1525C)'
                    : '#2F2F2F',
                  borderColor: '#FFF',
                }}
                _active={{
                  bg: isWalletConnected
                    ? 'linear-gradient(to right, #2E45D0, #B1525C)'
                    : '#2F2F2F',
                }}
                display={{ base: 'flex' }}
                my={{ base: 'auto', sm: 'initial' }}
                paddingX={{ base: '0.5rem', sm: '20px' }}
                paddingY={{ base: '10px', sm: '20px' }}
                fontSize={{ base: '0.8rem', sm: '15px' }}
                onClick={
                  address
                    ? undefined
                    : () => {
                        connectWallet();
                      }
                }
                size="xs"
              >
                <Center>
                  {address ? (
                    <Flex alignItems="center" gap=".5rem">
                      <Image
                        src={active.src}
                        alt="pfp"
                        width={{ base: '13px', sm: '13px' }}
                        height={{ base: '13px', sm: '13px' }}
                        rounded="full"
                      />{' '}
                      <Text as="h3" marginTop={'3px !important'}>
                        {starkProfile && starkProfile.name
                          ? truncate(starkProfile.name, 6, isMobile ? 0 : 6)
                          : shortAddress(address, 4, isMobile ? 0 : 4)}
                      </Text>
                    </Flex>
                  ) : (
                    <Flex
                      alignItems="center"
                      gap={{ base: '10px', sm: '20px' }}
                      p={2}
                    >
                      <Text as="h3" marginTop={'3px !important'}>
                        CONNECT
                      </Text>
                      <Image
                        src={connectImg.src}
                        alt="pfp"
                        width={{ base: '12px', sm: '18px' }}
                        height={{ base: '12px', sm: '18px' }}
                        marginRight={{ base: '-5px', sm: '-10px' }}
                        rounded="full"
                      />
                    </Flex>
                  )}
                </Center>
              </MenuButton>
              <MenuList {...MyMenuListProps} borderRadius={'146px'}>
                {address && (
                  <MenuItem
                    {...MyMenuItemProps}
                    width={'140px'}
                    height={'52px'}
                    borderRadius={'46px'}
                    onClick={() => {
                      disconnectAsync().then((data) => {
                        console.log('wallet disconnected');
                        setLastWallet(null);
                        setIsWalletConnected(false);
                      });
                    }}
                  >
                    DISCONNECT
                    <Image
                      src={close.src}
                      width={'12px'}
                      height={'12px'}
                      alt="pfp"
                      marginLeft={'20px'}
                    />
                  </MenuItem>
                )}
              </MenuList>
            </Menu>
          )}
        </Flex>
      </Box>
    </Container>
  );
}
