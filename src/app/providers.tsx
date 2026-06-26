'use client';

import { Analytics } from '@vercel/analytics/react';
import React from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Analytics />
    </>
  );
}
