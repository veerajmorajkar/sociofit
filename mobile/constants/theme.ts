import { Platform, type ViewStyle } from 'react-native';

/**
 * Mumbai Fitness Mafia (SocioFit) — Design Tokens
 * Source: .kiro/steering/ui-design.md
 * Purple Pulse v3.0 — dark-mode-first with full light mode support.
 *
 * Typography roles:
 *   - Outfit        → primary UI type (all weights).
 *   - Space Grotesk → numeric/stat display ONLY (fonts.stat / fonts.statMedium):
 *                     counters, profile stats, OTP digits, countdowns.
 *
 * Accent color roles (apply consistently — do not mix):
 *   - Teal   (tealPrimary/tealMid) → primary action, success, unread/active state.
 *   - Purple (purpleHero/purpleSoft) → brand, decorative, secondary/informational.
 *   - Gold   (gold/goldLight)     → club prestige + announcement channels only.
 *   - Red    (error/live)         → error, destructive, live indicators only.
 *   The legacy `lime` alias maps to teal and must not introduce a third accent.
 *
 * NOTE: Components should import from ThemeContext (useTheme) for dynamic theming.
 *       The named exports below (colors, shadows, neumorph, etc.) remain for
 *       backward-compatibility — they always return dark mode values.
 */

// ─────────────────────────────────────────────
// DARK THEME
// ─────────────────────────────────────────────
export const darkTheme = {
  // ── Backgrounds & Surfaces ──
  bgPrimary: '#0E0E14',
  bg: '#0E0E14',
  surface1: '#17172A',
  surface: '#17172A',
  surface2: '#1F1F38',
  surface3: '#2A2A48',

  // ── Brand Purple Family ──
  purpleDeep: '#3B1F8C',
  purpleBrand: '#5B2ECC',
  purpleHero: '#7B4DFF',
  purpleSoft: '#A882FF',

  // ── Electric Teal (Primary Action) ──
  tealPrimary: '#00E5C3',
  tealMid: '#00BFA5',
  tealDark: '#007A6A',

  // ── Prestige Gold ──
  gold: '#C9A84C',
  goldLight: '#E8C96A',
  goldGlow: '#F5E0A0',

  // ── Typography ──
  textPrimary: '#FFFFFF',
  textSecondary: '#C4BEFF',
  textMuted: '#7A74A8',
  textDisabled: '#3A3A5A',

  // ── On-accent text ──
  onTeal: '#001A14',
  onGold: '#1A0E00',

  // ── Semantic ──
  success: '#00E5C3',
  error: '#FF4D6D',
  warning: '#F5A623',
  info: '#A882FF',

  // ── Legacy aliases ──
  border: '#2A2A48',
  borderStrong: '#2A2A48',
  text1: '#FFFFFF',
  text2: '#C4BEFF',
  text3: '#7A74A8',
  text4: '#3A3A5A',
  textInverse: '#001A14',
  lime: '#00E5C3',
  limeDark: '#007A6A',
  sage: '#7B4DFF',
  sageLight: '#A882FF',
  cream: '#FFFFFF',
  premium: '#7B4DFF',
  live: '#FF4D6D',

  // ── Nav / Chrome ──
  navBackground: '#17172A',
  navBorder: '#2A2A48',
  headerBackground: '#0E0E14',

  // ── Flat neumorph background tokens ──
  // (components use these as backgroundColor; borders/shadows are built inline)
  glass: 'rgba(14, 14, 20, 0.9)',
  glassFocusBg: 'rgba(14, 14, 20, 0.94)',
  glassPill: 'rgba(14, 14, 20, 0.86)',
  glassPanel: 'rgba(23, 23, 42, 0.92)',
  raised: '#17172A',
  pill: '#17172A',
  panel: '#17172A',
  chatCard: '#17172A',
  chatCardUnread: '#17172A',
  insetWell: '#0E0E14',
  fabCircle: '#17172A',

  // ── Shadows ──
  shadows: {
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
  },
} as const;

