import { StrategyInfo } from '@/store/strategies.atoms';
import { StrategyTxProps } from '@/store/transactions.atom';
import {
  DepositActionInputs,
  IStrategyActionHook,
  onStratAmountsChangeFn,
} from '@/strategies/IStrategy';
import { convertToMyNumber, convertToV1TokenInfo } from '@/utils';
import MyNumber from '@/utils/MyNumber';
import {
  Alert,
  AlertIcon,
  Box,
  Center,
  Flex,
  Progress,
  Spinner,
  Text,
  VStack,
} from '@chakra-ui/react';
import { useAccount } from '@starknet-react/core';
import { atom, PrimitiveAtom, useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useEffect, useMemo, useState } from 'react';
import TxButton from './TxButton';
import { provider } from '@/constants';
import {
  SingleActionAmount,
  TokenInfo as TokenInfoV2,
  Web3Number,
} from '@strkfarm/sdk';
import { AmountInput } from './AmountInput';
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
    console.log(`onAmountsChange [2]`, index, info, newInputInfo);
    set(inputsInfoAtoms[index], newInputInfo);
  },
);

export const resetDepositFormAtom = atom(null, (get, set) => {
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
    console.log(
      'Deposit calls [0]',
      amount1.toString(),
      amount2?.toString(),
      address,
      firstInputInfo.tokenInfo?.decimals,
      inputsInfo[1].tokenInfo?.decimals,
    );
    props
      .callsInfo({
        amount: amount1,
        amount2,
        address: address || '0x0',
        provider,
        isMax: isMaxClicked,
      })
      .then((calls) => {
        console.log('Deposit calls', calls);
        setCallsInfo(calls);
        setDepositInfo({
          ...depositInfo,
          onAmountsChange: calls[0].onAmountsChange,
        });
      })
      .catch((e) => {
        console.error('Error in deposit methods', e);
      });
  }, [props.callsInfo, address, inputsInfo, firstInputInfo, isMaxClicked]);

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
    if (callsInfo[0].amounts.length == 1) {
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
      .computeSummaryValue(amounts, props.strategy.settings.quoteToken)
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
    inputsInfo,
    props.strategy.settings.quoteToken,
    callsInfo,
    firstInputInfo,
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

  useEffect(() => {
    console.log('Deposit txInfo', txInfo);
  }, [txInfo]);

  // constructs tx calls
  const { calls } = useMemo(() => {
    const hook = callsInfo[depositInfo.actionIndex];
    if (!hook) return { calls: [] };
    return { calls: hook.calls };
  }, [address, provider, isMaxClicked, callsInfo, depositInfo]);

  const tvlInfo = useAtomValue(props.strategy.tvlAtom);
  const isTVLFull = useMemo(() => {
    return (
      props.strategy.settings.maxTVL != 0 &&
      tvlInfo.data?.amounts[0].amount.greaterThan(
        props.strategy.settings.maxTVL.toFixed(6),
      )
    );
  }, [tvlInfo]);

  const canSubmit = useMemo(() => {
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
    <Box>
      <VStack width={'100%'} gap={5}>
        {/* // todo wont work with multiple token options for now */}
        {callsInfo.length &&
          callsInfo[0].amounts.map((inputAmtInfo, index) => {
            return (
              <AmountInput
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
              />
            );
          })}
      </VStack>

      <Center marginTop={'10px'}>
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
          resetDepositForm={resetDepositForm}
        />
      </Center>

      {!props.strategy.isRetired() && props.strategy.settings.maxTVL != 0 && (
        <Box width="100%" marginTop={'15px'}>
          <Flex justifyContent="space-between">
            <Text fontSize={'12px'} color="color2" fontWeight={'bold'}>
              Current TVL Limit:
            </Text>
            <Text fontSize={'12px'} color="color2">
              {!tvlInfo || !tvlInfo?.data ? (
                <Spinner size="2xs" />
              ) : (
                Number(
                  tvlInfo.data?.amounts[0].amount.toFixed(2),
                ).toLocaleString()
              )}
              {' / '}
              {props.strategy.settings.maxTVL.toLocaleString()}{' '}
              {inputsInfo[0].tokenInfo?.symbol}
            </Text>
          </Flex>
          <Progress
            colorScheme="gray"
            bg="bg"
            value={
              (100 *
                (Number(tvlInfo.data?.amounts[0].amount.toFixed(2)) ||
                  props.strategy.settings.maxTVL)) /
              props.strategy.settings.maxTVL
            }
            isIndeterminate={!tvlInfo || !tvlInfo?.data}
          />
          {isTVLFull && isDeposit && (
            <Alert
              status="warning"
              bg="bg"
              marginTop={'20px'}
              borderRadius={'10px'}
            >
              <AlertIcon />
              <Text fontSize={'12px'} color={'color2'}>
                TVL limit reached. Please wait for increase in limits.
              </Text>
            </Alert>
          )}
          {/* {tvlInfo.isError ? 1 : 0}{tvlInfo.isLoading ? 1 : 0} {JSON.stringify(tvlInfo.error)} */}
        </Box>
      )}
    </Box>
  );
}
