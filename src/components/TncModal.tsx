'use client';

import { LATEST_TNC_DOC_VERSION, RE7_TnC_DOC_URL } from '@/constants';
import { addressAtom } from '@/store/claims.atoms';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ExternalLink, Loader2 } from 'lucide-react';
import { useAccount, useDisconnect } from '@starknet-react/core';
import axios from 'axios';
import { atomWithQuery } from 'jotai-tanstack-query';
import React, { useEffect, useState } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { referralCodeAtom } from '@/store/referral.store';
import { usePathname, useSearchParams } from 'next/navigation';
import mixpanel from 'mixpanel-browser';
import toast from 'react-hot-toast';
import { lastWalletAtom } from '@/store/utils.atoms';

interface TncModalProps {}

const UserTnCAtom = atomWithQuery((get) => {
  const address = get(addressAtom);
  return {
    queryKey: ['tnc', address],
    queryFn: async (): Promise<boolean> => {
      if (!address) return false;

      try {
        const res = await axios.get(`/api/tnc/getUser/${address}`);
        if (res.data?.success && res.data?.user) {
          const user = res.data.user;
          // Check BOTH signed AND correct version
          return (
            user.isTncSigned === true &&
            user.tncDocVersion === LATEST_TNC_DOC_VERSION
          );
        }
        return false;
      } catch {
        return false;
      }
    },
    // Only run query when we have a real address
    enabled: !!address,
    // Cache result for 30 seconds to prevent unnecessary refetches
    staleTime: 30000,
  };
});

const TncModal: React.FC<TncModalProps> = () => {
  const { address, account } = useAccount();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const userTncInfoRes = useAtomValue(UserTnCAtom);
  const setReferralCode = useSetAtom(referralCodeAtom);
  const [isOpen, setIsOpen] = useState(false);
  const onOpen = () => setIsOpen(true);
  const onClose = () => setIsOpen(false);
  const [isSigningPending, setIsSigningPending] = useState(false);
  const { disconnectAsync } = useDisconnect();
  const setLastWallet = useSetAtom(lastWalletAtom);

  const isTncPage = pathname === '/terms';

  // Extract specific values to avoid triggering effect on every object change
  const {
    isLoading,
    isFetching,
    isSuccess,
    data: hasTncAccepted,
  } = userTncInfoRes;
  const isQueryReady = isSuccess && !isLoading && !isFetching;

  useEffect(() => {
    // Don't show modal while pathname is not yet available (hydration)
    if (pathname === null) {
      return;
    }

    // Never show modal on T&C page (users need to read it)
    if (isTncPage) {
      onClose();
      return;
    }

    // Wait for query to complete successfully before making modal decisions
    if (!isQueryReady) {
      return;
    }

    // Show modal if user is connected but hasn't accepted current T&C version
    if (!hasTncAccepted && address) {
      onOpen();
    } else {
      onClose();
    }
  }, [
    isQueryReady,
    hasTncAccepted,
    address,
    isTncPage,
    pathname,
    onOpen,
    onClose,
  ]);

  const handleSign = async () => {
    if (!address || !account) {
      return;
    }

    setIsSigningPending(true);
    try {
      // Get referrer from URL if present (e.g., /?referrer=0x123...)
      const referrerAddress = searchParams.get('referrer');

      const res = await axios.post('/api/tnc/accept', {
        address,
        referrerAddress,
      });

      if (res.data?.success) {
        mixpanel.track('TnC agreed', {
          address,
          version: LATEST_TNC_DOC_VERSION,
        });

        // Update referral code from response if available
        if (res.data.user?.referralCode) {
          setReferralCode(res.data.user.referralCode);
        }

        // Refetch the UserTnCAtom to update state
        await userTncInfoRes.refetch();
      } else {
        toast.error(res.data?.message || 'Failed to accept T&C', {
          position: 'bottom-right',
        });
      }
    } catch (error) {
      console.error('Error accepting T&C:', error);
      toast.error('Failed to accept T&C. Please try again.', {
        position: 'bottom-right',
      });
      mixpanel.track('TnC acceptance failed', { address });
    } finally {
      setIsSigningPending(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent
        className="max-w-[32rem] rounded-lg border border-[#7F49E5] bg-[#1A1C26] p-12 text-white [&>button]:hidden"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div className="flex flex-col items-center justify-center gap-4">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl font-bold">
              Terms and Conditions
            </DialogTitle>
          </DialogHeader>

          <p className="w-full text-justify text-white">
            Please read the following terms and conditions carefully before you
            continue.
          </p>

          <a
            className="w-full text-left font-bold text-white hover:underline"
            href={RE7_TnC_DOC_URL}
            target="_blank"
            rel="noreferrer"
          >
            T&C Document <ExternalLink className="inline h-4 w-4" />
          </a>

          <p className="w-full text-left">
            By clicking agree, you agree to our terms and conditions as stated
            in the above document.
          </p>

          <div className="flex items-center justify-center">
            <button
              className="rounded-lg bg-purple px-4 py-2 text-white hover:bg-[#7F49E5] hover:opacity-90 disabled:opacity-50"
              onClick={handleSign}
              disabled={isSigningPending}
            >
              Agree{' '}
              {isSigningPending && (
                <Loader2 className="ml-[5px] inline h-3 w-3 animate-spin" />
              )}
            </button>
            <button
              className="ml-2.5 rounded-lg bg-bg px-4 py-2 text-color2"
              onClick={() => {
                mixpanel.track('TnC declined', { address });
                disconnectAsync();
                setLastWallet(null);
                onClose();
              }}
            >
              Disconnect
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TncModal;
