import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

export const TEAL_REFRESH_SLOT_HEIGHT = 44;

/** Teal-only refresh slot — open while pulling or refreshing. */
export function TealRefreshHeader({ active }: { active: boolean }) {
  const { theme } = useTheme();
  return (
    <View style={[s.slot, active && s.slotActive]}>
      {active ? <ActivityIndicator size="small" color={theme.tealPrimary} /> : null}
    </View>
  );
}

/** FlatList / ScrollView props that enable overscroll pull. */
export const TEAL_REFRESH_SCROLL_PROPS = {
  alwaysBounceVertical: true,
  overScrollMode: 'always' as const,
};

const s = StyleSheet.create({
  slot: {
    height: 0,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotActive: {
    height: TEAL_REFRESH_SLOT_HEIGHT,
  },
});
