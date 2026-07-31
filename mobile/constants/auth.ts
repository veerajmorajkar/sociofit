import Constants from 'expo-constants';
import { Platform } from 'react-native';
import type { VideoSource } from 'expo-video';

/** Bundled sports/fitness loop (Mixkit, free license). Reliable offline playback. */
const BUNDLED_AUTH_VIDEO = require('@/assets/auth/welcome-loop.mp4');

/** Optional remote override — remote URLs often 403 in dev; prefer bundled asset. */
export function getAuthVideoSource(): VideoSource {
  const override = process.env.EXPO_PUBLIC_AUTH_VIDEO_URI?.trim();
  if (override) return override;
  return BUNDLED_AUTH_VIDEO;
}

export const TERMS_URL = 'https://fitsocial.app/terms';
export const PRIVACY_URL = 'https://fitsocial.app/privacy';

function readExtra(key: string): string | undefined {
  const extra = Constants.expoConfig?.extra as Record<string, string | undefined> | undefined;
  return extra?.[key];
}

export const GOOGLE_OAUTH_IOS_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? readExtra('googleOAuthIosClientId') ?? '';

export const GOOGLE_OAUTH_ANDROID_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? readExtra('googleOAuthAndroidClientId') ?? '';

export const GOOGLE_OAUTH_WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? readExtra('googleOAuthWebClientId') ?? '';

export const GOOGLE_OAUTH_EXPO_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID ??
  readExtra('googleOAuthExpoClientId') ??
  GOOGLE_OAUTH_WEB_CLIENT_ID;

export function isGoogleOAuthConfigured(): boolean {
  const { iosClientId, androidClientId, webClientId } = getGoogleOAuthClientIds();
  if (Platform.OS === 'ios') return Boolean(iosClientId);
  if (Platform.OS === 'android') return Boolean(androidClientId);
  return Boolean(webClientId);
}

/** Resolved client IDs for expo-auth-session (web ID doubles as Expo Go fallback on native). */
export function getGoogleOAuthClientIds() {
  const webClientId = GOOGLE_OAUTH_WEB_CLIENT_ID || GOOGLE_OAUTH_EXPO_CLIENT_ID || undefined;
  const iosClientId = GOOGLE_OAUTH_IOS_CLIENT_ID || webClientId;
  const androidClientId = GOOGLE_OAUTH_ANDROID_CLIENT_ID || webClientId;

  return {
    webClientId,
    iosClientId,
    androidClientId,
  };
}

export function isAppleSignInAvailable(): boolean {
  return Platform.OS === 'ios';
}
