import { Metadata } from 'next';
import { Providers } from './providers';
import { GoogleAnalytics } from '@next/third-parties/google';
import React from 'react';
import { ibmPlexMonoHeader, ibmPlexMonoLight, ibmPlexMonoMain } from '@/fonts';
import './globals.css';

export const metadata: Metadata = {
  title: 'Re7 ALMM (Automatic Liquidity Market Maker)',
  description:
    'Find and invest in high yield pools. Re7 Labs is the best yield aggregator on Starknet.',
  openGraph: {
    title: 'Re7 ALMM (Automatic Liquidity Market Maker)',
    description:
      'Find and invest in high yield pools. Re7 Labs is the best yield aggregator on Starknet.',
    images: ['https://www.re7labs.xyz/opengraph-image.png?fba144fde61dab4a'],
  },
  twitter: {
    creator: '',
    title: 'Re7 ALMM (Automatic Liquidity Market Maker)',
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
      <body
        className={`${ibmPlexMonoMain.variable} ${ibmPlexMonoHeader.variable} ${ibmPlexMonoLight.variable}`}
      >
        <Providers>{children}</Providers>
        <GoogleAnalytics gaId="G-K05JV94KM9" />
      </body>
    </html>
  );
}
