import { Platform, StyleSheet, View } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { darkTheme } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';

export const SEARCH_TOP_SCRIM_HEIGHT = 188;

/** Same fade curve as the dark scrim — blur visibility follows this ramp in light mode. */
const SCRIM_LOCATIONS = [0, 0.38, 0.72, 1] as const;

const DARK_SCRIM = [
  darkTheme.bgPrimary,
  'rgba(14,14,20,0.7)',
  'rgba(14,14,20,0.34)',
  'rgba(14,14,20,0)',
] as const;

/** Mask: black = show blur, transparent = hide — mirrors dark-mode opacity stops. */
const BLUR_MASK = ['#000000', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.34)', 'transparent'] as const;

/** Convert a #RRGGBB hex to "R,G,B" for rgba() strings. */
function hexToRgb(hex: string): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return '0,0,0';
  return `${parseInt(m[1]!, 16)},${parseInt(m[2]!, 16)},${parseInt(m[3]!, 16)}`;
}

/**
 * Top vignette on the search map overlay.
 * Dark mode: opaque dark fade. Light mode: gradient-masked frosted blur + faint purple tint.
 */
export default function SearchTopScrim() {
  const { mode, theme } = useTheme();

  if (mode === 'dark') {
    return (
      <LinearGradient
        pointerEvents="none"
        colors={[...DARK_SCRIM]}
        locations={[...SCRIM_LOCATIONS]}
        style={styles.scrim}
      />
    );
  }

  const ink = hexToRgb(theme.purpleHero);
  const glassTint = [
    `rgba(${ink},0.26)`,
    `rgba(${ink},0.14)`,
    `rgba(${ink},0.05)`,
    `rgba(${ink},0)`,
  ] as const;

  return (
    <View style={styles.scrim} pointerEvents="none">
      <MaskedView
        style={StyleSheet.absoluteFill}
        maskElement={
          <LinearGradient
            colors={[...BLUR_MASK]}
            locations={[...SCRIM_LOCATIONS]}
            style={StyleSheet.absoluteFill}
          />
        }
      >
        <BlurView
          intensity={Platform.OS === 'ios' ? 28 : 22}
          tint="dark"
          style={StyleSheet.absoluteFill}
        />
      </MaskedView>
      <LinearGradient
        pointerEvents="none"
        colors={[...glassTint]}
        locations={[...SCRIM_LOCATIONS]}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: SEARCH_TOP_SCRIM_HEIGHT,
    overflow: 'hidden',
  },
});
