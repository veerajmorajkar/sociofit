import { useRef, type ReactNode } from 'react';
import {
  Animated,
  Pressable,
  type GestureResponderEvent,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { tapHaptic } from '@/utils/haptics';

interface Props extends Omit<PressableProps, 'style'> {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Scale factor while pressed. Default 0.96. */
  pressedScale?: number;
  /** Fire a light haptic tap on press. Default false. */
  haptic?: boolean;
}

/**
 * Shared micro-interaction primitive: a Pressable that springs down on
 * press-in and bounces back on release, with an optional light haptic.
 * Replaces bare `TouchableOpacity activeOpacity={0.8}` for tactile presses.
 */
export default function PressableScale({
  children,
  style,
  pressedScale = 0.96,
  haptic = false,
  onPress,
  onPressIn,
  onPressOut,
  disabled,
  ...rest
}: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = (e: GestureResponderEvent) => {
    Animated.spring(scale, {
      toValue: pressedScale,
      useNativeDriver: true,
      speed: 40,
      bounciness: 0,
    }).start();
    onPressIn?.(e);
  };

  const handlePressOut = (e: GestureResponderEvent) => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 24,
      bounciness: 7,
    }).start();
    onPressOut?.(e);
  };

  const handlePress = (e: GestureResponderEvent) => {
    if (haptic) tapHaptic();
    onPress?.(e);
  };

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      {...rest}
    >
      <Animated.View
        style={[style, { transform: [{ scale }] }, disabled ? { opacity: 0.55 } : null]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}
