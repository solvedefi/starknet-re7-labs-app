// transaction history stored in local storage
// Also handles tx status popup

import { TOKENS } from '@/constants';
import { capitalize, standariseAddress } from '@/utils';
import MyNumber from '@/utils/MyNumber';
import { Getter, Setter, atom } from 'jotai';
import toast from 'react-hot-toast';
import { RpcProvider, TransactionExecutionStatus } from 'starknet';
import { StrategyInfo, strategiesAtom } from './strategies.atoms';
import { createAtomWithStorage, tokenPricesAtom } from './utils.atoms';
import { atomWithQuery } from 'jotai-tanstack-query';
import { gql } from '@apollo/client';
import apolloClient from '@/utils/apolloClient';
import { Web3Number } from '@strkfarm/sdk';

export interface StrategyTxProps {
  strategyId: string;
  actionType: 'deposit' | 'withdraw';
  amount: MyNumber;
  tokenAddr: string;
}

// Standard tx info to be stored in local storage
export interface TransactionInfo {
  txHash: string;
  info: StrategyTxProps; // can add more types of txs in future
  status: 'pending' | 'success' | 'failed';
  createdAt: Date;
}

export type UserTxHistory = Array<{
  type: 'deposit' | 'withdraw';
  amount0: string;
  amount1: string;
  token0: string;
  token1: string;
}>;

type EkuboVaultFlow = {
  type: 'deposit' | 'withdraw';
  amount0: string;
  amount1: string;
  token0: string;
  token1: string;
  txHash: string;
  block_number: number;
  txIndex: number;
  eventIndex: number;
  timestamp: number;
  liquidity_delta: string;
};

type ContractFeeEarnings = {
  contract: string;
  dailyEarnings: {
    date: string;
    tokenAddress: string;
    amount: string;
  }[];
  totalCollections: string;
};

export const getFeesHistory = async (
  contract: string,
): Promise<ContractFeeEarnings> => {
  const contractAddrFormatted = standariseAddress(contract);
  try {
    const { data } = await apolloClient.query({
      query: gql`
        query ContractFeeEarnings($timeframe: String!, $contract: String!) {
          contractFeeEarnings(timeframe: $timeframe, contract: $contract) {
            contract
            dailyEarnings {
              date
              tokenAddress
              amount
            }
            totalCollections
          }
        }
      `,
      variables: {
        contract: contractAddrFormatted,
        timeframe: '24h',
      },
    });
    return data.contractFeeEarnings;
  } catch (error) {
    console.error('GraphQL Error:', error);
    return {
      contract,
      dailyEarnings: [],
      totalCollections: '0',
    };
  }
};

export const getFeesHistoryAtom = (contracts: string[]) =>
  atomWithQuery((get) => {
    const { data: tokenPrices, isPending: tokenPricesPending } =
      get(tokenPricesAtom);
    return {
      enabled: !tokenPricesPending && !!tokenPrices && !!contracts.length,
      queryKey: [
        'fees_history',
        JSON.stringify(contracts),
        JSON.stringify(tokenPrices),
      ],
      queryFn: async (): Promise<Record<string, number>> => {
        const feesCollectionPromises = contracts.map(async (contract) => {
          const feesHistory = await getFeesHistory(contract);
          return feesHistory.dailyEarnings.reduce((acc, fee) => {
            const tokenPricePoint = tokenPrices?.find(
              (token) => token.tokenAddress === fee.tokenAddress,
            );
            if (!tokenPricePoint) return acc;

            const { price, decimals } = tokenPricePoint;
            return (
              acc + Web3Number.fromWei(fee.amount, decimals).toNumber() * price
            );
          }, 0);
        });
        const feesCollection = await Promise.all(feesCollectionPromises);
        const feesCollectionMap = feesCollection.reduce(
          (acc, fee, index) => {
            acc[contracts[index]] = fee;
            return acc;
          },
          {} as Record<string, number>,
        );
        return feesCollectionMap;
      },
    };
  });

