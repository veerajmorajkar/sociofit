/**
 * Shared layout constants used across screens and components.
 * The nav bar total height is: pillHeight + bottomInset + extraPad
 * We use a generous value that works on all iPhone sizes.
 */

// Pill height on a 390px wide screen (iPhone 15):
// pillWidth = 390 * 0.88 = 343
// slotWidth = 343 / 5 = 68.6
// circleSize = 68.6 * 0.72 = 49 (rounded)
// pillPad = 49 * 0.18 = 9 (rounded)
// pillHeight = 49 + 9*2 = 67

export const NAV_PILL_HEIGHT = 67;
export const NAV_BOTTOM_INSET = 34; // iPhone home indicator safe area
export const NAV_EXTRA_PAD = 20; // extra breathing room below pill

// Total space the nav bar occupies from the bottom of the screen
export const NAV_TOTAL_HEIGHT = NAV_PILL_HEIGHT + NAV_BOTTOM_INSET + NAV_EXTRA_PAD;

// Padding to add to scrollable content so last item clears the nav bar
// Extra 16px so the last card has breathing room above the pill
export const SCROLL_BOTTOM_PADDING = NAV_TOTAL_HEIGHT + 16;

/** Bottom vignette above the floating tab bar — same on every tab screen */
export const TAB_BAR_FADE_HEIGHT = NAV_TOTAL_HEIGHT + 56;

export const TAB_BAR_FADE_COLORS = [
  'rgba(14,14,20,0)',
  'rgba(14,14,20,0.35)',
  'rgba(14,14,20,0.72)',
  'rgba(14,14,20,0.92)',
  '#0E0E14',
] as const;

export const TAB_BAR_FADE_LOCATIONS = [0, 0.28, 0.58, 0.82, 1] as const;
