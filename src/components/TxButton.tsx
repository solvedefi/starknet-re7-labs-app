import { strategyByIdAtom } from '@/store/strategiesInfo.atoms';
import { referralCodeAtom } from '@/store/referral.store';
import { StrategyTxProps, monitorNewTxAtom } from '@/store/transactions.atom';
import { IStrategyProps, TokenInfo } from '@/strategies/IStrategy';
import { getReferralUrl } from '@/utils';
import apolloClient from '@/utils/apolloClient';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { useAccount, useSendTransaction } from '@starknet-react/core';
import { useAtomValue, useSetAtom } from 'jotai';
import mixpanel from 'mixpanel-browser';
import { useEffect, useMemo, useState } from 'react';
import { isMobile } from 'react-device-detect';
import { TwitterShareButton } from 'react-share';
import { Call } from 'starknet';

interface TxButtonProps {
  txInfo: StrategyTxProps;
  buttonText?: 'Deposit' | 'Redeem';
  text: string;
  calls: Call[];
  buttonProps?: Record<string, any>;
  justDisableIfNoWalletConnect?: boolean;
  selectedMarket?: TokenInfo;
  strategy?: IStrategyProps<any>;
  resetDepositForm: () => void;
}

export default function TxButton(props: TxButtonProps) {
  const { address } = useAccount();
  const monitorNewTx = useSetAtom(monitorNewTxAtom);
  const [isOpen, setIsOpen] = useState(false);
  const onOpen = () => setIsOpen(true);
  const referralCode = useAtomValue(referralCodeAtom);

  const apr = useAtomValue(
    strategyByIdAtom(props.txInfo.strategyId),
  )?.calculatedApr;

  const {
    sendAsync: writeAsync,
    data,
    status,
    isSuccess,
    isPending,
    error,
    isError,
  } = useSendTransaction({
    calls: props.calls,
  });

  useEffect(() => {
    if (data && data.transaction_hash) {
      props.resetDepositForm();
      // initiates a toast and adds the tx to tx history if successful
      monitorNewTx({
        txHash: data.transaction_hash,
        info: props.txInfo,
        status: 'pending', // 'success' | 'failed'
        createdAt: new Date(),
      });
    }

    if (isSuccess && data && data.transaction_hash) {
      mixpanel.track('Transaction success', {
        strategyId: props.txInfo.strategyId,
        actionType: props.txInfo.actionType,
        amount: props.txInfo.amount.toEtherToFixedDecimals(6),
        tokenAddr: props.txInfo.tokenAddr,
        status: 'success',
        createdAt: new Date(),
      });
    }

    if (isError && error) {
      mixpanel.track('Transaction failed', {
        strategyId: props.txInfo.strategyId,
        actionType: props.txInfo.actionType,
        amount: props.txInfo.amount.toEtherToFixedDecimals(6),
        tokenAddr: props.txInfo.tokenAddr,
        status: 'failed',
        createdAt: new Date(),
      });
    }
  }, [status, data]);

  const disabledText = useMemo(() => {
    if (props.strategy?.settings.isPaused) {
      return 'Paused';
    }
    if (props.justDisableIfNoWalletConnect) {
      if (!address) return props.text;
      return '';
    }
    if (!address) return 'Wallet not connected';
    return '';
  }, [isMobile, address, props]);

  async function handleButton() {
    writeAsync().then((tx) => {
      apolloClient.resetStore();

      if (props.buttonText === 'Deposit') onOpen();
      mixpanel.track('Submitted tx', {
        strategyId: props.txInfo.strategyId,
        txHash: tx.transaction_hash,
        text: props.text,
        address,
        buttonText: props.buttonText,
      });
    });
  }

  if (disabledText) {
    return (
      <button
        disabled
        className={cn(
          'h-[60px] w-full rounded-md border border-[#2F2F2F] bg-[#2F2F2F] text-[#9A9393]',
          props.buttonProps?.className,
        )}
      >
        {disabledText}
      </button>
    );
  }

  const twitterSharedYield = apr ? `${(apr * 100).toFixed(2)}% ` : '';

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-[32rem] rounded-[15px] bg-[#212121] text-white">
          <div className="flex flex-col items-center justify-center gap-4 px-6 pb-12 pt-16">
            <p className="text-center text-2xl font-bold">
              Thank you for your deposit!
            </p>

            <p className="text-center font-medium">
              While your deposit is being processed, if you like Re7 Labs, do
              you mind sharing on X/Twitter?
            </p>

            <div className="rounded-lg bg-white px-4 py-2 font-bold text-black hover:opacity-90">
              <TwitterShareButton
                url={`${getReferralUrl(referralCode)}`}
                title={`🚀I just invested my ${props.selectedMarket?.name ?? ''} in the high-yield  "${props.strategy?.name ?? ''}" strategy at @trovesfi, earning an impressive ${twitterSharedYield}yield! 💸. \n\nWant in? Join me and start earning: `}
                related={['strkfarm']}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '.6rem',
                }}
              >
                Share on
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  xmlnsXlink="http://www.w3.org/1999/xlink"
                  version="1.1"
                  id="Layer_1"
                  width="15px"
                  height="15px"
                  viewBox="0 0 24 24"
                  xmlSpace="preserve"
                >
                  <path
                    fill="#7E49E5"
                    d="M14.095479,10.316482L22.286354,1h-1.940718l-7.115352,8.087682L7.551414,1H1l8.589488,12.231093L1,23h1.940717  l7.509372-8.542861L16.448587,23H23L14.095479,10.316482z M11.436522,13.338465l-0.871624-1.218704l-6.924311-9.68815h2.981339  l5.58978,7.82155l0.867949,1.218704l7.26506,10.166271h-2.981339L11.436522,13.338465z"
                  />
                </svg>{' '}
              </TwitterShareButton>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="w-full text-center">
        <button
          className={cn(
            'h-[60px] w-full text-white',
            props.buttonProps?.className,
          )}
          style={{ background: 'linear-gradient(to right, #2E45D0, #B1525C)' }}
          onClick={async () => {
            mixpanel.track('Click strategy button', {
              strategyId: props.txInfo.strategyId,
              buttonText: props.text,
              address,
            });

            handleButton();
          }}
        >
          {isPending && (
            <Loader2 className="mr-[5px] inline h-4 w-4 animate-spin" />
          )}{' '}
          {props.text}
        </button>
      </div>
    </>
  );
}