export const getUserTxHistory = async (
  strategyContract: string,
  owner: string,
): Promise<UserTxHistory> => {
  const contractAddrFormatted = standariseAddress(strategyContract);
  const ownerAddrFormatted = standariseAddress(owner);
  try {
    const { data } = await apolloClient.query({
      query: gql`
        query ContractFeeEarnings(
          $userAddress: String!
          $vaultContract: String!
        ) {
          ekuboVaultFlows(
            user_address: $userAddress
            vault_contract: $vaultContract
          ) {
            type
            txHash
            block_number
            txIndex
            eventIndex
            token0
            token1
            amount0
            amount1
            liquidity_delta
            timestamp
          }
        }
      `,
      variables: {
        userAddress: ownerAddrFormatted,
        vaultContract: contractAddrFormatted,
      },
    });

    return data.ekuboVaultFlows.map((tx: EkuboVaultFlow) => ({
      type: tx.type,
      amount0: tx.amount0,
      amount1: tx.amount1,
      token0: tx.token0,
      token1: tx.token1,
    }));
  } catch (error) {
    console.error('GraphQL Error:', error);
    return [];
  }
};

export const UserTxHistoryAtom = (strategyContracts: string[], owner: string) =>
  atomWithQuery(() => {
    return {
      enabled: !!owner,
      queryKey: ['user_tx_history', owner],
      queryFn: async (): Promise<Record<string, UserTxHistory>> => {
        const userTxHistoryPromises = strategyContracts.map(
          async (strategyContract) => {
            return await getUserTxHistory(strategyContract, owner);
          },
        );
        const userTxHistory = await Promise.all(userTxHistoryPromises);

        return userTxHistory.reduce(
          (acc, userTxHistory, index) => {
            acc[strategyContracts[index]] = userTxHistory;
            return acc;
          },
          {} as Record<string, UserTxHistory>,
        );
      },
    };
  });

export const UserDepsositsAtom = (
  strategyContracts: string[],
  tokens: string[][],
  accountAddress?: string,
) => {
  const userTxHistoryAtom = UserTxHistoryAtom(
    strategyContracts,
    accountAddress || '0x0',
  );
  return atomWithQuery((get) => {
    const { data: userTxHistory, isPending: userTxHistoryPending } =
      get(userTxHistoryAtom);
    const { data: tokenPrices, isPending: tokenPricesPending } =
      get(tokenPricesAtom);
    return {
      enabled:
        !!userTxHistory &&
        !userTxHistoryPending &&
        !tokenPricesPending &&
        !!tokenPrices,
      queryKey: ['user_deposits', accountAddress],
      queryFn: async (): Promise<Record<string, number>> => {
        if (!accountAddress) return {};
        const depositsPromises = strategyContracts.map(
          async (strategyContract, index) => {
            const transactions = userTxHistory?.[strategyContract];
            if (!transactions || transactions.length === 0) return;
            const token0 = tokenPrices?.find(
              (token) => token.tokenName === tokens[index][0],
            );
            const token1 = tokenPrices?.find(
              (token) => token.tokenName === tokens[index][1],
            );
            if (!token0 || !token1) return 0;
            const deposits = transactions.reverse().reduce(
              (acc, transaction) => {
                const delta0 = Web3Number.fromWei(
                  transaction.amount0,
                  token0.decimals,
                );
                const delta1 = Web3Number.fromWei(
                  transaction.amount1,
                  token1.decimals,
                );
                const update = [
                  Math.max(0, acc[0] + delta0.toNumber()),
                  Math.max(0, acc[1] + delta1.toNumber()),
                ];
                return update;
              },
              [0, 0],
            );

            const deposit =
              deposits[0] * token0.price + deposits[1] * token1.price;
            return deposit;
          },
        );
        const depositsCompleted = (await Promise.all(depositsPromises)).filter(
          (deposit) => deposit !== undefined,
        );
        const res = Object.fromEntries(
          depositsCompleted.map((deposit, index) => [
            strategyContracts[index],
            deposit,
          ]),
        );
        return res;
      },
    };
  });
};

