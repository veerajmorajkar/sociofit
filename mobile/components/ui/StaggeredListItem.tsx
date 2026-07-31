import { useEffect, useRef, type ReactNode } from 'react';
import { Animated } from 'react-native';

interface Props {
  children: ReactNode;
  /** Position in the list — drives the stagger delay. */
  index: number;
  /** Delay per item in ms. Default 45. */
  stepMs?: number;
  /** Items beyond this index animate together (no endless waterfall). Default 8. */
  maxStaggered?: number;
}

/**
 * Entrance micro-interaction for list rows: fade + slide-up with a small
 * per-index stagger. Runs once on mount; re-renders don't replay it.
 */
export default function StaggeredListItem({
  children,
  index,
  stepMs = 45,
  maxStaggered = 8,
}: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(14)).current;

  useEffect(() => {
    const delay = Math.min(index, maxStaggered) * stepMs;
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 260,
        delay,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        delay,
        useNativeDriver: true,
        damping: 18,
        stiffness: 160,
        mass: 0.8,
      }),
    ]).start();
    // Mount-only entrance animation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <Animated.View style={{ opacity, transform: [{ translateY }] }}>{children}</Animated.View>;
}
