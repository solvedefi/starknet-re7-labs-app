import { IBM_Plex_Mono } from 'next/font/google';

// Single IBM Plex Mono family with the full weight range, so weight is
// controlled by Tailwind font-weight classes (matching the old Chakra theme,
// which rendered everything in IBM Plex Mono at 400/500/600/700).
export const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-ibm-plex-mono',
});