export interface TxHistory {
  findManyInvestment_flows: {
    amount: string;
    timestamp: number;
    type: string;
    txHash: string;
    asset: string;
    __typename: 'Investment_flows';
  }[];
}

async function getTxHistory(
  contract: string,
  owner: string,
): Promise<TxHistory> {
  try {
    const contractAddrFormatted = standariseAddress(contract);
    const ownerAddrFormatted = standariseAddress(owner);
    const { data } = await apolloClient.query({
      query: gql`
        query Query($where: Investment_flowsWhereInput) {
          findManyInvestment_flows(where: $where) {
            amount
            timestamp
            type
            txHash
            asset
          }
        }
      `,
      variables: {
        where: {
          contract: {
            equals: contractAddrFormatted,
          },
          owner: {
            equals: ownerAddrFormatted,
          },
        },
      },
      // fetchPolicy: 'network-only'
    });

    return data;
  } catch (error) {
    console.error('GraphQL Error:', error);
    throw error;
  }
}

export const newTxsAtom = atom<TransactionInfo[]>([]);

export const TxHistoryAtom = (contract: string, owner: string) =>
  atomWithQuery((get) => ({
    // balData just to trigger a refetch
    queryKey: ['tx_history', contract, owner, JSON.stringify(get(newTxsAtom))],
    queryFn: async ({ queryKey }: any): Promise<TxHistory> => {
      // const [, { contract, owner }] = queryKey;
      const res = await getTxHistory(contract, owner);

      console.log('TxHistoryAtom res', res, { contract, owner, queryKey });
      // add new txs from local cache
      const newTxs = get(newTxsAtom);
      console.log('TxHistoryAtom newTxs', newTxs);
      const allTxs = res.findManyInvestment_flows.concat(
        newTxs.map((tx) => {
          return {
            amount: tx.info.amount.toString(),
            timestamp: Math.round(tx.createdAt.getTime() / 1000),
            type: tx.info.actionType,
            txHash: tx.txHash,
            asset: tx.info.tokenAddr,
            __typename: 'Investment_flows',
          };
        }),
      );

      console.log('TxHistoryAtom', allTxs);
      // remove any duplicate txs by txHash
      const txMap: any = {}; // txHash: boolean
      const txHashes = allTxs.filter((txInfo) => {
        if (txMap[txInfo.txHash]) {
          return false;
        }
        txMap[txInfo.txHash] = true;
        return true;
      });

      console.log('TxHistoryAtom txHashes', txHashes);
      return {
        findManyInvestment_flows: txHashes,
      };
    },
  }));

// in local storage, objects like Date, MyNumber are stored as strings
// this function deserialises them back to their original types
// declare let localStorage: any;
async function deserialiseTxInfo(key: string, initialValue: TransactionInfo[]) {
  let storedValue;

  if (typeof window !== 'undefined') {
    storedValue = localStorage.getItem(key);
  }

  const txs: TransactionInfo[] = storedValue
    ? JSON.parse(storedValue)
    : initialValue;
  txs.forEach((tx) => {
    if (tx.info.amount) {
      tx.info.amount = new MyNumber(
        tx.info.amount.bigNumber.toString(),
        tx.info.amount.decimals,
      );
    }
    tx.createdAt = new Date(tx.createdAt);
  });
  return txs;
}

// Atom to store tx history in local storage
export const transactionsAtom = createAtomWithStorage<TransactionInfo[]>(
  'transactions',
  [],
  deserialiseTxInfo,
);

// call this func to add a new tx to the tx history
// initiates a toast notification
export const monitorNewTxAtom = atom(
  null,
  async (get, set, tx: TransactionInfo) => {
    console.log('monitorNewTxAtom', tx);
    await initToast(tx, get, set);
  },
);

