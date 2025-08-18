import { StrategyInfo } from '@/store/strategies.atoms';
import { StrategyTxProps } from '@/store/transactions.atom';
import {
  DepositActionInputs,
  IStrategyActionHook,
  onStratAmountsChangeFn,
} from '@/strategies/IStrategy';
import {
  convertToMyNumber,
  convertToV1TokenInfo,
  MyMenuItemProps,
  MyMenuListProps,
} from '@/utils';
import MyNumber from '@/utils/MyNumber';
import {
  Box,
  Center,
  Flex,
  Text,
  VStack,
  NumberInput,
  NumberInputField,
  Grid,
  GridItem,
  Image as ImageC,
  Button,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
} from '@chakra-ui/react';
import { ChevronDownIcon } from '@chakra-ui/icons';
import { useAccount } from '@starknet-react/core';
import { atom, PrimitiveAtom, useAtom, useAtomValue, useSetAtom } from 'jotai';
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import TxButton from './TxButton';
import { provider } from '@/constants';
import { TokenInfo as TokenInfoV2, Web3Number } from '@strkfarm/sdk';
import { addressAtom } from '@/store/claims.atoms';
import { DUMMY_BAL_ATOM } from '@/store/balance.atoms';
import LoadingWrap from './LoadingWrap';
import mixpanel from 'mixpanel-browser';
import debounce from 'lodash.debounce';

interface RedeemProps {
  strategy: StrategyInfo<any>;
  buttonText: 'Deposit' | 'Redeem';
  callsInfo: (inputs: DepositActionInputs) => Promise<IStrategyActionHook[]>;
  isDualToken: boolean;
}

/**
 * Information about a token amount input field
 */
export interface AmountInputInfo {
  /** Whether the max button was clicked */
  isMaxClicked: boolean;
  /** Raw string value entered in input field (e.g. '', '0.1') */
  rawAmount: string;
  /** Converted Web3Number value for calculations and transactions */
  amount: Web3Number;
  /** Token information, null if not yet selected */
  tokenInfo: TokenInfoV2 | null;
}

/**
 * State shape for redeem form
 */
export type RedeemAtomType = {
  /** Array of atoms containing input info for each token */
  inputsInfo: PrimitiveAtom<AmountInputInfo>[];
  // deposit/withdrawMethods can return multiple options (which are actions)
  actionIndex: number;
  loading?: boolean;
  /** Optional callback when amounts change */
  onAmountsChange?: onStratAmountsChangeFn;
};

function getInputInfoAtoms() {
  return [1, 2].map((i) => {
    return atom<AmountInputInfo>({
      isMaxClicked: false,
      amount: Web3Number.fromWei('0', 0),
      tokenInfo: null,
      rawAmount: '',
    });
  });
}

/**
 * Derived atom of input infos
 */
export const inputsInfoAtoms = getInputInfoAtoms();

/**
 * Derived atom of input infos
 */
export const inputsInfoAtom = atom((get) => {
  return inputsInfoAtoms.map((i) => get(i));
});

// Create redeem atom with 2 token inputs (current max supported)
export const redeemAtom = atom<RedeemAtomType>({
  inputsInfo: inputsInfoAtoms,
  actionIndex: 0,
  loading: false,
  onAmountsChange: undefined,
});

/**
 * Derived atom that checks if max button was clicked for any input
 */
const isMaxClickedAtom = atom((get) => {
  const inputInfos = get(inputsInfoAtom);
  return inputInfos.some((a) => a.isMaxClicked);
});

export const updateInputInfoAtom = atom(
  null,
  (
    get,
    set,
    { index, info }: { index: number; info: Partial<AmountInputInfo> },
  ) => {
    const inputInfo = get(inputsInfoAtoms[index]);
    const newInputInfo = { ...inputInfo, ...info };
    console.log(`onAmountsChange [2]`, index, info, newInputInfo);
    set(inputsInfoAtoms[index], newInputInfo);
  },
);

export const resetRedeemFormAtom = atom(null, (get, set) => {
  const inputInfos = get(inputsInfoAtom);
  set(redeemAtom, {
    inputsInfo: getInputInfoAtoms(),
    actionIndex: 0,
    loading: false,
    onAmountsChange: undefined,
  });
  inputInfos.map((item, index) => {
    set(inputsInfoAtoms[index], {
      ...item,
      isMaxClicked: false,
      rawAmount: '',
      amount: Web3Number.fromWei('0', 0),
    });
  });
});