// ─────────────────────────────────────────────
// LIGHT THEME
// ─────────────────────────────────────────────
export const lightTheme = {
  // ── Backgrounds & Surfaces ──
  bgPrimary: '#F4F2FF',
  bg: '#F4F2FF',
  surface1: '#FFFFFF',
  surface: '#FFFFFF',
  surface2: '#EEF0FF',
  surface3: '#DDD9F5',

  // ── Brand Purple Family ──
  purpleDeep: '#3B1F8C',
  purpleBrand: '#5B2ECC',
  purpleHero: '#7B4DFF',
  purpleSoft: '#6B3FD4',

  // ── Electric Teal (Primary Action) ──
  tealPrimary: '#00C8AC',
  tealMid: '#00A896',
  tealDark: '#007A6A',

  // ── Prestige Gold ──
  gold: '#C9A84C',
  goldLight: '#E8C96A',
  goldGlow: '#FFF8E7',

  // ── Typography ──
  textPrimary: '#12082E',
  textSecondary: '#3D2A7A',
  textMuted: '#7A74A8',
  textDisabled: '#C0BAE0',

  // ── On-accent text ──
  onTeal: '#001A14',
  onGold: '#1A0E00',

  // ── Semantic ──
  success: '#00A896',
  error: '#E0294A',
  warning: '#D4820A',
  info: '#6B3FD4',

  // ── Legacy aliases ──
  border: '#DDD9F5',
  borderStrong: '#C0BAE0',
  text1: '#12082E',
  text2: '#3D2A7A',
  text3: '#7A74A8',
  text4: '#C0BAE0',
  textInverse: '#001A14',
  lime: '#00C8AC',
  limeDark: '#007A6A',
  sage: '#7B4DFF',
  sageLight: '#6B3FD4',
  cream: '#12082E',
  premium: '#7B4DFF',
  live: '#E0294A',

  // ── Nav / Chrome ──
  navBackground: '#EDE8FA', // cream light purple pill
  navBorder: '#B8AAD8', // soft visible lavender rim
  headerBackground: '#F4F2FF',

  // ── Flat neumorph background tokens ──
  glass: 'rgba(255,255,255,0.85)',
  glassFocusBg: 'rgba(255,255,255,0.94)',
  glassPill: 'rgba(244,242,255,0.92)',
  glassPanel: 'rgba(255,255,255,0.80)',
  raised: '#FFFFFF',
  pill: '#F4F2FF',
  panel: '#EEF0FF',
  chatCard: '#FFFFFF',
  chatCardUnread: '#EEF0FF',
  insetWell: '#EEF0FF',
  fabCircle: '#FFFFFF',

  // ── Shadows ──
  shadows: {
    sm: {
      shadowColor: '#3B1F8C',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 2,
    },
    md: {
      shadowColor: '#3B1F8C',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 12,
      elevation: 5,
    },
    lg: {
      shadowColor: '#3B1F8C',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.16,
      shadowRadius: 24,
      elevation: 10,
    },
    teal: {
      shadowColor: '#00C8AC',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 12,
      elevation: 6,
    },
    purple: {
      shadowColor: '#7B4DFF',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 12,
      elevation: 6,
    },
    out: {
      shadowColor: '#3B1F8C',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 12,
      elevation: 5,
    },
    outHover: {
      shadowColor: '#3B1F8C',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.16,
      shadowRadius: 24,
      elevation: 10,
    },
    lime: {
      shadowColor: '#00C8AC',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 12,
      elevation: 6,
    },
    sage: {
      shadowColor: '#7B4DFF',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 12,
      elevation: 6,
    },
  },
} as const;

// ─────────────────────────────────────────────
// TYPES & HELPERS
// ─────────────────────────────────────────────

export type ThemeType = typeof darkTheme;
export type ThemeMode = 'dark' | 'light';

export function getTheme(mode: ThemeMode): ThemeType {
  return mode === 'light' ? (lightTheme as unknown as ThemeType) : darkTheme;
}