async function waitForTransaction(
  tx: TransactionInfo,
  get: Getter,
  set: Setter,
) {
  const provider = new RpcProvider({
    nodeUrl: process.env.NEXT_PUBLIC_RPC_URL,
  });
  console.log('waitForTransaction', tx);
  await isTxAccepted(tx.txHash);
  console.log('waitForTransaction done', tx);
  const txs = await get(transactionsAtom);
  tx.status = 'success';
  txs.push(tx);
  set(transactionsAtom, txs);

  let newTxs = get(newTxsAtom);
  console.log('waitForTransaction newTxs', newTxs);
  const txExists = newTxs.find(
    (t) => t.txHash.toLowerCase() === tx.txHash.toLowerCase(),
  );
  console.log('waitForTransaction txExists', txExists);
  if (!txExists) {
    newTxs = [...newTxs, tx];
    console.log('waitForTransaction newTxs2', newTxs);
    set(newTxsAtom, newTxs);
  }
}

// Somehow waitForTransaction is giving delayed confirmation
// even with 5s retry interval. So, using this function instead
async function isTxAccepted(txHash: string) {
  const provider = new RpcProvider({
    nodeUrl: process.env.NEXT_PUBLIC_RPC_URL,
  });
  let keepChecking = true;
  const maxRetries = 30;
  let retry = 0;
  while (keepChecking) {
    let txInfo: any;
    try {
      txInfo = await provider.getTransactionStatus(txHash);
    } catch (error) {
      console.error('isTxAccepted error', error);
      retry++;
      if (retry > maxRetries) {
        throw new Error('Transaction status unknown');
      }
      await new Promise((resolve) => setTimeout(resolve, 2000));
      continue;
    }

    console.debug('isTxAccepted', txInfo);
    if (!txInfo.finality_status || txInfo.finality_status == 'RECEIVED') {
      // do nothing
      await new Promise((resolve) => setTimeout(resolve, 2000));
      continue;
    }
    if (txInfo.finality_status == 'ACCEPTED_ON_L2') {
      if (txInfo.execution_status === TransactionExecutionStatus.SUCCEEDED) {
        keepChecking = false;
        return true;
      }
      throw new Error('Transaction reverted');
    } else if (txInfo.finality_status == 'REJECTED') {
      throw new Error('Transaction rejected');
    } else {
      throw new Error('Transaction status unknown');
    }
  }
}

async function initToast(tx: TransactionInfo, get: Getter, set: Setter) {
  console.log('Deposit txInfo 2', tx, tx.info.amount.toEtherStr());

  const msg = StrategyTxPropsToMessage(tx.info, get);
  await toast.promise(
    waitForTransaction(tx, get, set),
    {
      loading: msg,
      error: msg,
      success: msg,
    },
    {
      position: 'bottom-right',
      style: {
        background: 'rgb(127 73 229)',
        color: '#fff',
        fontFamily: 'sans-serif',
        fontSize: '14px',
      },
    },
  );
}

// converts tx props to a human readable message meant to show in a toast
function StrategyTxPropsToMessage(tx: StrategyTxProps, get: Getter) {
  const strategies = get(strategiesAtom);
  return StrategyTxPropsToMessageWithStrategies(tx, strategies);
}

export function StrategyTxPropsToMessageWithStrategies(
  tx: StrategyTxProps,
  strategies: StrategyInfo<any>[],
) {
  const tokenInfo = TOKENS.find(
    (t) => standariseAddress(t.token) === standariseAddress(tx.tokenAddr),
  );
  if (!tokenInfo) {
    throw new Error(`Toast: Token ${tx.tokenAddr} not found`);
  }
  const strategy = strategies.find((s) => s.id === tx.strategyId);
  if (!strategy) {
    throw new Error(`Toast: Strategy ${tx.strategyId} not found`);
  }
  return `${capitalize(tx.actionType)} ${tx.amount.toEtherToFixedDecimals(4)} ${tokenInfo.name} in ${strategy.name}`;
}
