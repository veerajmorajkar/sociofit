import Constants from 'expo-constants';
import { Platform } from 'react-native';

function getAutoDetectedApiUrl(): string {
  if (!__DEV__) {
    return 'https://api.mumbaifitnessmafia.com/api/v1';
  }

  // Grab the host Metro is serving from — works with Expo Go and dev client.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = Constants as any;
  const rawHost: string | undefined =
    c.expoConfig?.hostUri ??
    c.expoGoConfig?.debuggerHost ??
    c.manifest?.debuggerHost ??
    c.manifest2?.extra?.expoGo?.debuggerHost;

  if (typeof rawHost === 'string' && rawHost) {
    // hostUri/debuggerHost is "<ip>:<metro-port>", strip the port
    const ip = rawHost.split(':')[0];
    return `http://${ip}:3000/api/v1`;
  }

  // Android emulator maps 10.0.2.2 → host machine
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3000/api/v1';
  }

  return 'http://localhost:3000/api/v1';
}

/**
 * Set EXPO_PUBLIC_API_URL in mobile/.env to pin the backend URL.
 * Falls back to auto-detecting the host from the Metro bundler.
 */
export const API_URL: string = process.env.EXPO_PUBLIC_API_URL ?? getAutoDetectedApiUrl();

/** Injected via app.config.ts → app.json extra (Maps SDK for iOS) */
export const GOOGLE_MAPS_IOS_API_KEY: string =
  (Constants.expoConfig?.extra?.googleMapsIosApiKey as string | undefined) ??
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_IOS_API_KEY ??
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ??
  'YOUR_IOS_GOOGLE_MAPS_API_KEY';

/** Injected via app.config.ts → app.json extra (Maps SDK for Android) */
export const GOOGLE_MAPS_ANDROID_API_KEY: string =
  (Constants.expoConfig?.extra?.googleMapsAndroidApiKey as string | undefined) ??
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY ??
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ??
  'YOUR_ANDROID_GOOGLE_MAPS_API_KEY';

export function isGoogleMapsConfigured(platform: 'ios' | 'android'): boolean {
  const key = platform === 'ios' ? GOOGLE_MAPS_IOS_API_KEY : GOOGLE_MAPS_ANDROID_API_KEY;
  return !key.startsWith('YOUR_');
}
