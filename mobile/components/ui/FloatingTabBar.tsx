import { useEffect, useRef } from 'react';
import { View, Pressable, StyleSheet, useWindowDimensions, Animated, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, Search, Plus, CalendarDays, User } from 'lucide-react-native';
import { colors } from '@/constants/theme';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

const TAB_ICONS = [Home, Search, Plus, CalendarDays, User] as const;
const TAB_COUNT = 5;

/**
 * ALL dimensions derive from screen width via a single ratio chain:
 *
 *   screenWidth
 *     └─ pillWidth     = screenWidth × 0.88
 *         └─ slotWidth = pillWidth / 5
 *             └─ circle = slotWidth × 0.72
 *                 └─ icon = circle × 0.42
 *         └─ pillPad   = (pillHeight - circle) / 2   ← auto margin
 *         └─ pillHeight = circle + pillPad×2
 *
 * This guarantees: circle is centered in its slot, slot is centered in the pill,
 * pill margin to circle is consistent, and everything scales with the device.
 */
export default function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();

  // ── Derive all sizes from screen width ──
  const pillWidth = Math.round(screenWidth * 0.88);
  const sideMargin = (screenWidth - pillWidth) / 2; // symmetric left/right
  const slotWidth = pillWidth / TAB_COUNT;
  const circleSize = Math.round(slotWidth * 0.72);
  const iconSize = Math.round(circleSize * 0.42);
  const postIconSize = Math.round(circleSize * 0.46); // slightly larger for center action
  const pillPad = Math.round(circleSize * 0.18); // consistent gap between circle edge and pill edge
  const pillHeight = circleSize + pillPad * 2;
  const pillRadius = pillHeight / 2;

  // ── Circle position: perfectly centered in each slot ──
  const getCircleX = (index: number) => index * slotWidth + (slotWidth - circleSize) / 2;

  const circleX = useRef(new Animated.Value(getCircleX(state.index))).current;
  const circleScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(circleX, {
      toValue: getCircleX(state.index),
      useNativeDriver: true,
      damping: 26,
      stiffness: 130,
      mass: 0.9,
    }).start();

    Animated.sequence([
      Animated.timing(circleScale, {
        toValue: 0.85,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.spring(circleScale, {
        toValue: 1,
        useNativeDriver: true,
        damping: 10,
        stiffness: 180,
        mass: 0.6,
      }),
    ]).start();
  }, [state.index]);

  return (
    <View style={[styles.outer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
      <View
        style={[
          styles.pill,
          {
            width: pillWidth,
            height: pillHeight,
            borderRadius: pillRadius,
          },
        ]}
      >
        {/* Subtle inner highlight for neumorphic depth */}
        <View
          style={[
            StyleSheet.absoluteFill,
            { borderRadius: pillRadius, borderWidth: 1, borderColor: 'rgba(255,255,255,0.035)' },
          ]}
          pointerEvents="none"
        />

        {/* Animated lime circle — centered vertically via `top`, horizontally via translateX */}
        <Animated.View
          style={{
            position: 'absolute',
            top: pillPad,
            left: 0,
            width: circleSize,
            height: circleSize,
            borderRadius: circleSize / 2,
            backgroundColor: colors.lime,
            transform: [{ translateX: circleX }, { scale: circleScale }],
            ...Platform.select({
              ios: {
                shadowColor: '#D4EA4D',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.4,
                shadowRadius: 14,
              },
              android: { elevation: 8 },
            }),
          }}
        />

        {/* Icon slots — each slot is slotWidth wide, icons centered */}
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const Icon = TAB_ICONS[index]!;
          const isPost = index === 2;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={{
                width: slotWidth,
                height: pillHeight,
                alignItems: 'center',
                justifyContent: 'center',
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: isFocused }}
              accessibilityLabel={route.name}
            >
              <Icon
                size={isPost ? postIconSize : iconSize}
                strokeWidth={isFocused ? 2.5 : 1.5}
                color={isFocused ? colors.textInverse : colors.text3}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface2,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 4, height: 6 },
        shadowOpacity: 0.65,
        shadowRadius: 16,
      },
      android: { elevation: 16 },
    }),
  },
});
