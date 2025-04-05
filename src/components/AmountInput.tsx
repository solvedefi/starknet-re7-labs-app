import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Box,
  Text,
  GridItem,
  NumberInput,
  NumberInputField,
  Image as ImageC,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Button,
  Tooltip,
  Grid,
  Menu,
  MenuButton,
  Center,
  MenuList,
  MenuItem,
} from '@chakra-ui/react';
import { useAccount } from '@starknet-react/core';
import { useAtom, useAtomValue, Atom, useSetAtom } from 'jotai';
import { TokenInfo as TokenInfoV2, Web3Number } from '@strkfarm/sdk';
import {
  AmountInputInfo,
  depositAtom,
  inputsInfoAtom,
  updateInputInfoAtom,
} from './Deposit';
import mixpanel from 'mixpanel-browser';
import { AtomWithQueryResult } from 'jotai-tanstack-query';
import { BalanceResult, DUMMY_BAL_ATOM } from '@/store/balance.atoms';
import { StrategyInfo } from '@/store/strategies.atoms';
import MyNumber from '@/utils/MyNumber';
import LoadingWrap from './LoadingWrap';
import { ChevronDownIcon } from '@chakra-ui/icons';
import { MyMenuItemProps, MyMenuListProps } from '@/utils';
import debounce from 'lodash.debounce';

interface AmountInputProps {
  index: number;
  tokenInfo: TokenInfoV2;
  balanceAtom?: Atom<AtomWithQueryResult<BalanceResult, Error>>;
  strategy: StrategyInfo<any>;
  isDeposit: boolean;
  buttonText: string;
  supportedTokens: TokenInfoV2[];
}

export interface AmountInputRef {
  reset: () => void;
}

/**
 * AmountInput component handles token amount input with balance and TVL validation
 * @param props Component properties including token info, strategy details, and mode
 * @param ref Ref to expose reset functionality to parent
 */
