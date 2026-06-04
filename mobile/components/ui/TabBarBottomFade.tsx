import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  TAB_BAR_FADE_COLORS,
  TAB_BAR_FADE_HEIGHT,
  TAB_BAR_FADE_LOCATIONS,
} from '@/constants/layout';

/**
 * Standard bottom fade for tab screens so content softens above the floating nav bar.
 * Use once per screen root (pointerEvents="none", fixed to bottom).
 */
export default function TabBarBottomFade() {
  return (
    <LinearGradient
      colors={[...TAB_BAR_FADE_COLORS]}
      locations={[...TAB_BAR_FADE_LOCATIONS]}
      style={[styles.fade, { height: TAB_BAR_FADE_HEIGHT }]}
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
