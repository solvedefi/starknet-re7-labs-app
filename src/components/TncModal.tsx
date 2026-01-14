'use client';

import { LATEST_TNC_DOC_VERSION, RE7_TnC_DOC_URL } from '@/constants';
import { addressAtom } from '@/store/claims.atoms';
import {
  Button,
  Center,
  Modal,
  ModalBody,
  ModalContent,
  ModalOverlay,
  Spinner,
  Text,
  useDisclosure,
} from '@chakra-ui/react';
import { useAccount, useDisconnect } from '@starknet-react/core';
import axios from 'axios';
import { atomWithQuery } from 'jotai-tanstack-query';
import React, { useEffect, useState } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { referralCodeAtom } from '@/store/referral.store';
import { usePathname, useSearchParams } from 'next/navigation';
import { ExternalLinkIcon } from '@chakra-ui/icons';
import mixpanel from 'mixpanel-browser';
import toast from 'react-hot-toast';
import { lastWalletAtom } from '@/store/utils.atoms';

interface TncModalProps {}

export const UserTnCAtom = atomWithQuery((get) => {
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
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [isSigningPending, setIsSigningPending] = useState(false);
  const { disconnectAsync } = useDisconnect();
  const setLastWallet = useSetAtom(lastWalletAtom);

  const isTncPage = pathname === '/terms-and-conditions';

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
    <Modal
      onClose={onClose}
      isOpen={isOpen}
      isCentered
      closeOnOverlayClick={false}
    >
      <ModalOverlay />
      <ModalContent borderRadius=".5rem" maxW="32rem">
        <ModalBody
          backgroundColor="#1A1C26"
          padding="3rem"
          border="1px solid #7F49E5"
          borderRadius=".5rem"
          color="white"
          display="flex"
          alignItems="center"
          justifyContent="center"
          flexDirection="column"
          gap="1rem"
        >
          <Text textAlign="center" fontSize="1.5rem" fontWeight="bold">
            Terms and Conditions
          </Text>

          <Text textAlign="justify" color="white" width={'100%'}>
            Please read the following terms and conditions carefully before you
            continue.
          </Text>

          <Text
            textAlign="left"
            as={'a'}
            width={'100%'}
            fontWeight={'bold'}
            href={RE7_TnC_DOC_URL}
            color="white"
            target="_blank"
            _hover={{ textDecor: 'underline' }}
            autoFocus={false}
            _focus={{
              boxShadow: 'none',
              outline: 'none',
            }}
            _focusVisible={{
              boxShadow: 'none',
              outline: 'none',
            }}
          >
            T&C Document <ExternalLinkIcon />
          </Text>

          <Text textAlign="left" width={'100%'}>
            By clicking agree, you agree to our terms and conditions as stated
            in the above document.
          </Text>

          <Center>
            <Button
              bg="purple"
              borderRadius=".5rem"
              px="1rem"
              py=".5rem"
              color="white"
              cursor="pointer"
              _hover={{
                opacity: 0.9,
                backgroundColor: '#7F49E5',
              }}
              onClick={handleSign}
              isDisabled={isSigningPending}
            >
              Agree{' '}
              {isSigningPending && (
                <Spinner size={'xs'} color="white" ml={'5px'} />
              )}
            </Button>
            <Button
              bg="bg"
              borderRadius=".5rem"
              px="1rem"
              py=".5rem"
              color="color2"
              cursor="pointer"
              onClick={() => {
                mixpanel.track('TnC declined', { address });
                disconnectAsync();
                setLastWallet(null);
                onClose();
              }}
              ml={'10px'}
            >
              Disconnect
            </Button>
          </Center>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default TncModal;
