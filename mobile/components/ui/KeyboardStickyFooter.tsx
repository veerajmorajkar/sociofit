import { type ReactNode } from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';

interface Props {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** comment = sheet dock; chat = minimal dark footer for pill composer */
  variant?: 'default' | 'comment' | 'chat';
}

/**
 * Fixed bottom bar in normal document flow (not absolute).
 * Pair with KeyboardAvoidingView on the parent screen — no translateY animations.
 */
export default function KeyboardStickyFooter({ children, style, variant = 'default' }: Props) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  if (variant === 'comment') {
    return (
      <View
        style={[
          s.commentFooter,
          {
            paddingBottom: Math.max(10, insets.bottom - 12),
            backgroundColor: theme.surface1,
            borderTopColor: theme.surface3,
          },
          style,
        ]}
      >
        {children}
      </View>
    );
  }

  if (variant === 'chat') {
    return (
      <View
        style={[
          s.chatFooter,
          {
            paddingBottom: Math.max(12, insets.bottom - 8),
            backgroundColor: theme.surface1,
            borderTopColor: theme.surface3,
          },
          style,
        ]}
      >
        {children}
      </View>
    );
  }

  return (
    <View
      style={[s.footer, { backgroundColor: theme.surface1, borderTopColor: theme.surface3 }, style]}
    >
      <View style={s.footerInner}>{children}</View>
      <View style={{ height: Math.max(insets.bottom, 8) }} />
    </View>
  );
}

const s = StyleSheet.create({
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerInner: {
    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  commentFooter: {
    paddingHorizontal: 16,
    paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  chatFooter: {
    paddingHorizontal: 16,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
