import { type ReactNode } from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/constants/theme';

interface Props {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Fixed bottom bar in normal document flow (not absolute).
 * Pair with KeyboardAvoidingView on the parent screen — no translateY animations.
 */
export default function KeyboardStickyFooter({ children, style }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[s.footer, style]}>
      <View style={s.footerInner}>{children}</View>
      <View style={{ height: Math.max(insets.bottom, 8) }} />
    </View>
  );
}

const s = StyleSheet.create({
  footer: {
    backgroundColor: colors.surface1,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.surface3,
  },
  footerInner: {
    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
});
