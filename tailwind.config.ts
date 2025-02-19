import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Light mode colors
        primary: {
          DEFAULT: '#3A8FB7',
          light: '#4BA3CC',
          dark: '#2E7A9E'
        },
        secondary: {
          DEFAULT: '#F9F9F9',
          dark: '#EFEFEF'
        },
        accent: {
          orange: '#F2994A',
          teal: '#4DB6AC'
        },
        text: {
          DEFAULT: '#333333',
          light: '#666666'
        },
        // Dark mode specific colors
        dark: {
          bg: {
            DEFAULT: '#121212',
            secondary: '#1F1F1F',
            card: '#1E1E1E'
          },
          text: {
            DEFAULT: '#FFFFFF',
            light: '#E0E0E0'
          },
          border: '#2C2C2C'
        }
      },
      backgroundColor: {
        DEFAULT: 'var(--background)',
        card: 'var(--background-card)'
      },
      textColor: {
        DEFAULT: 'var(--text)',
        light: 'var(--text-light)'
      },
      borderColor: {
        DEFAULT: 'var(--border)'
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
} satisfies Config;
