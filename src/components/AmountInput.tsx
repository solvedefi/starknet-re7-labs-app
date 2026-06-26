import React, {
  useState,
  useCallback,
  useMemo,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { useAccount } from '@starknet-react/core';
import { useAtom, useAtomValue, Atom, useSetAtom } from 'jotai';
import { TokenInfo as TokenInfoV2, Web3Number } from '@strkfarm/sdk';
import {
  AmountInputInfo,
  depositAtom,
  DepositAtomType,
  inputsInfoAtom,
  updateInputInfoAtom,
} from './Deposit';
import mixpanel from 'mixpanel-browser';
import { AtomWithQueryResult } from 'jotai-tanstack-query';
import { BalanceResult, DUMMY_BAL_ATOM } from '@/store/balance.atoms';
import { StrategyInfo } from '@/store/strategies.atoms';
import MyNumber from '@/utils/MyNumber';
import LoadingWrap from './LoadingWrap';
import debounce from 'lodash.debounce';
import TokenBadge from './TokenBadge';
import { formatTokenBalance } from '@/utils';
import { SimpleTooltip } from './ui/simple-tooltip';

interface AmountInputProps {
  index: number;
  tokenInfo: TokenInfoV2;
  balanceAtom?: Atom<AtomWithQueryResult<BalanceResult, Error>>;
  strategy: StrategyInfo<any>;
  isDeposit: boolean;
  buttonText: string;
  supportedTokens: TokenInfoV2[];
  error: string;
  setError: (error: string) => void;
}

export interface AmountInputRef {
  reset: () => void;
}

/**
 * AmountInput component handles token amount input with balance and TVL validation
 * @param props Component properties including token info, strategy details, and mode
 * @param ref Ref to expose reset functionality to parent
 */
const AmountInput = forwardRef(
  (props: AmountInputProps, ref: React.ForwardedRef<AmountInputRef>) => {
    // Input state
    const { error, setError } = props;

    // External state
    const tvlInfo = useAtomValue(props.strategy.tvlAtom);
    const { address } = useAccount();
    const [depositInfo, setDepositInfo] = useAtom(depositAtom);
    const setInputInfo = useSetAtom(updateInputInfoAtom);
    const inputsInfo = useAtomValue(inputsInfoAtom);
    const [simulatedMaxAmount, setSimulatedMaxAmount] = useState({
      isSet: false,
      amount: 1e18,
    }); // some random big amount to start with

    const inputInfo = useMemo(() => {
      if (props.index < 0 || props.index >= inputsInfo.length)
        throw new Error(`Invalid index: ${props.index}`);
      return inputsInfo[props.index];
    }, [inputsInfo, props.index]);

    const isMinAmountError: boolean = useMemo(() => {
      if (!inputInfo.rawAmount.trim()) return false;

      const inputItem = inputsInfo[props.index];
      const roundedAmount = Number(
        inputItem.amount.toFixed(props.tokenInfo.decimals),
      );
      const isGreaterThanZero = roundedAmount > 0;

      if (isGreaterThanZero) {
        return false;
      }
      return true;
    }, [inputsInfo, inputInfo.rawAmount]);

    // Default token state
    const [selectedMarket] = useState<TokenInfoV2>(props.tokenInfo);

    useImperativeHandle(ref, () => ({
      reset: () => {
        updateTokenInfo({
          amount: Web3Number.fromWei('0', props.tokenInfo.decimals),
          tokenInfo: props.tokenInfo,
          isMaxClicked: false,
          rawAmount: '',
        });
      },
    }));

    // Get balance data
    const balData = useAtomValue(props.balanceAtom || DUMMY_BAL_ATOM);
    const balance = useMemo(() => {
      return balData.data?.amount || MyNumber.fromZero();
    }, [balData]);

    /**
     * Calculate maximum allowed amount based on:
     * - TVL limits for deposits
     * - Balance minus gas reserves for specific tokens
     * - Zero as minimum
     */
    const maxAmount: MyNumber = useMemo(() => {
      const currentTVL = Number(
        tvlInfo.data?.amounts[0].amount.toFixed(6) || 0,
      );
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
        }
      }

      // simulation check
      const postSimulationMax = MyNumber.min(
        adjustedMaxAllowed,
        MyNumber.fromEther(
          simulatedMaxAmount.amount.toFixed(13),
          selectedMarket.decimals,
        ),
      );

      const min = MyNumber.min(reducedBalance, postSimulationMax);
      return MyNumber.max(
        min,
        MyNumber.fromEther('0', selectedMarket.decimals),
      );
    }, [
      balance,
      props.strategy,
      selectedMarket,
      props.isDeposit,
      tvlInfo,
      simulatedMaxAmount.amount,
    ]);

    // Error setting
    useEffect(() => {
      if (isMinAmountError) {
        setError('Amount must be greater than 0');
        return;
      }
      if (inputInfo.amount.gt(maxAmount.toEtherStr())) {
        setError(`You do not have enough balance of ${props.tokenInfo.symbol}`);
        return;
      }
      setError('');
    }, [isMinAmountError, inputInfo.amount, maxAmount, setError]);

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

      checkAndTriggerOnAmountsChange(_amt, _token, inputsInfo, depositInfo);
    }

    function checkAndTriggerOnAmountsChange(
      _amt: MyNumber,
      _token: TokenInfoV2 = props.tokenInfo,
      _inputsInfo: AmountInputInfo[],
      _depositInfo: DepositAtomType,
    ) {
      // if onAmountsChange defined
      const isAllTokenInfosDefined = _inputsInfo.every(
        (item) => item.tokenInfo,
      );
      if (!isAllTokenInfosDefined || !_depositInfo.onAmountsChange) {
        return;
      }
      if (_amt.isZero()) {
        for (let i = 0; i < _inputsInfo.length; i++) {
          if (i === props.index) {
            continue;
          }
          setInputInfo({
            index: i,
            info: {
              ..._inputsInfo[i],
              amount: Web3Number.fromWei(
                '0',
                _inputsInfo[i].tokenInfo?.decimals || 0,
              ),
              isMaxClicked: false,
              rawAmount: '0',
            },
          });
        }
        setDepositInfo({
          ..._depositInfo,
          loading: false,
        });
        return;
      }
      const _amtWeb3 = Web3Number.fromWei(_amt.toString(), _token.decimals);
      try {
        setDepositInfo({
          ..._depositInfo,
          loading: true,
        });
        _depositInfo
          .onAmountsChange(
            {
              amountInfo: {
                amount: _amtWeb3,
                tokenInfo: _token,
              },
              index: props.index,
            },
            _inputsInfo.map((item, index) => {
              if (index === props.index) {
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
            output.map((item, _index) => {
              if (_index !== props.index) {
                setInputInfo({
                  index: _index,
                  info: {
                    ..._inputsInfo[_index],
                    ...item,
                    rawAmount: Number(item.amount).toLocaleString('en-US', {
                      useGrouping: false,
                      maximumFractionDigits: item.tokenInfo.decimals, // set higher if needed
                    }),
                  },
                });
              }
            });
            setDepositInfo({
              ..._depositInfo,
              loading: false,
            });
          })
          .catch(() => {
            setDepositInfo({
              ..._depositInfo,
              loading: false,
            });
          });
      } catch {
        // deposit preview is best-effort; ignore failures
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
        <div className="text-right text-light_grey">
          <p className="text-[12px]">Available balance </p>
          <LoadingWrap
            isLoading={isLoading}
            isError={balData.isError}
            skeletonProps={{
              height: '10px',
              width: '50px',
              className: 'float-right ml-[5px] mt-[8px]',
            }}
          >
            <SimpleTooltip label={balance.toEtherStr()}>
              <b
                style={{
                  marginLeft: '5px',
                  fontSize: '12px',
                  fontWeight: '400',
                }}
              >
                {formatTokenBalance(balance, 4)}
              </b>
            </SimpleTooltip>
            <button
              type="button"
              className="ml-[15px] max-h-[21px] rounded bg-[#323232] px-3 py-[3px] text-[12px] font-normal text-white hover:bg-[#323232] disabled:opacity-50"
              onClick={handleMaxClick}
              disabled={isLoading || balData.isError || balance.isZero()}
              aria-label="Set maximum amount"
            >
              Max
            </button>
          </LoadingWrap>
        </div>
      );
    }

    function updateTokenInfo(inputInfo: AmountInputInfo) {
      const { amount, tokenInfo: _t, isMaxClicked, rawAmount } = inputInfo;
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
      updateTokenInfo({
        amount: Web3Number.fromWei('0', props.tokenInfo.decimals),
        tokenInfo: props.tokenInfo,
        isMaxClicked: false,
        rawAmount: '',
      });
    }, []);

    useEffect(() => {
      if (
        !depositInfo ||
        !depositInfo.onAmountsChange ||
        simulatedMaxAmount.isSet
      ) {
        return;
      }
      // SDK 2.0's assertValidDepositTokens reads tokenInfo.decimals on every
      // entry, so skip the simulation until each input has resolved its
      // tokenInfo (otherwise we crash with "Cannot read properties of null").
      const isAllTokenInfosDefined = inputsInfo.every((item) => item.tokenInfo);
      if (!isAllTokenInfosDefined) {
        return;
      }
      // simulate deposits using a large amount
      const amt = new Web3Number(10000000, props.tokenInfo.decimals);
      depositInfo
        .onAmountsChange(
          {
            amountInfo: {
              amount: amt,
              tokenInfo: props.tokenInfo,
            },
            index: props.index,
          },
          inputsInfo.map((item, index) => {
            if (index === props.index) {
              return {
                amount: amt,
                tokenInfo: props.tokenInfo,
              };
            }
            return {
              amount: Web3Number.fromWei('0', item.tokenInfo!.decimals),
              tokenInfo: item.tokenInfo!,
            };
          }),
        )
        .then((output) => {
          output.map((item, _index) => {
            if (_index === props.index) {
              setSimulatedMaxAmount({
                isSet: true,
                amount: Number(item.amount.toFixed(13)),
              });
            }
          });
        });
    }, [depositInfo.onAmountsChange, simulatedMaxAmount.isSet]);

    const handleDebouncedChange = useCallback(
      debounce(
        (
          newAmount: MyNumber,
          valueStr: string,
          _inputsInfo: AmountInputInfo[],
          _depositInfo: DepositAtomType,
        ) => {
          if (valueStr.trim() === '') {
            inputsInfo.forEach((item, index) => {
              setInputInfo({
                index,
                info: {
                  ...item,
                  isMaxClicked: false,
                  rawAmount: '',
                  tokenInfo: props.strategy.metadata.depositTokens[index],
                },
              });
            });
          } else {
            checkAndTriggerOnAmountsChange(
              newAmount,
              props.tokenInfo,
              _inputsInfo,
              _depositInfo,
            );
          }

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
        500,
      ),
      [],
    ); // ms delay

    return (
      <div className="w-full">
        {/* Token selection and balance display */}
        <div className="grid grid-cols-5 gap-[16px]">
          <div className="col-span-2">
            <TokenBadge
              symbol={props.tokenInfo.symbol}
              iconSrc={props.tokenInfo.logo}
            />
          </div>
          <div className="col-span-3">
            <BalanceComponent
              token={selectedMarket}
              strategy={props.strategy}
              buttonText={props.buttonText}
            />
          </div>
        </div>

        {/* Amount input with validation */}
        <input
          type="number"
          min={0}
          max={parseFloat(maxAmount.toEtherStr())}
          placeholder="Amount"
          className="mt-5 h-[60px] w-full rounded-[10px] border-0 bg-[#1A1919] px-4 text-white placeholder:text-gray-500 focus:outline-none disabled:opacity-50"
          value={inputInfo.rawAmount}
          disabled={maxAmount.isZero()}
          onKeyDown={(e) => {
            if (['ArrowUp', 'ArrowDown', 'End', 'Home'].includes(e.key)) {
              e.preventDefault();
            }
          }}
          onChange={(e) => {
            let valueStr = e.target.value;
            valueStr = valueStr.replace(/[-+e]/gi, '');
            const decimalIndex = valueStr.indexOf('.');
            if (decimalIndex !== -1) {
              const inputWhole = valueStr.slice(0, decimalIndex);
              let inputDecimal = valueStr.slice(decimalIndex + 1);
              inputDecimal = inputDecimal.replace('.', '');
              inputDecimal = inputDecimal.slice(0, props.tokenInfo.decimals);
              valueStr = `${inputWhole}.${inputDecimal}`;
            }
            const newAmount =
              valueStr && Number(valueStr) > 0
                ? MyNumber.fromEther(valueStr, selectedMarket.decimals)
                : new MyNumber('0', selectedMarket.decimals);

            updateTokenInfo({
              tokenInfo: props.tokenInfo,
              amount: Web3Number.fromWei(
                newAmount.toString(),
                props.tokenInfo.decimals,
              ),
              isMaxClicked: inputInfo.isMaxClicked,
              rawAmount: valueStr,
            });
            handleDebouncedChange(newAmount, valueStr, inputsInfo, depositInfo);
          }}
        />

        {/* Validation error messages */}
        {simulatedMaxAmount.amount === 0 && (
          <SimpleTooltip
            label={
              <span>
                The liquidity at the current market price, is only in{' '}
                {
                  inputsInfo.find((_, index) => index !== props.index)
                    ?.tokenInfo?.symbol
                }
                . It may be in {props.tokenInfo.symbol}, when the market price
                re-aligns.
              </span>
            }
          >
            <p className="ml-[7px] mt-[2px] text-[12px] text-light_grey">
              The liquidity at the current market price, is only in{' '}
              {
                inputsInfo.find((_, index) => index !== props.index)?.tokenInfo
                  ?.symbol
              }
              .{' '}
              <a
                href="https://docs.troves.fi/p/ekubo-cl-vaults"
                className="underline"
              >
                Learn more
              </a>
              .
            </p>
          </SimpleTooltip>
        )}
        {error && (
          <p className="ml-[7px] mt-[2px] text-[13px] text-red">{error}</p>
        )}
      </div>
    );
  },
);

AmountInput.displayName = 'AmountInput';
export default AmountInput;
