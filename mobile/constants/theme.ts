import { Platform, type ViewStyle } from 'react-native';

/**
 * Mumbai Fitness Mafia (SocioFit) — Design Tokens
 * Source: .kiro/steering/ui-design.md
 * Dark-mode-first. Deep Purple brand + Electric Teal action + Prestige Gold accents.
 * Typography: Outfit (primary UI type throughout).
 *
 * NOTE: Never hardcode hex values in components — always import from here.
 */

export const colors = {
  // ── Backgrounds & Surfaces ──
  bgPrimary: '#0E0E14', // Base app background (every screen root). NOT pure black.
  surface1: '#17172A', // Cards, bottom sheets, modals, drawers
  surface2: '#1F1F38', // Input fields, nested cards, dropdown backgrounds
  surface3: '#2A2A48', // Borders, dividers, separators, hover/pressed states

  // ── Brand Purple Family ──
  purpleDeep: '#3B1F8C', // Tribe banners, section header backgrounds, deep gradient start
  purpleBrand: '#5B2ECC', // Primary brand — active tab highlight, sent chat bubbles, secondary CTAs
  purpleHero: '#7B4DFF', // Hero gradients, event accents, trainer CTAs, map pins
  purpleSoft: '#A882FF', // Secondary text highlights, info chips, link text, subtle labels

  // ── Electric Teal (Primary Action) ──
  tealPrimary: '#00E5C3', // PRIMARY CTA — JOIN, CREATE EVENT, BOOK SESSION, SIGN UP
  tealMid: '#00BFA5', // Map pins (events), active states, progress fills, online indicator
  tealDark: '#007A6A', // Teal-tinted card backgrounds, pressed state of teal buttons

  // ── Prestige Gold (sparse — elite & achievement only) ──
  gold: '#C9A84C', // ELITE badges, Leaderboard #1, achievement medals
  goldLight: '#E8C96A', // Gold text on dark surfaces, shimmer text
  goldGlow: '#F5E0A0', // Subtle gold background tint on achievement-unlocked screens

  // ── Typography ──
  textPrimary: '#FFFFFF', // Headlines, usernames, event titles, screen titles
  textSecondary: '#C4BEFF', // Body copy, descriptions, captions, subtitles
  textMuted: '#7A74A8', // Timestamps, metadata, placeholders, inactive labels
  textDisabled: '#3A3A5A', // Disabled state labels only

  // ── On-accent text (text drawn on top of accent fills) ──
  onTeal: '#001A14', // Near-black text on teal CTAs
  onGold: '#1A0E00', // Near-black text on gold badges

  // ── Semantic / Functional ──
  success: '#00E5C3', // Joined confirmation, completed goals, active badge
  error: '#FF4D6D', // Validation errors, leave/delete, failed states
  warning: '#F5A623', // Streak at risk, expiring event, incomplete form
  info: '#A882FF', // Tips, tooltips, soft nudges

  // ── Legacy aliases (mapped to the new system so no reference breaks) ──
  bg: '#0E0E14',
  surface: '#17172A',
  border: '#2A2A48',
  borderStrong: '#2A2A48',
  text1: '#FFFFFF',
  text2: '#C4BEFF',
  text3: '#7A74A8',
  text4: '#3A3A5A',
  textInverse: '#001A14',
  lime: '#00E5C3', // old primary action → teal
  limeDark: '#007A6A',
  sage: '#7B4DFF', // old community accent → purple hero
  sageLight: '#A882FF',
  cream: '#FFFFFF', // old headline cream → white
  premium: '#7B4DFF',
  live: '#FF4D6D',
} as const;

/**
 * Reusable gradient stop arrays (for expo-linear-gradient `colors` prop).
 * gradient-hero uses 3 stops — pair with `gradientLocations.hero`.
 */
export const gradients = {
  hero: ['#3B1F8C', '#7B4DFF', '#00E5C3'],
  brand: ['#5B2ECC', '#7B4DFF'],
  teal: ['#007A6A', '#00E5C3'],
  fab: ['#5B2ECC', '#00E5C3'],
  storyRing: ['#7B4DFF', '#00E5C3'],

  // Event card category gradients — apply by activity type
  eventRunning: ['#1A0A3A', '#5B2ECC'],
  eventCycling: ['#0A1A3A', '#3B6FCC'],
  eventYoga: ['#0A2A2A', '#00BFA5'],
  eventCompetitive: ['#1A0020', '#7B2FBE'],
  eventSocial: ['#1A1A0A', '#7A5C2E'],
  eventOutdoor: ['#0A1A0A', '#2D6A4F'],
} as const;

