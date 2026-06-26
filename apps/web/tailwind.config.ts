import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'deep-cash': '#0F2E23',
        'cash-green': '#1F6F4E',
        'fresh-cash': '#4FAD72',
        'mint-light': '#CDEFD7',
        'cash-gold': '#F2B35E',
        'soft-white': '#F7FAF8',
      },
      fontSize: {
        'display': ['clamp(2rem, 5vw, 3.5rem)', { lineHeight: '1.1' }],
        'heading': ['clamp(1.5rem, 3vw, 2.25rem)', { lineHeight: '1.2' }],
        'subheading': ['clamp(1.125rem, 2vw, 1.5rem)', { lineHeight: '1.3' }],
        'body-lg': ['clamp(1rem, 1.5vw, 1.125rem)', { lineHeight: '1.6' }],
        'body': ['clamp(0.875rem, 1.2vw, 1rem)', { lineHeight: '1.6' }],
        'small': ['clamp(0.75rem, 1vw, 0.875rem)', { lineHeight: '1.5' }],
      },
      spacing: {
        'section': 'clamp(3rem, 8vw, 6rem)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 1.5s linear infinite',
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-in': 'slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