// ─────────────────────────────────────────────
// SHARED / MODE-INDEPENDENT TOKENS
// (identical in both modes)
// ─────────────────────────────────────────────

/**
 * Reusable gradient stop arrays — identical in both modes.
 * Gradients look vibrant on both dark and light backgrounds.
 */
export const gradients = {
  hero: ['#3B1F8C', '#7B4DFF', '#00E5C3'],
  brand: ['#5B2ECC', '#7B4DFF'],
  teal: ['#007A6A', '#00E5C3'],
  fab: ['#5B2ECC', '#00E5C3'],
  storyRing: ['#7B4DFF', '#00E5C3'],

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

function normalizeCategorySlug(category?: string | null): string {
  return (category ?? '').toLowerCase().replace(/_/g, '-');
}

export function eventGradient(category?: string | null): readonly [string, string, ...string[]] {
  const slug = normalizeCategorySlug(category);

  if (['running', 'run', 'triathlon'].includes(slug)) {
    return gradients.eventRunning;
  }
  if (['cycling', 'cycle', 'swimming'].includes(slug)) {
    return gradients.eventCycling;
  }
  if (['yoga', 'zumba', 'pilates', 'dance', 'yoga-zumba', 'yoga_zumba'].includes(slug)) {
    return gradients.eventYoga;
  }
  if (
    [
      'football',
      'cricket',
      'basketball',
      'badminton',
      'tennis',
      'volleyball',
      'table-tennis',
      'table_tennis',
      'squash',
      'pickleball',
      'hockey',
      'rugby',
      'golf',
      'boxing',
      'martial-arts',
      'martial_arts',
      'sports-games',
      'sports_games',
      'competitive',
      'sports',
      'gym',
      'crossfit',
      'calisthenics',
      'functional-training',
      'functional_training',
    ].includes(slug)
  ) {
    return gradients.eventCompetitive;
  }
  if (['fun-events', 'fun_events', 'social', 'fun'].includes(slug)) {
    return gradients.eventSocial;
  }
  if (['hiking', 'treks', 'trek', 'outdoor', 'skating'].includes(slug)) {
    return gradients.eventOutdoor;
  }

  return gradients.brand;
}

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
  xs: 6,
  sm: 8,
  md: 12,
  card: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const fonts = {
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

  label: 'Outfit_600SemiBold',
  // Space Grotesk owns the numeric/stat display role (counts, stats, OTP digits).
  stat: 'SpaceGrotesk_700Bold',
  statMedium: 'SpaceGrotesk_500Medium',
  caption: 'Outfit_400Regular',
  mono: 'SpaceGrotesk_500Medium',

  heading: 'Outfit_700Bold',
  headingMedium: 'Outfit_600SemiBold',
  headingRegular: 'Outfit_400Regular',
  bodyMedium: 'Outfit_500Medium',
  bodyBold: 'Outfit_700Bold',
} as const;

// ─────────────────────────────────────────────
// BACKWARD-COMPAT NAMED EXPORTS
// (always dark — used by files not yet migrated to useTheme)
// ─────────────────────────────────────────────

export const colors = {
  bgPrimary: darkTheme.bgPrimary,
  surface1: darkTheme.surface1,
  surface2: darkTheme.surface2,
  surface3: darkTheme.surface3,
  purpleDeep: darkTheme.purpleDeep,
  purpleBrand: darkTheme.purpleBrand,
  purpleHero: darkTheme.purpleHero,
  purpleSoft: darkTheme.purpleSoft,
  tealPrimary: darkTheme.tealPrimary,
  tealMid: darkTheme.tealMid,
  tealDark: darkTheme.tealDark,
  gold: darkTheme.gold,
  goldLight: darkTheme.goldLight,
  goldGlow: darkTheme.goldGlow,
  textPrimary: darkTheme.textPrimary,
  textSecondary: darkTheme.textSecondary,
  textMuted: darkTheme.textMuted,
  textDisabled: darkTheme.textDisabled,
  onTeal: darkTheme.onTeal,
  onGold: darkTheme.onGold,
  success: darkTheme.success,
  error: darkTheme.error,
  warning: darkTheme.warning,
  info: darkTheme.info,
  bg: darkTheme.bg,
  surface: darkTheme.surface,
  border: darkTheme.border,
  borderStrong: darkTheme.borderStrong,
  text1: darkTheme.text1,
  text2: darkTheme.text2,
  text3: darkTheme.text3,
  text4: darkTheme.text4,
  textInverse: darkTheme.textInverse,
  lime: darkTheme.lime,
  limeDark: darkTheme.limeDark,
  sage: darkTheme.sage,
  sageLight: darkTheme.sageLight,
  cream: darkTheme.cream,
  premium: darkTheme.premium,
  live: darkTheme.live,
} as const;

export const shadows = darkTheme.shadows;

/** Static dark neumorph presets — backward compat for un-migrated components. */
export const neumorph = {
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
  chatCard: Platform.select<ViewStyle>({
    ios: {
      backgroundColor: colors.surface1,
      borderWidth: 1,
      borderTopColor: 'rgba(168, 130, 255, 0.14)',
      borderLeftColor: 'rgba(168, 130, 255, 0.09)',
      borderBottomColor: 'rgba(0, 0, 0, 0.38)',
      borderRightColor: 'rgba(0, 0, 0, 0.28)',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.22,
      shadowRadius: 10,
    },
    android: {
      backgroundColor: colors.surface1,
      borderWidth: 1,
      borderColor: 'rgba(100, 92, 150, 0.2)',
      elevation: 2,
    },
    default: {
      backgroundColor: colors.surface1,
      borderWidth: 1,
      borderColor: 'rgba(100, 92, 150, 0.18)',
    },
  })!,
  chatCardUnread: Platform.select<ViewStyle>({
    ios: {
      borderTopColor: 'rgba(0, 229, 195, 0.2)',
      borderLeftColor: 'rgba(0, 229, 195, 0.14)',
      borderBottomColor: 'rgba(0, 0, 0, 0.32)',
      shadowColor: colors.tealPrimary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
    },
    android: {
      borderColor: 'rgba(0, 229, 195, 0.2)',
      elevation: 3,
    },
    default: {
      borderTopColor: 'rgba(0, 229, 195, 0.2)',
    },
  })!,
  insetWell: Platform.select<ViewStyle>({
    ios: {
      backgroundColor: colors.bgPrimary,
      borderWidth: 1,
      borderTopColor: 'rgba(0, 0, 0, 0.42)',
      borderLeftColor: 'rgba(0, 0, 0, 0.32)',
      borderBottomColor: 'rgba(168, 130, 255, 0.12)',
      borderRightColor: 'rgba(168, 130, 255, 0.08)',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.28,
      shadowRadius: 3,
    },
    android: {
      backgroundColor: colors.bgPrimary,
      borderWidth: 1,
      borderColor: 'rgba(0, 0, 0, 0.35)',
      elevation: 0,
    },
    default: {
      backgroundColor: colors.bgPrimary,
      borderWidth: 1,
      borderColor: 'rgba(0, 0, 0, 0.35)',
    },
  })!,
  fabCircle: Platform.select<ViewStyle>({
    ios: {
      backgroundColor: colors.surface1,
      borderWidth: 1,
      borderTopColor: 'rgba(168, 130, 255, 0.14)',
      borderBottomColor: 'rgba(0, 0, 0, 0.4)',
      shadowColor: colors.tealPrimary,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
    },
    android: {
      backgroundColor: colors.surface1,
      borderWidth: 1,
      borderColor: 'rgba(100, 92, 150, 0.24)',
      elevation: 3,
    },
    default: {
      backgroundColor: colors.surface1,
      borderWidth: 1,
      borderColor: 'rgba(100, 92, 150, 0.22)',
    },
  })!,
} as const;
