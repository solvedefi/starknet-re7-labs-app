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
  formatTokenBalance,
} from '@/utils';
import MyNumber from '@/utils/MyNumber';
import { SimpleTooltip } from './ui/simple-tooltip';
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
import TokenBadge from './TokenBadge';

interface RedeemProps {
  strategy: StrategyInfo<any>;
  buttonText: 'Deposit' | 'Redeem';
  callsInfo: (inputs: DepositActionInputs) => Promise<IStrategyActionHook[]>;
  isDualToken: boolean;
}

/**
 * Information about a token amount input field
 */
interface AmountInputInfo {
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
type RedeemAtomType = {
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
const inputsInfoAtoms = getInputInfoAtoms();

/**
 * Derived atom of input infos
 */
const inputsInfoAtom = atom((get) => {
  return inputsInfoAtoms.map((i) => get(i));
});

// Create redeem atom with 2 token inputs (current max supported)
const redeemAtom = atom<RedeemAtomType>({
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

const updateInputInfoAtom = atom(
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

const resetRedeemFormAtom = atom(null, (get, set) => {
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
  const strategyBalances = useAtomValue(props.strategy.balancesAtom);

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
          const tokens = initialCalls[0].amounts.map((a) => a.tokenInfo);
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

  const balanceByToken = useMemo(() => {
    return strategyBalances.map(
      (balance) => balance.amount || MyNumber.fromZero(),
    );
  }, [strategyBalances]);

  const totalBalance = balanceByToken.reduce(
    (acc, curr) => acc.operate('plus', curr.toString()),
    MyNumber.fromZero(),
  );

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
    }

    const min = MyNumber.min(reducedBalance, adjustedMaxAllowed);
    return MyNumber.max(min, MyNumber.fromEther('0', selectedToken.decimals));
  }, [balance, selectedToken, tvlInfo]);

  // Handle slider change
  const handleSliderChange = useCallback(
    (value: number) => {
      setSliderValue(value);
      setPercentageInput(value.toString());
      if (selectedToken) {
        const percentage = value / 100;
        let newAmount = maxAmount.operate('mul', percentage);
        let tokenInfo = selectedToken;
        let index = 0;
        if (newAmount.isZero()) {
          // use other token if first token is zero
          newAmount = balanceByToken[1].operate('mul', percentage);
          tokenInfo = strategyBalances[1].tokenInfo as unknown as TokenInfoV2;
          index = 1;
        }
        onAmountChange(
          newAmount,
          value === 100,
          newAmount.toEtherStr(),
          tokenInfo,
          index,
        );
      }
    },
    [maxAmount, selectedToken, balanceByToken, strategyBalances],
  );

  // Handle percentage input change
  const handlePercentageInputChange = useCallback(
    (valueString: string, valueNumber: number) => {
      // Allow empty string and valid numbers
      if (isNaN(valueNumber)) valueNumber = 0;
      if (isNaN(Number(valueString))) valueString = percentageInput;
      if (valueString === '' || (valueNumber >= 0 && valueNumber <= 100)) {
        setPercentageInput(valueString);
        setSliderValue(valueNumber);

        // Only update slider if we have a valid number
        if (selectedToken) {
          const percentage = valueNumber / 100;
          let newAmount = maxAmount.operate('mul', percentage);
          let tokenInfo = selectedToken;
          let index = 0;
          if (newAmount.isZero()) {
            // use other token if first token is zero
            newAmount = balanceByToken[1].operate('mul', percentage);
            tokenInfo = strategyBalances[1].tokenInfo as unknown as TokenInfoV2;
            index = 1;
          }

          onAmountChange(
            newAmount,
            valueNumber === 100,
            newAmount.toEtherStr(),
            tokenInfo,
            index,
          );
        }
      }
    },
    [
      maxAmount,
      selectedToken,
      percentageInput,
      balanceByToken,
      strategyBalances,
    ],
  );

  const checkAndTriggerOnAmountsChange = debounce(function (
    _amt: MyNumber,
    _token: TokenInfoV2,
    _inputsInfo: AmountInputInfo[],
    _redeemInfo: RedeemAtomType,
    _inputIndex = 0,
  ) {
    if (!_redeemInfo.onAmountsChange) return;

    if (_amt.isZero()) {
      for (let i = 0; i < _inputsInfo.length; i++) {
        setInputInfo({
          index: i,
          info: {
            amount: Web3Number.fromWei('0', _token.decimals),
          },
        });
      }
      return;
    }

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
            index: _inputIndex,
          },
          [
            {
              amount:
                _inputsInfo[0].amount ||
                Web3Number.fromWei(
                  '0',
                  _inputsInfo[0].tokenInfo?.decimals || 18,
                ),
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

  const onAmountChange = useCallback(
    (
      _amt: MyNumber,
      isMaxClicked: boolean,
      rawAmount = _amt.toEtherStr(),
      token = selectedToken,
      inputIndex = 0,
    ) => {
      if (!token) return;

      setInputInfo({
        index: inputIndex,
        info: {
          tokenInfo: token,
          amount: Web3Number.fromWei(_amt.toString(), token.decimals),
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
        token,
        updatedInputsInfo,
        redeemInfo,
        inputIndex,
      );
    },
    [
      inputsInfo,
      setInputInfo,
      redeemInfo,
      props.strategy,
      selectedToken,
      checkAndTriggerOnAmountsChange,
    ],
  );

  // Handle MAX button click
  const handleMaxClick = useCallback(() => {
    setSliderValue(100);
    setPercentageInput('100');
    let tokenInfo = selectedToken;
    let index = 0;
    let amount = maxAmount;
    if (amount.isZero()) {
      // use other token if first token is zero
      tokenInfo = strategyBalances[1].tokenInfo as unknown as TokenInfoV2;
      index = 1;
      amount = balanceByToken[1];
    }
    onAmountChange(amount, true, amount.toEtherStr(), tokenInfo, index);
    if (selectedToken) {
      mixpanel.track('Chose max amount', {
        strategyId: props.strategy.id,
        strategyName: props.strategy.name,
        buttonText: props.buttonText,
        amount: amount.toEtherStr(),
        token: tokenInfo?.name,
        maxAmount: amount.toEtherStr(),
        address,
      });
    }
  }, [
    maxAmount,
    selectedToken,
    props.strategy,
    props.buttonText,
    address,
    balanceByToken,
    strategyBalances,
    onAmountChange,
  ]);

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
    <div>
      <div className="flex w-full flex-col gap-[24px]">
        <div className="flex w-full items-center gap-[15px] border-b border-[#2F2F2F] pb-[24px]">
          <div
            className="relative min-h-[42px] rounded-[6px] border-2 border-transparent p-0"
            style={{
              background:
                'linear-gradient(#1A1919, #1A1919) padding-box, linear-gradient(to right, #2E45D0, #B1525C) border-box',
            }}
          >
            <input
              type="number"
              value={percentageInput}
              onChange={(e) =>
                handlePercentageInputChange(
                  e.target.value,
                  Number(e.target.value),
                )
              }
              min={0}
              max={100}
              step={1}
              disabled={totalBalance.isZero()}
              onKeyDown={(e) => {
                if (['End', 'Home'].includes(e.key)) {
                  e.preventDefault();
                }
              }}
              className="h-[60px] w-[103px] rounded-[6px] border-none bg-transparent pr-[30px] text-center text-[16px] text-white focus:outline-none disabled:opacity-50"
            />
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[16px] font-bold text-white">
              %
            </span>
          </div>

          <input
            type="range"
            aria-label="amount-slider"
            value={sliderValue}
            onChange={(e) => handleSliderChange(Number(e.target.value))}
            min={0}
            max={100}
            step={1}
            disabled={totalBalance.isZero()}
            className="h-[10px] flex-1 cursor-pointer appearance-none rounded-[146px] bg-[#323232] accent-[#B1525C] disabled:opacity-50"
          />
          <LoadingWrap
            isLoading={balData.isLoading || balData.isPending}
            isError={balData.isError}
            skeletonProps={{
              height: '10px',
              width: '50px',
            }}
          >
            <button
              type="button"
              onClick={handleMaxClick}
              disabled={totalBalance.isZero()}
              className="max-h-[21px] rounded-[146px] bg-[#323232] px-3 py-[3px] text-[12px] font-normal text-white disabled:opacity-50"
            >
              Max
            </button>
          </LoadingWrap>
        </div>
        <div className="flex w-full flex-col gap-[24px]">
          {availableTokens.map((token, index) => {
            const balance = strategyBalances[index].amount;
            const calculatedAmount = balance.operate('mul', sliderValue / 100);
            return (
              <div key={token.symbol} className="w-full">
                <div className="flex justify-between">
                  <TokenBadge
                    symbol={token.symbol || ''}
                    iconSrc={token.logo || ''}
                  />

                  <div className="flex flex-col items-end gap-[6px] text-[12px]">
                    <p>Available balance</p>
                    <SimpleTooltip
                      label={
                        Number(balance.toEtherStr()) < 0.000001
                          ? balance.toEtherStr()
                          : balance.toEtherToFixedDecimals(6)
                      }
                    >
                      <p>{formatTokenBalance(balance, 4)}</p>
                    </SimpleTooltip>
                  </div>
                </div>

                <div className="mt-[12px] w-full">
                  <div className="mb-[10px] flex items-center">
                    <div className="h-[60px] w-full items-center bg-[#1A1919] px-3">
                      <p className="flex h-[60px] w-full items-center pl-3 text-[15px] font-bold text-[#595959]">
                        {token.symbol || ''}{' '}
                        {Number(calculatedAmount.toEtherStr()) < 0.0001
                          ? calculatedAmount.toEtherStr()
                          : calculatedAmount.toEtherToFixedDecimals(4)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex w-full items-center justify-center">
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
        </div>
      </div>
    </div>
  );
}

export default function Redeem(props: RedeemProps) {
  return <InternalRedeem {...props} />;
}
