'use client';

import { useTnc } from '@/hooks/useTnc';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Redirects a connected-but-unregistered wallet to the full T&C page, where it
 * must scroll through and sign. Replaces the old blocking modal. Renders nothing.
 */
const TncGate = () => {
  const { address, hasTncAccepted, isQueryReady } = useTnc();
  const router = useRouter();
  const pathname = usePathname();

  const isTncPage = pathname === '/terms';

  useEffect(() => {
    // Wait for hydration + query; never redirect away from the T&C page itself.
    if (pathname === null || isTncPage || !isQueryReady) {
      return;
    }

    if (address && !hasTncAccepted) {
      const ret = encodeURIComponent(pathname || '/');
      router.push(`/terms?return=${ret}`);
    }
  }, [address, hasTncAccepted, isQueryReady, isTncPage, pathname, router]);

  return null;
};

export default TncGate;
