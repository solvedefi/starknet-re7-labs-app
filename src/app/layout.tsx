import { GoogleAnalytics } from '@next/third-parties/google';
import { Analytics } from '@vercel/analytics/react';
import type { Metadata } from 'next';
import React from 'react';

import './globals.css';

export const metadata: Metadata = {
  title: 'Re7 Labs | Yield aggregator on Starknet',
  description:
    'Find and invest in high yield pools. Re7 Labs is the best yield aggregator on Starknet.',
  openGraph: {
    title: 'Re7 Labs | Yield aggregator on Starknet',
    description:
      'Find and invest in high yield pools. Re7 Labs is the best yield aggregator on Starknet.',
    images: ['https://www.re7labs.xyz/opengraph-image.png?fba144fde61dab4a'],
  },
  twitter: {
    creator: '',
    title: 'Re7 Labs | Yield aggregator on Starknet',
    description:
      'Find and invest in high yield pools. Re7 Labs is the best yield aggregator on Starknet.',
    card: 'player',
    images: ['https://www.re7labs.xyz/opengraph-image.png?fba144fde61dab4a'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <meta name="theme-color" content="#111119" />
      </head>
      <body>
        {children}
        <Analytics />
      </body>
      <GoogleAnalytics gaId="G-K05JV94KM9" />
    </html>
  );
}
