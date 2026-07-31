import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';
import {
  TAB_BAR_FADE_COLORS,
  TAB_BAR_FADE_HEIGHT,
  TAB_BAR_FADE_LOCATIONS,
} from '@/constants/layout';

/** Same opacity ramp as the dark fade — keeps the fade rate identical in both modes. */
const FADE_OPACITIES = [0, 0.35, 0.72, 0.92] as const;

/** Convert a #RRGGBB hex to "R,G,B" for rgba() strings. */
function hexToRgb(hex: string): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return '0,0,0';
  return `${parseInt(m[1]!, 16)},${parseInt(m[2]!, 16)},${parseInt(m[3]!, 16)}`;
}

function fadeColors(ink: string, floor: string) {
  return [...FADE_OPACITIES.map((a) => `rgba(${ink},${a})`), floor] as [
    string,
    string,
    string,
    string,
    string,
  ];
}

/**
 * Standard bottom fade for tab screens so content softens above the floating nav bar.
 * Dark mode: dark purple vignette. Light mode: same fade rate, lavender ink.
 * Pass `floorColor` when the screen uses a non-default page background (e.g. white).
 */
export default function TabBarBottomFade({ floorColor }: { floorColor?: string }) {
  const { mode, theme, pageBg } = useTheme();
  const fadeStyle = [styles.fade, { height: TAB_BAR_FADE_HEIGHT }];
  const floor = floorColor ?? pageBg;

  const colors =
    mode === 'dark'
      ? ([...TAB_BAR_FADE_COLORS] as [string, string, string, string, string])
      : fadeColors(hexToRgb(floor), floor);

  return (
    <LinearGradient
      colors={colors}
      locations={[...TAB_BAR_FADE_LOCATIONS]}
      style={fadeStyle}
      pointerEvents="none"
    />
  );
}

const styles = StyleSheet.create({
  fade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 12,
  },
});
