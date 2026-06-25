import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // --- App palette (ported 1:1 from the old Chakra extendTheme) ---
        transparent: 'rgba(0, 0, 0, 0)',
        opacity_50p: 'rgba(0, 0, 0, 0.5)',
        color1: 'rgba(53, 60, 79, 1)',
        color1_65p: 'rgba(53, 60, 79, 0.65)',
        color1_50p: 'rgba(53, 60, 79, 0.5)',
        color1_35p: 'rgba(53, 60, 79, 0.35)',
        color1_light: '#bcc9ff80',
        color2: 'rgba(132, 132, 195, 1)',
        color2Text: 'rgb(184, 184, 239)',
        color2_65p: 'rgba(132, 132, 195, 0.65)',
        color2_50p: 'rgba(132, 132, 195, 0.15)',
        highlight: '#1a1a27',
        light_grey: '#9ca9ad',
        disabled_text: '#818181',
        disabled_bg: '#5f5f5f',
        purple: '#6e53dc',
        cyan: '#7DFACB',
        bg: '#111119',
        grey_text: '#B6B6B6',
        yellow: '#EFDB72',
        red: '#e18787',
        tertiary: '#82828A',

        // --- ShadCN semantic tokens (HSL CSS vars, dark theme) ---
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      fontFamily: {
        mono: ['var(--font-ibm-plex-mono-main)', 'monospace'],
        heading: ['var(--font-ibm-plex-mono-header)', 'monospace'],
        light: ['var(--font-ibm-plex-mono-light)', 'monospace'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
export default config;