export const gradientLocations = {
  hero: [0, 0.5, 1],
} as const;

/**
 * Pick an event card gradient from a category slug / activity type.
 * Falls back to the brand gradient for unknown categories.
 */
// expo-linear-gradient expects at least 2 colors (tuple). All gradients here satisfy that.
export function eventGradient(category?: string | null): readonly [string, string, ...string[]] {
  switch ((category ?? '').toLowerCase()) {
    case 'running':
    case 'run':
      return gradients.eventRunning;
    case 'cycling':
    case 'cycle':
      return gradients.eventCycling;
    case 'yoga':
    case 'yoga_zumba':
    case 'zumba':
      return gradients.eventYoga;
    case 'sports_games':
    case 'competitive':
    case 'sports':
      return gradients.eventCompetitive;
    case 'fun_events':
    case 'social':
    case 'fun':
      return gradients.eventSocial;
    case 'treks':
    case 'outdoor':
    case 'trek':
      return gradients.eventOutdoor;
    default:
      return gradients.brand;
  }
}

// ── Elevation / Shadow presets (StyleSheet form) ──
export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 8,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 40,
    elevation: 16,
  },
  teal: {
    shadowColor: '#00E5C3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  purple: {
    shadowColor: '#7B4DFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },

  // ── Legacy aliases ──
  out: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 8,
  },
  outHover: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 40,
    elevation: 16,
  },
  lime: {
    shadowColor: '#00E5C3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  sage: {
    shadowColor: '#7B4DFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
} as const;

