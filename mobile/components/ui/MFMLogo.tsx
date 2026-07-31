import { Image } from 'expo-image';
import {
  MFM_LOGO,
  MFM_LOGO_ACCESSIBILITY_LABEL,
  MFM_LOGO_ASPECT,
  MFM_LOGO_HEADER_WIDTH,
  MFM_LOGO_HERO_WIDTH,
} from '@/constants/branding';

interface Props {
  /** Rendered width; height follows logo aspect ratio. */
  width?: number;
}

/**
 * Mumbai Fitness Mafia — official gradient wordmark.
 */
export default function MFMLogo({ width = MFM_LOGO_HEADER_WIDTH }: Props) {
  const height = width / MFM_LOGO_ASPECT;

  return (
    <Image
      source={MFM_LOGO}
      style={{ width, height }}
      contentFit="contain"
      accessibilityRole="image"
      accessibilityLabel={MFM_LOGO_ACCESSIBILITY_LABEL}
    />
  );
}

/** Pre-sized for auth welcome / login hero sections. */
export function MFMLogoHero() {
  return <MFMLogo width={MFM_LOGO_HERO_WIDTH} />;
}
