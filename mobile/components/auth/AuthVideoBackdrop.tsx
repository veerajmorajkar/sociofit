import type { ComponentType } from 'react';
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { requireOptionalNativeModule } from 'expo-modules-core';

interface Props {
  children?: React.ReactNode;
}

const hasExpoVideo = requireOptionalNativeModule('ExpoVideo') != null;

// Optional native module — only load the video layer when ExpoVideo exists (dev/prod builds).
const AuthVideoLayer = hasExpoVideo
  ? // eslint-disable-next-line @typescript-eslint/no-require-imports -- conditional native import
    (require('./AuthVideoLayer').default as ComponentType<Props>)
  : null;

function GradientBackdrop({ children }: Props) {
  const contentOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(contentOpacity, {
      toValue: 1,
      duration: 420,
      useNativeDriver: true,
    }).start();
  }, [contentOpacity]);

  return (
    <View style={s.root}>
      <LinearGradient
        colors={['rgba(14,14,20,0.85)', 'rgba(14,14,20,0.92)', 'rgba(14,14,20,0.98)']}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <Animated.View style={[s.content, { opacity: contentOpacity }]}>{children}</Animated.View>
    </View>
  );
}

/** Auth backdrop — video when native module exists (dev build), gradient fallback in Expo Go. */
export default function AuthVideoBackdrop({ children }: Props) {
  if (AuthVideoLayer) {
    return <AuthVideoLayer>{children}</AuthVideoLayer>;
  }
  return <GradientBackdrop>{children}</GradientBackdrop>;
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    // Deliberately dark in BOTH themes — the backdrop stands in for the dark video.
    backgroundColor: '#0E0E14',
  },
  content: {
    flex: 1,
  },
});
