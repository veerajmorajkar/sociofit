/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Backgrounds & surfaces
        bg: '#0E0E14',
        'surface-1': '#17172A',
        surface: '#17172A',
        'surface-2': '#1F1F38',
        'surface-3': '#2A2A48',
        border: '#2A2A48',

        // Brand purple
        'purple-deep': '#3B1F8C',
        'purple-brand': '#5B2ECC',
        'purple-hero': '#7B4DFF',
        'purple-soft': '#A882FF',

        // Electric teal
        'teal-primary': '#00E5C3',
        'teal-mid': '#00BFA5',
        'teal-dark': '#007A6A',

        // Prestige gold
        gold: '#C9A84C',
        'gold-light': '#E8C96A',
        'gold-glow': '#F5E0A0',

        // Typography
        'text-primary': '#FFFFFF',
        'text-secondary': '#C4BEFF',
        'text-muted': '#7A74A8',
        'text-disabled': '#3A3A5A',

        // Semantic
        success: '#00E5C3',
        error: '#FF4D6D',
        warning: '#F5A623',
        info: '#A882FF',
      },
      borderRadius: {
        none: '0px',
        xs: '6px',
        sm: '8px',
        md: '12px',
        card: '12px',
        lg: '16px',
        xl: '24px',
        full: '9999px',
      },
      fontFamily: {
        // Outfit — primary
        display: ['Outfit_900Black'],
        h1: ['Outfit_700Bold'],
        h2: ['Outfit_600SemiBold'],
        heading: ['Outfit_700Bold'],
        body: ['Outfit_400Regular'],
        'body-medium': ['Outfit_500Medium'],
        'body-strong': ['Outfit_600SemiBold'],
        'body-bold': ['Outfit_700Bold'],
        // Space Grotesk — stats / labels / metadata
        label: ['SpaceGrotesk_700Bold'],
        stat: ['SpaceGrotesk_600SemiBold'],
        caption: ['SpaceGrotesk_400Regular'],
      },
    },
  },
  plugins: [],
};
