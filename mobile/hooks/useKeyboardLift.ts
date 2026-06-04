import { useEffect, useRef } from 'react';
import { Animated, Easing, Keyboard, Platform, type KeyboardEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const KEYBOARD_EASING = Easing.bezier(0.33, 0.99, 0.52, 1);

/**
 * Instagram-style lift for a bottom-fixed composer.
 * Returns an Animated translateY (negative = moves up with keyboard).
 */
export function useKeyboardLift(enabled = true) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!enabled) {
      translateY.setValue(0);
      return;
    }

    const duration = (e?: KeyboardEvent) => {
      const sys = e?.duration ?? 250;
      return Platform.OS === 'ios' ? Math.round(sys * 0.72) : 180;
    };

    const animateTo = (toValue: number, e?: KeyboardEvent) => {
      Animated.timing(translateY, {
        toValue,
        duration: duration(e),
        easing: KEYBOARD_EASING,
        useNativeDriver: true,
      }).start();
    };

    const onShow = (e: KeyboardEvent) => {
      translateY.stopAnimation();
      const lift = Math.max(0, e.endCoordinates.height - insets.bottom);
      animateTo(-lift, e);
    };

    const onHide = (e?: KeyboardEvent) => {
      translateY.stopAnimation();
      animateTo(0, e);
    };

    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const subShow = Keyboard.addListener(showEvt, onShow);
    const subHide = Keyboard.addListener(hideEvt, onHide);

    return () => {
      subShow.remove();
      subHide.remove();
      translateY.stopAnimation();
      translateY.setValue(0);
    };
  }, [enabled, insets.bottom, translateY]);

  return translateY;
}
