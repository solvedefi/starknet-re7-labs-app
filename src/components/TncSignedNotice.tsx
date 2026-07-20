'use client';

import { useTnc } from '@/hooks/useTnc';
import { CheckCircle2 } from 'lucide-react';

/**
 * Inline confirmation at the bottom of the T&C page, shown when the connected
 * wallet has already accepted the current Terms. Complements TncSignBar, which
 * only appears for wallets that still need to sign.
 */
const TncSignedNotice = () => {
  const { address, hasTncAccepted, isQueryReady } = useTnc();

  if (!isQueryReady || !address || !hasTncAccepted) {
    return null;
  }

  return (
    <div className="mt-10 flex items-center gap-3 rounded-lg border border-[#7F49E5]/40 bg-[#7F49E5]/10 px-5 py-4">
      <CheckCircle2 className="h-5 w-5 shrink-0 text-[#7F49E5]" />
      <p className="text-sm text-white">
        This wallet has already accepted the current Terms and Conditions.
      </p>
    </div>
  );
};

export default TncSignedNotice;
