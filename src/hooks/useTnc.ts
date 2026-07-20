'use client';

import { LATEST_TNC_DOC_VERSION } from '@/constants';
import { addressAtom } from '@/store/claims.atoms';
import { referralCodeAtom } from '@/store/referral.store';
import { lastWalletAtom } from '@/store/utils.atoms';
import { useAccount, useDisconnect } from '@starknet-react/core';
import axios from 'axios';
import { useAtomValue, useSetAtom } from 'jotai';
import { atomWithQuery } from 'jotai-tanstack-query';
import mixpanel from 'mixpanel-browser';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import toast from 'react-hot-toast';

// Shared across the gate (redirect) and the sign bar so they read one cache.
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

export function useTnc() {
  const { address, account } = useAccount();
  const searchParams = useSearchParams();
  const userTncInfoRes = useAtomValue(UserTnCAtom);
  const setReferralCode = useSetAtom(referralCodeAtom);
  const setLastWallet = useSetAtom(lastWalletAtom);
  const { disconnectAsync } = useDisconnect();
  const [isSigningPending, setIsSigningPending] = useState(false);

  const {
    isLoading,
    isFetching,
    isSuccess,
    data: hasTncAccepted,
  } = userTncInfoRes;
  const isQueryReady = isSuccess && !isLoading && !isFetching;

  const handleSign = async (): Promise<boolean> => {
    if (!address || !account) {
      return false;
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

        if (res.data.user?.referralCode) {
          setReferralCode(res.data.user.referralCode);
        }

        await userTncInfoRes.refetch();
        return true;
      }

      toast.error(res.data?.message || 'Failed to accept T&C', {
        position: 'bottom-right',
      });
      return false;
    } catch (error) {
      console.error('Error accepting T&C:', error);
      toast.error('Failed to accept T&C. Please try again.', {
        position: 'bottom-right',
      });
      mixpanel.track('TnC acceptance failed', { address });
      return false;
    } finally {
      setIsSigningPending(false);
    }
  };

  const disconnect = async () => {
    mixpanel.track('TnC declined', { address });
    await disconnectAsync();
    setLastWallet(null);
  };

  return {
    address,
    hasTncAccepted: !!hasTncAccepted,
    isQueryReady,
    handleSign,
    isSigningPending,
    disconnect,
  };
}
