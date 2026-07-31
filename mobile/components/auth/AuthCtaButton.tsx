import { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { fonts, radius } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { impactHaptic } from '@/utils/haptics';

interface Props {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Primary teal auth CTA — spring scale-down on press (à la PressableScale),
 * medium haptic, and an animated (not snapping) disabled↔enabled opacity.
 */
export default function AuthCtaButton({
  label,
  onPress,
  disabled = false,
  loading = false,
  style,
}: Props) {
  const { theme } = useTheme();
  const blocked = disabled || loading;

  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(blocked ? 0.55 : 1)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: blocked ? 0.55 : 1,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [blocked, opacity]);

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 40,
      bounciness: 0,
    }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 24, bounciness: 7 }).start();
  };

  return (
    <Pressable
      onPress={() => {
        impactHaptic();
        onPress();
      }}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={blocked}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: blocked, busy: loading }}
    >
      <Animated.View
        style={[
          s.btn,
          { backgroundColor: theme.tealPrimary, opacity, transform: [{ scale }] },
          theme.shadows.teal,
          style,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={theme.onTeal} />
        ) : (
          <Text style={[s.label, { color: theme.onTeal }]}>{label}</Text>
        )}
      </Animated.View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  btn: {
    borderRadius: radius.md,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: fonts.h2,
    fontSize: 16,
    letterSpacing: 0.2,
  },
});
