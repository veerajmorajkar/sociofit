/**
 * On-video palette — auth screens render over a full-bleed DARK looping video
 * (AuthVideoBackdrop) in BOTH light and dark mode, so text, labels and glass
 * inputs that sit directly on the video must always stay light.
 *
 * Do NOT replace these with useTheme() tokens: only solid panels (bottom
 * sheets, modals) and accent colors (teal/purple/error) should derive from
 * the active theme on these screens.
 */
export const onVideo = {
  // on-video text: always light over dark video
  text: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.72)',
  textMuted: 'rgba(255,255,255,0.55)',
  textFaint: 'rgba(255,255,255,0.45)',

  // brand purple micro-label — dark-theme purpleSoft reads best over the video
  label: '#A882FF',

  // glass input / card treatment over the video
  inputBg: 'rgba(255,255,255,0.06)',
  inputBgSubtle: 'rgba(255,255,255,0.03)',
  inputBorder: 'rgba(255,255,255,0.15)',
  borderMuted: 'rgba(255,255,255,0.18)',
  hairline: 'rgba(255,255,255,0.12)',
  glassCard: 'rgba(23,23,42,0.82)',
} as const;
