'use client';

import { Provider } from 'react-redux';
import { store } from '@/redux/store';
import { Analytics } from '@vercel/analytics/react';
import React from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      {children}
      <Analytics />
    </Provider>
  );
}