export function AmountInput(props: AmountInputProps) {
  // Input state
  const [dirty, setDirty] = useState(false);

  // External state
  const tvlInfo = useAtomValue(props.strategy.tvlAtom);
  const { address } = useAccount();
  const [depositInfo, setDepositInfo] = useAtom(depositAtom);
  const setInputInfo = useSetAtom(updateInputInfoAtom);
  const inputsInfo = useAtomValue(inputsInfoAtom);

  const inputInfo = useMemo(() => {
    if (props.index < 0 || props.index >= inputsInfo.length)
      throw new Error(`Invalid index: ${props.index}`);
    return inputsInfo[props.index];
  }, [inputsInfo, props.index]);

  // Default token state
  const [selectedMarket, setSelectedMarket] = useState<TokenInfoV2>(
    props.tokenInfo,
  );

  // Get balance data
  const balData = useAtomValue(props.balanceAtom || DUMMY_BAL_ATOM);
  const balance = useMemo(() => {
    return balData.data?.amount || MyNumber.fromZero();
  }, [balData]);

  const isMinAmountError: boolean = useMemo(() => {
    if (!dirty) return false;

    const isAtleastOneNonZero = inputsInfo.some((item) => item.amount.gt(0));
    if (isAtleastOneNonZero) {
      return false;
    }
    return true;
  }, [inputsInfo]);
  /**
   * Calculate maximum allowed amount based on:
   * - TVL limits for deposits
   * - Balance minus gas reserves for specific tokens
   * - Zero as minimum
   */
  const maxAmount: MyNumber = useMemo(() => {
    const currentTVL = Number(tvlInfo.data?.amounts[0].amount.toFixed(6) || 0);
    const maxAllowed =
      props.isDeposit && props.strategy.settings.maxTVL !== 0
        ? props.strategy.settings.maxTVL - currentTVL
        : Number(balance.toEtherToFixedDecimals(8));

    const adjustedMaxAllowed = MyNumber.fromEther(
      maxAllowed.toFixed(6),
      selectedMarket.decimals,
    );

    // Reserve gas amounts for specific tokens
    let reducedBalance = balance;
    if (props.isDeposit) {
      if (selectedMarket.name === 'STRK') {
        reducedBalance = balance.subtract(
          MyNumber.fromEther('1.5', selectedMarket.decimals),
        );
      } else if (selectedMarket.name === 'ETH') {
        reducedBalance = balance.subtract(
          MyNumber.fromEther('0.001', selectedMarket.decimals),
        );
      }
    }

    const min = MyNumber.min(reducedBalance, adjustedMaxAllowed);
    return MyNumber.max(min, MyNumber.fromEther('0', selectedMarket.decimals));
  }, [balance, props.strategy, selectedMarket, props.isDeposit, tvlInfo]);

  function onAmountChange(
    _amt: MyNumber,
    isMaxClicked: boolean,
    rawAmount = _amt.toEtherStr(),
    _token = props.tokenInfo,
  ) {
    updateTokenInfo({
      tokenInfo: _token,
      amount: Web3Number.fromWei(_amt.toString(), _token.decimals),
      isMaxClicked,
      rawAmount,
    });

    checkAndTriggerOnAmountsChange(_amt, _token);
  }

  function checkAndTriggerOnAmountsChange(
    _amt: MyNumber,
    _token: TokenInfoV2 = props.tokenInfo,
  ) {
    // if onAmountsChange defined
    const isAllTokenInfosDefined = inputsInfo.every((item) => item.tokenInfo);
    console.log(
      'onAmountsChange [11.3] [2.1]',
      props.index,
      isAllTokenInfosDefined,
      props.buttonText,
      inputsInfo,
      depositInfo.onAmountsChange,
    );
    if (!isAllTokenInfosDefined || !depositInfo.onAmountsChange) {
      return;
    }
    const _amtWeb3 = Web3Number.fromWei(_amt.toString(), _token.decimals);
    console.log('onAmountsChange [2.2]', _amtWeb3);
    try {
      setDepositInfo({
        ...depositInfo,
        loading: true,
      });
      depositInfo
        .onAmountsChange(
          {
            amountInfo: {
              amount: _amtWeb3,
              tokenInfo: _token,
            },
            index: props.index,
          },
          inputsInfo.map((item, index) => {
            if (index == props.index) {
              return {
                amount: _amtWeb3,
                tokenInfo: _token,
              };
            }
            return {
              amount: item.amount,
              tokenInfo: item.tokenInfo!,
            };
          }),
        )
        .then((output) => {
          console.log('onAmountsChange [2.3]', output);
          output.map((item, _index) => {
            setInputInfo({
              index: _index,
              info: {
                ...inputsInfo[_index],
                ...item,
                rawAmount: Number(item.amount.toFixed(6)).toString(),
              },
            });
          });
          setDepositInfo({
            ...depositInfo,
            loading: false,
          });
        })
        .catch((err) => {
          console.log('onAmountsChange [2.4]', err);
          setDepositInfo({
            ...depositInfo,
            loading: false,
          });
        });
    } catch (err) {
      console.log('onAmountsChange [2.5] err', err);
    }
  }

  function BalanceComponent(props: {
    token: TokenInfoV2;
    strategy: StrategyInfo<any>;
    buttonText: string;
  }) {
    const handleMaxClick = useCallback(() => {
      onAmountChange(maxAmount, true);
      mixpanel.track('Chose max amount', {
        strategyId: props.strategy.id,
        strategyName: props.strategy.name,
        buttonText: props.buttonText,
        amount: inputInfo.amount.toFixed(2),
        token: selectedMarket.name,
        maxAmount: maxAmount.toEtherStr(),
        address,
      });
    }, [
      maxAmount,
      inputInfo,
      selectedMarket,
      props.strategy,
      props.buttonText,
      address,
    ]);

    const isLoading = balData.isLoading || balData.isPending;

    return (
      <Box color={'light_grey'} textAlign={'right'}>
        <Text>Available balance </Text>
        <LoadingWrap
          isLoading={isLoading}
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
          <Tooltip label={balance.toEtherStr()}>
            <b style={{ marginLeft: '5px' }}>
              {balance.toEtherToFixedDecimals(4)}
            </b>
          </Tooltip>
          <Button
            size={'sm'}
            marginLeft={'5px'}
            color="color2"
            bg="highlight"
            padding="0"
            maxHeight={'25px'}
            _hover={{
              bg: 'highlight',
              color: 'color_50p',
            }}
            _active={{
              bg: 'highlight',
              color: 'color_50p',
            }}
            onClick={handleMaxClick}
            isDisabled={isLoading || balData.isError}
            aria-label="Set maximum amount"
          >
            [Max]
          </Button>
        </LoadingWrap>
      </Box>
    );
  }

  function updateTokenInfo(inputInfo: AmountInputInfo) {
    const { amount, tokenInfo: _t, isMaxClicked, rawAmount } = inputInfo;
    console.log(
      `onAmountsChange [10.1]`,
      amount.toWei(),
      inputInfo,
      props.index,
      props.buttonText,
    );
    const tokenInfo = _t!;
    const _amount = Web3Number.fromWei(amount.toWei(), tokenInfo.decimals);
    setInputInfo({
      index: props.index,
      info: {
        amount: _amount,
        tokenInfo,
        isMaxClicked,
        rawAmount,
      },
    });
  }

  useEffect(() => {
    console.log(
      'onAmountsChange [11]',
      inputInfo,
      props.index,
      props.buttonText,
    );
  }, [inputInfo]);

  useEffect(() => {
    const isAllTokenInfosDefined = inputsInfo.every((item) => item.tokenInfo);
    console.log(
      'onAmountsChange [11.2]',
      inputsInfo,
      props.index,
      isAllTokenInfosDefined,
      props.buttonText,
    );
  }, [inputsInfo]);

  useEffect(() => {
    console.log('onAmountsChange [3]', props);
    updateTokenInfo({
      amount: Web3Number.fromWei('0', props.tokenInfo.decimals),
      tokenInfo: props.tokenInfo,
      isMaxClicked: false,
      rawAmount: '',
    });
  }, []);

  const handleDebouncedChange = debounce(
    (newAmount: MyNumber, valueStr: string) => {
      checkAndTriggerOnAmountsChange(newAmount, props.tokenInfo);

      // Track user input
      mixpanel.track('Enter amount', {
        strategyId: props.strategy.id,
        strategyName: props.strategy.name,
        buttonText: props.buttonText,
        amount: inputInfo.amount.toFixed(2),
        token: selectedMarket.name,
        maxAmount: maxAmount.toEtherStr(),
        address,
      });
    },
    100,
  ); // ms delay

  return (
    <Box width={'100%'}>
      {/* Token selection and balance display */}
      <Grid templateColumns="repeat(5, 1fr)" gap={6}>
        <GridItem colSpan={2}>
          <Menu>
            <MenuButton
              as={Button}
              height={'100%'}
              rightIcon={<ChevronDownIcon />}
              bgColor={'highlight'}
              borderColor={'bg'}
              borderWidth={'1px'}
              color="color2"
              _hover={{
                bg: 'bg',
              }}
            >
              <Center>
                <ImageC
                  src={props.tokenInfo.logo}
                  alt={props.tokenInfo.symbol}
                  width={'20px'}
                  marginRight="5px"
                />
                {props.tokenInfo.symbol}
              </Center>
            </MenuButton>
            <MenuList {...MyMenuListProps}>
              {props.supportedTokens.map((token) => (
                <MenuItem
                  key={token.symbol}
                  {...MyMenuItemProps}
                  onClick={() => {
                    if (selectedMarket.name !== token.symbol) {
                      setSelectedMarket(token);
                      setDirty(false);
                      onAmountChange(
                        new MyNumber('0', token.decimals),
                        inputInfo.isMaxClicked,
                        '',
                        token,
                      );
                    }
                  }}
                >
                  <Center>
                    <ImageC
                      src={token.logo}
                      alt={token.symbol}
                      width={'20px'}
                      marginRight="5px"
                    />
                    {token.symbol}
                  </Center>
                </MenuItem>
              ))}
            </MenuList>
          </Menu>
        </GridItem>
        <GridItem colSpan={3}>
          <BalanceComponent
            token={selectedMarket}
            strategy={props.strategy}
            buttonText={props.buttonText}
          />
        </GridItem>
      </Grid>

      {/* Amount input with validation */}
      <NumberInput
        min={0}
        max={parseFloat(maxAmount.toEtherStr())}
        color={'white'}
        bg={'bg'}
        borderRadius={'10px'}
        onChange={(valueStr, n) => {
          const newAmount =
            valueStr && Number(valueStr) > 0
              ? MyNumber.fromEther(valueStr, selectedMarket.decimals)
              : new MyNumber('0', selectedMarket.decimals);

          setDirty(true);
          updateTokenInfo({
            tokenInfo: props.tokenInfo,
            amount: Web3Number.fromWei(
              newAmount.toString(),
              props.tokenInfo.decimals,
            ),
            isMaxClicked: inputInfo.isMaxClicked,
            rawAmount: valueStr,
          });
          handleDebouncedChange(newAmount, valueStr);
        }}
        marginTop={'10px'}
        keepWithinRange={false}
        clampValueOnBlur={false}
        value={inputInfo.rawAmount}
        isDisabled={maxAmount.isZero()}
      >
        <NumberInputField
          border={'0px'}
          borderRadius={'10px'}
          placeholder="Amount"
        />
        <NumberInputStepper>
          <NumberIncrementStepper color={'white'} border={'0px'} />
          <NumberDecrementStepper color={'white'} border={'0px'} />
        </NumberInputStepper>
      </NumberInput>

      {/* Validation error messages */}
      {isMinAmountError && dirty && (
        <Text marginTop="2px" marginLeft={'7px'} color="red" fontSize={'13px'}>
          Amount must be greater than 0
        </Text>
      )}
      {inputInfo.amount.gt(maxAmount.toEtherStr()) && (
        <Text marginTop="2px" marginLeft={'7px'} color="red" fontSize={'13px'}>
          Amount must be less than {maxAmount.toEtherToFixedDecimals(2)}
        </Text>
      )}
    </Box>
  );
}
