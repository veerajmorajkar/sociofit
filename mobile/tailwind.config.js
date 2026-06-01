/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        bg: '#0E0E0E',
        surface: '#161616',
        'surface-2': '#1E1E1E',
        'surface-3': '#262626',
        border: '#2E2E2E',
        'border-strong': '#3A3A3A',

        'text-1': '#E8E0D0',
        'text-2': '#B0A898',
        'text-3': '#706860',
        'text-4': '#4A4440',
        'text-inverse': '#0E0E0E',

        lime: { DEFAULT: '#D4EA4D', dark: '#BEDD1A' },
        sage: { DEFAULT: '#52A870', light: '#9ACFAE' },
        cream: '#E8E0D0',

        success: '#22C55E',
        warning: '#F59E0B',
        error: '#EF4444',
        info: '#3B82F6',
        premium: '#A855F7',
        live: '#FF4444',
      },
      borderRadius: {
        none: '0px',
        xs: '6px',
        sm: '10px',
        md: '14px',
        card: '16px',
        lg: '20px',
        xl: '24px',
      },
      fontFamily: {
        heading: ['SpaceGrotesk-Bold'],
        'heading-medium': ['SpaceGrotesk-Medium'],
        'heading-regular': ['SpaceGrotesk-Regular'],
        body: ['DMSans-Regular'],
        'body-medium': ['DMSans-Medium'],
        'body-bold': ['DMSans-Bold'],
      },
    },
  },
  plugins: [],
};
