import { useEffect, useRef } from 'react';
import { View, Pressable, StyleSheet, useWindowDimensions, Animated, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, MessageCircle, Search, CalendarDays, User } from 'lucide-react-native';
import { colors } from '@/constants/theme';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

const TAB_ICONS = [Home, MessageCircle, Search, CalendarDays, User] as const;
const TAB_COUNT = 5;

export default function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();

  const pillWidth = Math.round(screenWidth * 0.88);
  const slotWidth = pillWidth / TAB_COUNT;
  const circleSize = Math.round(slotWidth * 0.72);
  const iconSize = Math.round(circleSize * 0.42);
  const searchSize = Math.round(circleSize * 0.46); // slightly larger center icon
  const pillPad = Math.round(circleSize * 0.18);
  const pillHeight = circleSize + pillPad * 2;
  const pillRadius = pillHeight / 2;

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
      Animated.timing(circleScale, { toValue: 0.85, duration: 80, useNativeDriver: true }),
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
        style={[styles.pill, { width: pillWidth, height: pillHeight, borderRadius: pillRadius }]}
      >
        {/* Neumorphic inner highlight */}
        <View
          style={[
            StyleSheet.absoluteFill,
            { borderRadius: pillRadius, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
          ]}
          pointerEvents="none"
        />

        {/* Animated active indicator */}
        <Animated.View
          style={{
            position: 'absolute',
            top: pillPad,
            left: 0,
            width: circleSize,
            height: circleSize,
            borderRadius: circleSize / 2,
            backgroundColor: colors.tealPrimary,
            transform: [{ translateX: circleX }, { scale: circleScale }],
            ...Platform.select({
              ios: {
                shadowColor: colors.tealPrimary,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.45,
                shadowRadius: 14,
              },
              android: { elevation: 8 },
            }),
          }}
        />

        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const Icon = TAB_ICONS[index];
          if (!Icon) return null; // hidden tabs (e.g. post) have no icon slot
          const isCenter = index === 2; // Search is center

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
                size={isCenter ? searchSize : iconSize}
                strokeWidth={isFocused ? 2.5 : 1.5}
                color={isFocused ? colors.onTeal : colors.textMuted}
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
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.5,
        shadowRadius: 16,
      },
      android: { elevation: 16 },
    }),
  },
});
