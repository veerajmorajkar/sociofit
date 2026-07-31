export type HeroNavTone = 'light' | 'dark';

/** Relative luminance for sRGB hex, 0 = black, 1 = white. */
export function hexLuminance(hex: string): number {
  const normalized = hex.replace('#', '').trim();
  if (normalized.length !== 6) return 0;

  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);

  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

export function isLightHex(hex: string, threshold = 0.56): boolean {
  return hexLuminance(hex) >= threshold;
}

/** Nav sits on the top-left of category gradients — use the first stop. */
export function heroToneFromGradient(stops: readonly string[]): HeroNavTone {
  const sample = stops[0] ?? stops[stops.length - 1];
  return sample && isLightHex(sample) ? 'light' : 'dark';
}

export function navInkForTone(tone: HeroNavTone): string {
  return tone === 'light' ? '#0E0E14' : '#FFFFFF';
}
