'use client';

import { useTnc } from '@/hooks/useTnc';
import { Loader2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

/**
 * Sticky accept bar shown at the bottom of the T&C page for a connected wallet
 * that has not yet signed. "Agree" stays disabled until the user has scrolled to
 * the bottom of the document, so consent is only possible after review.
 */
const TncSignBar = () => {
  const {
    address,
    hasTncAccepted,
    isQueryReady,
    handleSign,
    isSigningPending,
    disconnect,
  } = useTnc();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [scrolledToEnd, setScrolledToEnd] = useState(false);

  const returnTo = searchParams.get('return') || '/';

  useEffect(() => {
    const check = () => {
      const reachedBottom =
        window.innerHeight + window.scrollY >= document.body.offsetHeight - 120;
      if (reachedBottom) setScrolledToEnd(true);
    };
    check();
    window.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check);
    return () => {
      window.removeEventListener('scroll', check);
      window.removeEventListener('resize', check);
    };
  }, []);

  const onAgree = useCallback(async () => {
    const ok = await handleSign();
    if (ok) router.push(returnTo);
  }, [handleSign, router, returnTo]);

  const onDecline = useCallback(async () => {
    await disconnect();
    router.push('/');
  }, [disconnect, router]);

  // Only gate a connected wallet that still needs to sign the current version.
  if (!isQueryReady || !address || hasTncAccepted) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-[#7F49E5] bg-[#1A1C26]/95 backdrop-blur">
      <div className="mx-auto flex max-w-[700px] flex-col items-center gap-3 px-6 py-4 sm:flex-row sm:justify-between">
        <p className="text-center text-sm text-color2 sm:text-left">
          {scrolledToEnd
            ? 'By clicking Agree, you accept the Terms and Conditions above.'
            : 'Please scroll to the bottom to read the full Terms and Conditions.'}
        </p>
        <div className="flex shrink-0 items-center">
          <button
            className="rounded-lg bg-purple px-4 py-2 text-white hover:bg-[#7F49E5] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={onAgree}
            disabled={!scrolledToEnd || isSigningPending}
          >
            Agree{' '}
            {isSigningPending && (
              <Loader2 className="ml-[5px] inline h-3 w-3 animate-spin" />
            )}
          </button>
          <button
            className="ml-2.5 rounded-lg bg-bg px-4 py-2 text-color2"
            onClick={onDecline}
          >
            Disconnect
          </button>
        </div>
      </div>
    </div>
  );
};

export default TncSignBar;
