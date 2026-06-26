import { StrategyInfo } from '@/store/strategies.atoms';
import { StrategyTxProps } from '@/store/transactions.atom';
import {
  DepositActionInputs,
  IStrategyActionHook,
  onStratAmountsChangeFn,
} from '@/strategies/IStrategy';
import { convertToMyNumber, convertToV1TokenInfo } from '@/utils';
import MyNumber from '@/utils/MyNumber';
import { Loader2, TriangleAlert } from 'lucide-react';
import { useAccount } from '@starknet-react/core';
import { atom, PrimitiveAtom, useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useEffect, useMemo, useRef, useState } from 'react';
import TxButton from './TxButton';
import { provider } from '@/constants';
import {
  SingleActionAmount,
  TokenInfo as TokenInfoV2,
  Web3Number,
} from '@strkfarm/sdk';
import AmountInput, { AmountInputRef } from './AmountInput';
import { addressAtom } from '@/store/claims.atoms';

interface DepositProps {
  strategy: StrategyInfo<any>;
  // ? If you want to add more button text, you can add here
  // ? @dev ensure below actionType is updated accordingly
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
 * State shape for deposit form
 */
export type DepositAtomType = {
  /** Array of atoms containing input info for each token */
  inputsInfo: PrimitiveAtom<AmountInputInfo>[];
  // deposit/withdrawMethods can return multiple options (which are actions)
  actionIndex: number;
  loading?: boolean;
  /** Optional callback when amounts change */
  onAmountsChange?: onStratAmountsChangeFn;
};

function getInputInfoAtoms() {
  return [1, 2].map(() => {
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
export const inputsInfoAtom = atom((get) => {
  return inputsInfoAtoms.map((i) => get(i));
});

// Create deposit atom with 2 token inputs (current max supported)
export const depositAtom = atom<DepositAtomType>({
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
    set(inputsInfoAtoms[index], newInputInfo);
  },
);

const resetDepositFormAtom = atom(null, (get, set) => {
  const inputInfos = get(inputsInfoAtom);
  set(depositAtom, {
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

export default function Deposit(props: DepositProps) {
  return <InternalDeposit {...props} />;
}

function InternalDeposit(props: DepositProps) {
  const { address } = useAccount();
  const [callsInfo, setCallsInfo] = useState<IStrategyActionHook[]>([]);
  const [depositInfo, setDepositInfo] = useAtom(depositAtom);
  const firstInputInfo = useAtomValue(inputsInfoAtoms[0]);
  const isMaxClicked = useAtomValue(isMaxClickedAtom);
  const inputsInfo = useAtomValue(inputsInfoAtom);
  const resetDepositForm = useSetAtom(resetDepositFormAtom);

  useEffect(() => {
    resetDepositForm();
  }, []);

  const inputRef1 = useRef<AmountInputRef | null>(null);
  const inputRef2 = useRef<AmountInputRef | null>(null);
  const [inputError1, setInputError1] = useState('');
  const [inputError2, setInputError2] = useState('');

  const inputRefs = [inputRef1, inputRef2];
  const inputErrors = [inputError1, inputError2];
  const setInputErrors = [setInputError1, setInputError2];

  // since we use a separate jotai provider,
  // need to set this again here
  const setAddress = useSetAtom(addressAtom);
  useEffect(() => {
    setAddress(address);
  }, [address]);

  useEffect(() => {
    const amount1 = new MyNumber(
      firstInputInfo.amount.toWei() || '0',
      firstInputInfo.tokenInfo?.decimals || 0,
    );
    let amount2: MyNumber | undefined = undefined;
    if (inputsInfo[1].tokenInfo) {
      amount2 = new MyNumber(
        inputsInfo[1].amount.toWei() || '0',
        inputsInfo[1].tokenInfo?.decimals || 0,
      );
    }
    props
      .callsInfo({
        amount: amount1,
        amount2,
        address: address || '0x0',
        provider,
        isMax: isMaxClicked,
      })
      .then((calls) => {
        setCallsInfo(calls);
        setDepositInfo({
          ...depositInfo,
          onAmountsChange: calls[0].onAmountsChange,
        });
      })
      .catch((e) => {
        console.error('Error in deposit methods', e);
      });
  }, [
    JSON.stringify(props.callsInfo),
    address,
    JSON.stringify(inputsInfo),
    JSON.stringify(firstInputInfo),
    isMaxClicked,
  ]);

  // This is used to store the raw amount entered by the user
  const isDeposit = useMemo(() => props.buttonText === 'Deposit', [props]);

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
    if (callsInfo[0].amounts.length === 1) {
      setInvestedSummary(firstInputInfo.amount);
      setLoadingInvestmentSummary(false);
      return;
    }
    setLoadingInvestmentSummary(true);
    const amounts: SingleActionAmount[] = inputsInfo.map((a) => {
      return {
        amount: a.amount,
        tokenInfo: a.tokenInfo!,
      };
    });
    props.strategy
      .computeSummaryValue(
        amounts,
        props.strategy.settings.quoteToken,
        'depositcomp',
      )
      .then((summary) => {
        setInvestedSummary(summary);
        setLoadingInvestmentSummary(false);
      })
      .catch((e) => {
        console.error('Error in computeSummaryValue', e);
        setInvestedSummary(null);
        setLoadingInvestmentSummary(false);
      });
  }, [
    // arrays and complex objects tend to trigger re-renders too much
    // below is a workaround
    JSON.stringify(inputsInfo),
    props.strategy.settings.quoteToken,
    callsInfo.length,
    callsInfo.length ? callsInfo[0].amounts.length : 0,
    firstInputInfo.amount.toString(),
  ]);

  // use to maintain tx history and show toasts
  const txInfo: StrategyTxProps = useMemo(() => {
    return {
      strategyId: props.strategy.id,
      actionType: isDeposit ? 'deposit' : 'withdraw',
      amount: investedSummary
        ? convertToMyNumber(investedSummary)
        : MyNumber.fromZero(),
      tokenAddr: props.strategy.settings.quoteToken.address.address,
    };
  }, [props]);

  // constructs tx calls
  const { calls } = useMemo(() => {
    const hook = callsInfo[depositInfo.actionIndex];
    if (!hook) return { calls: [] };
    return { calls: hook.calls };
  }, [address, provider, isMaxClicked, callsInfo, depositInfo]);

  const tvlInfo = useAtomValue(props.strategy.tvlAtom);
  const isTVLFull = useMemo(() => {
    return (
      props.strategy.settings.maxTVL !== 0 &&
      tvlInfo.data?.amounts[0].amount.greaterThan(
        props.strategy.settings.maxTVL.toFixed(6),
      )
    );
  }, [tvlInfo]);

  const canSubmit = useMemo(() => {
    if (inputError1 || inputError2) return false;
    if (isTVLFull && isDeposit) {
      return false;
    }
    if (depositInfo.loading) {
      return false;
    }
    if (!investedSummary || loadingInvestmentSummary) {
      return false;
    }
    // todo consider max cap of each token as well
    return inputsInfo.some((a) => a.amount.greaterThan(0));
  }, [
    depositInfo,
    loadingInvestmentSummary,
    investedSummary,
    inputsInfo,
    isTVLFull,
    isDeposit,
  ]);

  return (
    <div>
      <div className="flex w-full flex-col gap-4 pt-4">
        {/* // todo wont work with multiple token options for now */}
        {callsInfo.length &&
          callsInfo[0].amounts.map((inputAmtInfo, index) => {
            return (
              <AmountInput
                ref={inputRefs[index]}
                key={index}
                index={index}
                tokenInfo={inputAmtInfo.tokenInfo}
                balanceAtom={inputAmtInfo.balanceAtom}
                isDeposit={isDeposit}
                strategy={props.strategy}
                buttonText={props.buttonText}
                // return the tokens from the array of actions, but at same index
                supportedTokens={callsInfo.map(
                  (c) => c.amounts[index].tokenInfo,
                )}
                error={inputErrors[index]}
                setError={setInputErrors[index]}
              />
            );
          })}
      </div>

      <div className="flex items-center justify-center py-8">
        <TxButton
          txInfo={txInfo}
          buttonText={props.buttonText}
          text={
            depositInfo.loading || loadingInvestmentSummary
              ? 'Loading...'
              : props.buttonText
          }
          calls={calls}
          buttonProps={{
            isDisabled: !canSubmit,
          }}
          selectedMarket={convertToV1TokenInfo(
            props.strategy.settings.quoteToken,
          )}
          strategy={props.strategy}
          resetDepositForm={() => {
            resetDepositForm();
            inputRefs.forEach((ref) => {
              if (ref.current) {
                ref.current.reset();
              }
            });
          }}
        />
      </div>

      {!props.strategy.isRetired() && props.strategy.settings.maxTVL !== 0 && (
        <div className="mt-[15px] w-full">
          <div className="flex justify-between">
            <p className="text-xs font-bold text-color2">Current TVL Limit:</p>
            <p className="flex items-center text-xs text-color2">
              {!tvlInfo || !tvlInfo?.data ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                Number(
                  tvlInfo.data?.amounts[0].amount.toFixed(2),
                ).toLocaleString()
              )}
              {' / '}
              {props.strategy.settings.maxTVL.toLocaleString()}{' '}
              {inputsInfo[0].tokenInfo?.symbol}
            </p>
          </div>
          <div
            className="mt-[5px] h-2 w-full overflow-hidden rounded-[5px]"
            style={{
              background: 'linear-gradient(to right, #2E45D0, #B1525C)',
            }}
          >
            <div
              className="h-full bg-disabled_bg"
              style={{
                width: `${
                  !tvlInfo || !tvlInfo?.data
                    ? 100
                    : (100 *
                        (Number(tvlInfo.data?.amounts[0].amount.toFixed(2)) ||
                          props.strategy.settings.maxTVL)) /
                      props.strategy.settings.maxTVL
                }%`,
              }}
            />
          </div>
          {isTVLFull && isDeposit && (
            <div className="mt-5 flex items-center rounded-[10px] bg-bg p-2.5">
              <TriangleAlert className="mr-2.5 h-4 w-4 shrink-0 text-yellow" />
              <p className="text-xs text-color2">
                TVL limit reached. Please wait for increase in limits.
              </p>
            </div>
          )}
          {/* {tvlInfo.isError ? 1 : 0}{tvlInfo.isLoading ? 1 : 0} {JSON.stringify(tvlInfo.error)} */}
        </div>
      )}
    </div>
  );
}
