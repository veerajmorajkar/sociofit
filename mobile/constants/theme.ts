/**
 * FitSocial KINEU Design Tokens
 * Source: .kiro/steering/ui-design.md v2.0
 * Charcoal & Lime palette. Neumorphic shadows. Kinetic typography.
 */

export const colors = {
  // Surfaces — charcoal scale
  bg: '#0E0E0E',
  surface: '#161616',
  surface2: '#1E1E1E',
  surface3: '#262626',
  border: '#2E2E2E',
  borderStrong: '#3A3A3A',

  // Text — warm tones
  text1: '#E8E0D0',
  text2: '#B0A898',
  text3: '#706860',
  text4: '#4A4440',
  textInverse: '#0E0E0E',

  // Accent — Electric Lime (personal / action)
  lime: '#D4EA4D',
  limeDark: '#BEDD1A',
  limeSoft: 'rgba(212, 234, 77, 0.10)',
  limeGlow: 'rgba(212, 234, 77, 0.25)',

  // Secondary — Sage (community / clubs / events)
  sage: '#52A870',
  sageLight: '#9ACFAE',
  sageSoft: 'rgba(82, 168, 112, 0.10)',

  // Cream — warm white (premium / headlines)
  cream: '#E8E0D0',
  creamSoft: 'rgba(232, 224, 208, 0.10)',

  // Semantic
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  premium: '#A855F7',
  live: '#FF4444',
} as const;

// Neumorphic shadow presets (for StyleSheet use)
export const shadows = {
  out: {
    shadowColor: '#000',
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 0.55,
    shadowRadius: 14,
    elevation: 8,
  },
  outHover: {
    shadowColor: '#000',
    shadowOffset: { width: 9, height: 9 },
    shadowOpacity: 0.65,
    shadowRadius: 18,
    elevation: 12,
  },
  lime: {
    shadowColor: '#D4EA4D',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  sage: {
    shadowColor: '#52A870',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.20,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;

export const spacing = {
  1: 4, 2: 8, 3: 12, 4: 16, 5: 20,
  6: 24, 8: 32, 10: 40, 12: 48, 16: 64,
} as const;

export const radius = {
  none: 0,      // kinetic register
  xs: 6,
  sm: 10,
  md: 14,
  card: 16,     // buttons, chips, inputs
  lg: 20,       // cards
  xl: 24,
  full: 9999,   // pills, avatars
} as const;

export const fonts = {
  heading: 'SpaceGrotesk-Bold',
  headingMedium: 'SpaceGrotesk-Medium',
  headingRegular: 'SpaceGrotesk-Regular',
  body: 'DMSans-Regular',
  bodyMedium: 'DMSans-Medium',
  bodyBold: 'DMSans-Bold',
} as const;