/** Soft raised / glass surfaces — light borders, minimal shadow (no Android elevation box) */
export const neumorph = {
  /** Semi-transparent controls over map / imagery */
  glass: Platform.select<ViewStyle>({
    ios: {
      backgroundColor: 'rgba(14, 14, 20, 0.9)',
      borderWidth: 1,
      borderColor: 'rgba(120, 110, 170, 0.2)',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 2,
    },
    android: {
      backgroundColor: 'rgba(14, 14, 20, 0.9)',
      borderWidth: 1,
      borderColor: 'rgba(120, 110, 170, 0.22)',
      elevation: 0,
    },
    default: {
      backgroundColor: 'rgba(14, 14, 20, 0.9)',
      borderWidth: 1,
      borderColor: 'rgba(120, 110, 170, 0.2)',
    },
  })!,
  glassFocus: Platform.select<ViewStyle>({
    ios: {
      backgroundColor: 'rgba(14, 14, 20, 0.94)',
      borderColor: 'rgba(0, 229, 195, 0.28)',
      shadowColor: colors.tealPrimary,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
    },
    android: {
      backgroundColor: 'rgba(14, 14, 20, 0.94)',
      borderColor: 'rgba(0, 229, 195, 0.32)',
      elevation: 0,
    },
    default: {
      borderColor: 'rgba(0, 229, 195, 0.28)',
    },
  })!,
  glassPill: Platform.select<ViewStyle>({
    ios: {
      backgroundColor: 'rgba(14, 14, 20, 0.86)',
      borderWidth: 1,
      borderColor: 'rgba(100, 92, 150, 0.18)',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 2,
    },
    android: {
      backgroundColor: 'rgba(14, 14, 20, 0.86)',
      borderWidth: 1,
      borderColor: 'rgba(100, 92, 150, 0.2)',
      elevation: 0,
    },
    default: {
      backgroundColor: 'rgba(14, 14, 20, 0.86)',
      borderWidth: 1,
      borderColor: 'rgba(100, 92, 150, 0.18)',
    },
  })!,
  glassPanel: Platform.select<ViewStyle>({
    ios: {
      backgroundColor: 'rgba(23, 23, 42, 0.92)',
      borderWidth: 1,
      borderColor: 'rgba(90, 82, 140, 0.25)',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
    },
    android: {
      backgroundColor: 'rgba(23, 23, 42, 0.92)',
      borderWidth: 1,
      borderColor: 'rgba(90, 82, 140, 0.28)',
      elevation: 0,
    },
    default: {
      backgroundColor: 'rgba(23, 23, 42, 0.92)',
      borderWidth: 1,
      borderColor: 'rgba(90, 82, 140, 0.25)',
    },
  })!,
  raised: Platform.select<ViewStyle>({
    ios: {
      backgroundColor: colors.surface1,
      borderWidth: 1,
      borderColor: 'rgba(120, 110, 170, 0.22)',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.14,
      shadowRadius: 3,
    },
    android: {
      backgroundColor: colors.surface1,
      borderWidth: 1,
      borderColor: 'rgba(120, 110, 170, 0.28)',
      elevation: 0,
    },
    default: {
      backgroundColor: colors.surface1,
      borderWidth: 1,
      borderColor: 'rgba(120, 110, 170, 0.24)',
    },
  })!,
  raisedFocus: Platform.select<ViewStyle>({
    ios: {
      borderColor: 'rgba(0, 229, 195, 0.32)',
      shadowColor: colors.tealPrimary,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.14,
      shadowRadius: 10,
    },
    android: {
      borderColor: 'rgba(0, 229, 195, 0.38)',
      elevation: 0,
    },
    default: {
      borderColor: 'rgba(0, 229, 195, 0.32)',
    },
  })!,
  pill: Platform.select<ViewStyle>({
    ios: {
      backgroundColor: colors.surface1,
      borderWidth: 1,
      borderColor: 'rgba(100, 92, 150, 0.2)',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
    },
    android: {
      backgroundColor: colors.surface1,
      borderWidth: 1,
      borderColor: 'rgba(100, 92, 150, 0.26)',
      elevation: 0,
    },
    default: {
      backgroundColor: colors.surface1,
      borderWidth: 1,
      borderColor: 'rgba(100, 92, 150, 0.22)',
    },
  })!,
  panel: Platform.select<ViewStyle>({
    ios: {
      backgroundColor: colors.surface1,
      borderWidth: 1,
      borderColor: 'rgba(90, 82, 140, 0.3)',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.2,
      shadowRadius: 12,
    },
    android: {
      backgroundColor: colors.surface1,
      borderWidth: 1,
      borderColor: 'rgba(90, 82, 140, 0.35)',
      elevation: 0,
    },
    default: {
      backgroundColor: colors.surface1,
      borderWidth: 1,
      borderColor: 'rgba(90, 82, 140, 0.3)',
    },
  })!,
} as const;

export const spacing = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
} as const;

export const radius = {
  none: 0,
  xs: 6, // chips, tags, small badges
  sm: 8, // small buttons, event join buttons
  md: 12, // buttons, inputs, small cards
  card: 12, // alias of md
  lg: 16, // feed cards, event cards, modals
  xl: 24, // bottom sheets, large modals
  full: 9999, // pills, story rings, FAB
} as const;

/**
 * Font family names — registered in app/_layout.tsx via expo-google-fonts.
 * Outfit = primary (default). Register all weights in app/_layout.tsx via useFonts.
 */
export const fonts = {
  // ── Outfit (primary) ──
  display: 'Outfit_900Black',
  h1: 'Outfit_700Bold',
  h2: 'Outfit_600SemiBold',
  h3: 'Outfit_600SemiBold',
  body: 'Outfit_400Regular',
  bodyStrong: 'Outfit_600SemiBold',
  button: 'Outfit_700Bold',

  light: 'Outfit_300Light',
  regular: 'Outfit_400Regular',
  medium: 'Outfit_500Medium',
  semibold: 'Outfit_600SemiBold',
  bold: 'Outfit_700Bold',
  extrabold: 'Outfit_800ExtraBold',
  black: 'Outfit_900Black',

  // ── Secondary text styles (Outfit — matches primary UI type) ──
  label: 'Outfit_600SemiBold',
  stat: 'Outfit_700Bold',
  caption: 'Outfit_400Regular',
  mono: 'Outfit_500Medium',

  // ── Legacy aliases (mapped to new system) ──
  heading: 'Outfit_700Bold',
  headingMedium: 'Outfit_600SemiBold',
  headingRegular: 'Outfit_400Regular',
  bodyMedium: 'Outfit_500Medium',
  bodyBold: 'Outfit_700Bold',
} as const;
