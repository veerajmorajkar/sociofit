import { heroToneFromGradient, type HeroNavTone } from '@/utils/heroTone';

/**
 * Resolves nav ink tone for the event hero.
 * Prefers server-analyzed coverNavTone (sharp on backend); gradients use palette.
 */
export function useHeroNavTone(
  coverImageUrl: string | null | undefined,
  coverNavTone: 'light' | 'dark' | null | undefined,
  gradientStops: readonly string[],
): HeroNavTone {
  if (coverNavTone === 'light' || coverNavTone === 'dark') {
    return coverNavTone;
  }
  if (!coverImageUrl) {
    return heroToneFromGradient(gradientStops);
  }
  return 'dark';
}