function InternalRedeem(props: RedeemProps) {
  const { address } = useAccount();
  const [callsInfo, setCallsInfo] = useState<IStrategyActionHook[]>([]);
  const [redeemInfo, setRedeemInfo] = useAtom(redeemAtom);
  const firstInputInfo = useAtomValue(inputsInfoAtoms[0]);
  const isMaxClicked = useAtomValue(isMaxClickedAtom);
  const inputsInfo = useAtomValue(inputsInfoAtom);
  const resetRedeemForm = useSetAtom(resetRedeemFormAtom);
  const setInputInfo = useSetAtom(updateInputInfoAtom);

  // Local state for slider and percentage input
  const [sliderValue, setSliderValue] = useState(0);
  const [percentageInput, setPercentageInput] = useState('');
  const [selectedToken, setSelectedToken] = useState<TokenInfoV2 | null>(null);
  const [availableTokens, setAvailableTokens] = useState<TokenInfoV2[]>([]);

  useEffect(() => {
    resetRedeemForm();
  }, []);

  // since we use a separate jotai provider,
  // need to set this again here
  const setAddress = useSetAtom(addressAtom);
  useEffect(() => {
    setAddress(address);
  }, [address]);

  // Initialize available tokens by calling props.callsInfo with default parameters
  useEffect(() => {
    const initializeTokens = async () => {
      try {
        // Get initial callsInfo to determine available tokens
        const initialCalls = await props.callsInfo({
          amount: MyNumber.fromZero(),
          amount2: undefined,
          address: address || '0x0',
          provider,
          isMax: false,
        });

        if (initialCalls.length > 0) {
          const tokens = initialCalls.map((c) => c.amounts[0].tokenInfo);
          setAvailableTokens(tokens);

          // Set the first token as selected if none is selected
          if (tokens.length > 0 && !selectedToken) {
            setSelectedToken(tokens[0]);
          }
        }
      } catch (error) {
        console.error('Error initializing available tokens:', error);
      }
    };

    initializeTokens();
  }, [address, props.callsInfo]);

  // Get balance data for selected token
  const balData = useAtomValue(
    (callsInfo.length > 0 && selectedToken
      ? callsInfo.find(
          (c) => c.amounts[0].tokenInfo.address === selectedToken.address,
        )?.amounts[0].balanceAtom
      : null) || DUMMY_BAL_ATOM,
  );

  const balance = useMemo(() => {
    return balData.data?.amount || MyNumber.fromZero();
  }, [balData]);

  const tvlInfo = useAtomValue(props.strategy.tvlAtom);

  // Calculate maximum allowed amount
  const maxAmount: MyNumber = useMemo(() => {
    if (!selectedToken) return MyNumber.fromZero();

    const currentTVL = Number(tvlInfo.data?.amounts[0].amount.toFixed(6) || 0);
    const maxAllowed = Number(balance.toEtherToFixedDecimals(8));

    const adjustedMaxAllowed = MyNumber.fromEther(
      maxAllowed.toFixed(6),
      selectedToken.decimals,
    );

    // Reserve gas amounts for specific tokens
    let reducedBalance = balance;
    if (selectedToken.name === 'STRK') {
      reducedBalance = balance.subtract(
        MyNumber.fromEther('1.5', selectedToken.decimals),
      );
    } else if (selectedToken.name === 'ETH') {
      reducedBalance = balance.subtract(
        MyNumber.fromEther('0.001', selectedToken.decimals),
      );
    }

    const min = MyNumber.min(reducedBalance, adjustedMaxAllowed);
    return MyNumber.max(min, MyNumber.fromEther('0', selectedToken.decimals));
  }, [balance, selectedToken, tvlInfo]);

  // Calculate actual amount from slider percentage
  const actualAmount = useMemo(() => {
    const percentage = sliderValue / 100;
    return maxAmount.operate('mul', percentage);
  }, [sliderValue, maxAmount]);

  // Handle slider change
  const handleSliderChange = useCallback(
    (value: number) => {
      const intValue = Math.round(value);
      setSliderValue(value);
      setPercentageInput(value.toString());
      if (selectedToken) {
        const percentage = value / 100;
        const newAmount = maxAmount.operate('mul', percentage);
        onAmountChange(newAmount, value === 100, newAmount.toEtherStr());
      }
    },
    [maxAmount, selectedToken],
  );

  // Handle percentage input change
  const handlePercentageInputChange = useCallback(
    (valueString: string, valueNumber: number) => {
      // Allow empty string and valid numbers
      if (isNaN(valueNumber)) valueNumber = 0;

      if (valueString === '' || (valueNumber >= 0 && valueNumber <= 100)) {
        setPercentageInput(valueString);
        setSliderValue(valueNumber);

        // Only update slider if we have a valid number

        if (selectedToken) {
          const percentage = valueNumber / 100;
          const newAmount = maxAmount.operate('mul', percentage);
          onAmountChange(
            newAmount,
            valueNumber === 100,
            newAmount.toEtherStr(),
          );
        }
      }
    },
    [maxAmount, selectedToken],
  );

  // Handle token selection
  const handleTokenChange = useCallback((token: TokenInfoV2) => {
    setSelectedToken(token);
    // Reset slider and percentage when changing token
    setSliderValue(0);
    setPercentageInput('');
    onAmountChange(MyNumber.fromZero(), false, '');
  }, []);

  // Handle MAX button click
  const handleMaxClick = useCallback(() => {
    setSliderValue(100);
    setPercentageInput('100');
    onAmountChange(maxAmount, true);
    if (selectedToken) {
      mixpanel.track('Chose max amount', {
        strategyId: props.strategy.id,
        strategyName: props.strategy.name,
        buttonText: props.buttonText,
        amount: maxAmount.toEtherStr(),
        token: selectedToken.name,
        maxAmount: maxAmount.toEtherStr(),
        address,
      });
    }
  }, [maxAmount, selectedToken, props.strategy, props.buttonText, address]);

  function onAmountChange(
    _amt: MyNumber,
    isMaxClicked: boolean,
    rawAmount = _amt.toEtherStr(),
  ) {
    if (!selectedToken) return;

    setInputInfo({
      index: 0,
      info: {
        tokenInfo: selectedToken,
        amount: Web3Number.fromWei(_amt.toString(), selectedToken.decimals),
        isMaxClicked,
        rawAmount,
      },
    });

    const updatedInputsInfo = inputsInfo.map((item, index) => {
      return {
        ...item,
        tokenInfo: props.strategy.metadata.depositTokens[index],
      };
    });

    checkAndTriggerOnAmountsChange(
      _amt,
      selectedToken,
      updatedInputsInfo,
      redeemInfo,
    );
  }

  const checkAndTriggerOnAmountsChange = debounce(function (
    _amt: MyNumber,
    _token: TokenInfoV2,
    _inputsInfo: AmountInputInfo[],
    _redeemInfo: RedeemAtomType,
  ) {
    if (!_redeemInfo.onAmountsChange) return;

    const _amtWeb3 = Web3Number.fromWei(_amt.toString(), _token.decimals);

    try {
      setRedeemInfo({
        ..._redeemInfo,
        loading: true,
      });

      _redeemInfo
        .onAmountsChange(
          {
            amountInfo: {
              amount: _amtWeb3,
              tokenInfo: _token,
            },
            index: 0,
          },
          [
            {
              amount: _amtWeb3,
              tokenInfo: _inputsInfo[0].tokenInfo!,
            },
            {
              amount:
                _inputsInfo[1].amount ||
                Web3Number.fromWei(
                  '0',
                  _inputsInfo[1].tokenInfo?.decimals || 18,
                ),
              tokenInfo: _inputsInfo[1].tokenInfo!,
            },
          ],
        )
        .then(async (output) => {
          output.map((item, _index) => {
            setInputInfo({
              index: _index,
              info: {
                ..._inputsInfo[_index],
                ...item,
                rawAmount: Number(
                  item.amount.toFixed(item.tokenInfo.decimals),
                ).toString(),
              },
            });
          });

          // If we have dual token amounts calculated, call withdrawMethods again with both amounts
          if (
            output.length >= 2 &&
            output[0].amount.greaterThan(0) &&
            output[1].amount.greaterThan(0)
          ) {
            try {
              const amount1 = new MyNumber(
                output[0].amount.toWei() || '0',
                output[0].tokenInfo.decimals,
              );
              const amount2 = new MyNumber(
                output[1].amount.toWei() || '0',
                output[1].tokenInfo.decimals,
              );

              const updatedCalls = await props.callsInfo({
                amount: amount1,
                amount2,
                address: address || '0x0',
                provider,
                isMax: isMaxClicked,
              });

              setCallsInfo(updatedCalls);
            } catch (error) {
              console.error(
                'Error updating callsInfo with dual amounts:',
                error,
              );
            }
          }

          setRedeemInfo({
            ..._redeemInfo,
            loading: false,
          });
        })
        .catch((err) => {
          console.error('onAmountsChange error', err);
          setRedeemInfo({
            ..._redeemInfo,
            loading: false,
          });
        });
    } catch (err) {
      console.error('onAmountsChange error', err);
    }
  }, 200);

  // Update callsInfo when selectedToken or amount changes
  useEffect(() => {
    if (!selectedToken) return;

    const amount1 = new MyNumber(
      firstInputInfo.amount.toWei() || '0',
      selectedToken.decimals,
    );

    props
      .callsInfo({
        amount: amount1,
        amount2: undefined,
        address: address || '0x0',
        provider,
        isMax: isMaxClicked,
      })
      .then((calls) => {
        setCallsInfo(calls);
        setRedeemInfo({
          ...redeemInfo,
          onAmountsChange: calls[0].onAmountsChange,
        });
      })
      .catch((e) => {
        console.error('Error in redeem methods', e);
      });
  }, [
    JSON.stringify(props.callsInfo),
    address,
    selectedToken,
    JSON.stringify(firstInputInfo),
    isMaxClicked,
  ]);

  const isRedeem = useMemo(() => props.buttonText === 'Redeem', [props]);

  const [loadingInvestmentSummary, setLoadingInvestmentSummary] =
    useState(false);
  const [investedSummary, setInvestedSummary] = useState<Web3Number | null>(
    null,
  );

  useEffect(() => {
    if (!callsInfo.length) {
      setInvestedSummary(null);
      return;
    }
    setInvestedSummary(firstInputInfo.amount);
    setLoadingInvestmentSummary(false);
  }, [callsInfo, firstInputInfo.amount]);

  const txInfo: StrategyTxProps = useMemo(() => {
    const tokenAddr = selectedToken?.address
      ? typeof selectedToken.address === 'string'
        ? selectedToken.address
        : selectedToken.address.address
      : props.strategy.settings.quoteToken.address.address;

    return {
      strategyId: props.strategy.id,
      actionType: props.buttonText === 'Redeem' ? 'withdraw' : 'deposit',
      amount: investedSummary
        ? convertToMyNumber(investedSummary)
        : MyNumber.fromZero(),
      tokenAddr,
    };
  }, [props, investedSummary, selectedToken]);

  const { calls } = useMemo(() => {
    const hook = callsInfo[redeemInfo.actionIndex];
    if (!hook) return { calls: [] };
    return { calls: hook.calls };
  }, [address, provider, isMaxClicked, callsInfo, redeemInfo]);

  const canSubmit = useMemo(() => {
    if (redeemInfo.loading) return false;
    if (!investedSummary || loadingInvestmentSummary) return false;
    return inputsInfo.some((a) => a.amount.greaterThan(0));
  }, [redeemInfo, loadingInvestmentSummary, investedSummary, inputsInfo]);

  return (
    <Box>
      <VStack width={'100%'} gap={5}>
        <Box width="100%">
          <Grid templateColumns="repeat(2, 1fr)" gap={4}>
            <GridItem>
              <Box>
                <Menu>
                  <MenuButton
                    as={Button}
                    height={'100%'}
                    minHeight={'42px'}
                    rightIcon={<ChevronDownIcon />}
                    bgColor={'#212121'}
                    borderColor={'#363636'}
                    borderWidth={'1px'}
                    borderRadius={'46px'}
                    color="#FFF"
                    padding={'0px 12px'}
                    _hover={{
                      bg: '#212121',
                    }}
                  >
                    <Center>
                      {selectedToken && (
                        <ImageC
                          src={selectedToken.logo}
                          alt={selectedToken.symbol}
                          width={'20px'}
                          marginRight="20px"
                        />
                      )}
                      {selectedToken ? selectedToken.symbol : 'Select token'}
                    </Center>
                  </MenuButton>
                  <MenuList {...MyMenuListProps}>
                    {availableTokens.map((token) => (
                      <MenuItem
                        key={token.symbol}
                        {...MyMenuItemProps}
                        borderRadius={'9px'}
                        onClick={() => handleTokenChange(token)}
                      >
                        <Center>
                          <ImageC
                            src={token.logo}
                            alt={token.symbol}
                            width={'20px'}
                            marginRight="20px"
                          />
                          {token.symbol}
                        </Center>
                      </MenuItem>
                    ))}
                  </MenuList>
                </Menu>
              </Box>
            </GridItem>
            <GridItem>
              <Box color={'light_grey'} textAlign={'right'}>
                <LoadingWrap
                  isLoading={balData.isLoading || balData.isPending}
                  isError={balData.isError}
                  skeletonProps={{
                    height: '10px',
                    width: '50px',
                    float: 'right',
                    marginTop: '8px',
                    marginLeft: '5px',
                  }}
                  iconProps={{
                    marginLeft: '5px',
                    boxSize: '15px',
                  }}
                >
                  <Button
                    size={'sm'}
                    marginLeft={'15px'}
                    color="#FFF"
                    bg="#323232"
                    padding="3px 12px"
                    maxHeight={'21px'}
                    fontSize={'12px'}
                    fontWeight={'400'}
                    _active={{
                      bg: '#323232',
                      color: '#FFF',
                    }}
                    _hover={{
                      bg: '#323232',
                      color: '#FFF',
                    }}
                    onClick={handleMaxClick}
                    isDisabled={balance.isZero()}
                  >
                    Max
                  </Button>
                </LoadingWrap>
              </Box>
            </GridItem>
          </Grid>

          <Box marginTop={'20px'}>
            <Flex align="center" marginBottom={'10px'}>
              <Box
                position="relative"
                borderRadius="6px"
                background="linear-gradient(#1A1919, #1A1919) padding-box, linear-gradient(to right, #2E45D0, #B1525C) border-box"
                border="2px solid transparent"
                minHeight={'42px'}
                p="0"
              >
                <NumberInput
                  value={percentageInput}
                  onChange={handlePercentageInputChange}
                  min={0}
                  max={100}
                  precision={0}
                  step={1}
                  size="sm"
                  width="80px"
                  height={'42px'}
                  isDisabled={balance.isZero()}
                  keepWithinRange={false}
                  clampValueOnBlur={false}
                >
                  <NumberInputField
                    bg="transparent"
                    color="white"
                    border="none"
                    _hover={{ borderColor: '#1A1919' }}
                    _focus={{ borderColor: '#1A1919' }}
                    fontSize={'16px'}
                    textAlign="center"
                    paddingRight="20px"
                    height={'42px'}
                    borderRadius={'6px'}
                  />
                </NumberInput>
                <Text
                  position="absolute"
                  right="16px"
                  top="50%"
                  transform="translateY(-50%)"
                  fontSize={'16px'}
                  color="#FFF"
                  pointerEvents="none"
                  fontWeight="bold"
                >
                  %
                </Text>
              </Box>
              <Box
                padding={'0px 12px'}
                bg={'#1A1919'}
                height={'42px'}
                width={'100%'}
                marginLeft={'20px'}
                alignItems={'center'}
              >
                <Text
                  fontSize={'16px'}
                  color="white"
                  fontWeight={'bold'}
                  width={'100%'}
                  marginTop={'9px'}
                >
                  {actualAmount.toEtherToFixedDecimals(4)}{' '}
                  {selectedToken?.symbol || ''}
                </Text>
              </Box>
            </Flex>
            <Slider
              aria-label="amount-slider"
              value={sliderValue}
              onChange={handleSliderChange}
              focusThumbOnChange={false}
              min={0}
              max={100}
              step={1}
              isDisabled={balance.isZero()}
            >
              <SliderTrack bg="#323232" height="6px">
                <SliderFilledTrack bg="linear-gradient(to right, #2E45D0, #B1525C)" />
              </SliderTrack>
              <SliderThumb bg="#B1525C" margin={'0px 16px 0px 8px'} />
            </Slider>

            {/*<Flex justify="space-between" marginTop={'5px'}>*/}
            {/*  <Text fontSize={'10px'} color="light_grey">0%</Text>*/}
            {/*  <Text fontSize={'10px'} color="light_grey">25%</Text>*/}
            {/*  <Text fontSize={'10px'} color="light_grey">50%</Text>*/}
            {/*  <Text fontSize={'10px'} color="light_grey">75%</Text>*/}
            {/*  <Text fontSize={'10px'} color="light_grey">100%</Text>*/}
            {/*</Flex>*/}
          </Box>
        </Box>
      </VStack>

      <Center marginTop={'10px'}>
        <TxButton
          txInfo={txInfo}
          buttonText={props.buttonText}
          text={
            redeemInfo.loading || loadingInvestmentSummary
              ? 'Loading...'
              : props.buttonText
          }
          calls={calls}
          buttonProps={{
            isDisabled: !canSubmit,
          }}
          selectedMarket={convertToV1TokenInfo(
            selectedToken || props.strategy.settings.quoteToken,
          )}
          strategy={props.strategy}
          resetDepositForm={() => {
            resetRedeemForm();
            setSliderValue(0);
            setPercentageInput('');
          }}
        />
      </Center>
    </Box>
  );
}

export default function Redeem(props: RedeemProps) {
  return <InternalRedeem {...props} />;
}
