import { useEffect, useRef } from 'react';
import { View, Pressable, StyleSheet, useWindowDimensions, Animated, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, MessageCircle, Search, CalendarDays, User } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { tapHaptic } from '@/utils/haptics';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

const TAB_ICONS = [Home, MessageCircle, Search, CalendarDays, User] as const;
const TAB_COUNT = 5;

export default function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const { theme, mode } = useTheme();

  const pillBg = mode === 'light' ? theme.navBackground : theme.surface1;
  const inactiveIcon = mode === 'light' ? theme.textSecondary : theme.textMuted;

  const pillWidth = Math.round(screenWidth * 0.88);
  const slotWidth = pillWidth / TAB_COUNT;
  const circleSize = Math.round(slotWidth * 0.72);
  const iconSize = Math.round(circleSize * 0.42);
  const searchSize = Math.round(circleSize * 0.46);
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
    <View style={[s.outer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
      <View
        style={[
          s.pill,
          {
            width: pillWidth,
            height: pillHeight,
            borderRadius: pillRadius,
            backgroundColor: pillBg,
            borderWidth: 1,
            borderColor: theme.navBorder,
          },
          Platform.select({
            ios: {
              shadowColor: mode === 'light' ? theme.purpleDeep : theme.purpleHero,
              shadowOffset: { width: 0, height: mode === 'light' ? 6 : -2 },
              shadowOpacity: mode === 'light' ? 0.24 : 0.1,
              shadowRadius: mode === 'light' ? 22 : 16,
            },
            android: { elevation: mode === 'light' ? 14 : 16 },
          }),
        ]}
      >
        {mode === 'dark' ? (
          <View
            style={[
              StyleSheet.absoluteFill,
              {
                borderRadius: pillRadius,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.04)',
              },
            ]}
            pointerEvents="none"
          />
        ) : null}

        {/* Animated active indicator — teal circle unchanged */}
        <Animated.View
          style={{
            position: 'absolute',
            top: pillPad,
            left: 0,
            width: circleSize,
            height: circleSize,
            borderRadius: circleSize / 2,
            backgroundColor: theme.tealPrimary,
            transform: [{ translateX: circleX }, { scale: circleScale }],
            ...Platform.select({
              ios: {
                shadowColor: theme.tealPrimary,
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
          if (!Icon) return null;
          const isCenter = index === 2;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              tapHaptic();
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
                color={isFocused ? theme.onTeal : inactiveIcon}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
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
  },
});
