import Constants from 'expo-constants';
import { Platform } from 'react-native';

/** Royalty-free sports loop (Pexels). Override with EXPO_PUBLIC_AUTH_VIDEO_URI or bundle local mp4. */
export const AUTH_VIDEO_URI =
  process.env.EXPO_PUBLIC_AUTH_VIDEO_URI ??
  'https://videos.pexels.com/video-files/4761414/4761414-hd_720_1280_25fps.mp4';

export const AUTH_TAGLINE = 'Where Mumbai moves together';

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
  if (Platform.OS === 'ios')
    return Boolean(GOOGLE_OAUTH_IOS_CLIENT_ID || GOOGLE_OAUTH_EXPO_CLIENT_ID);
  if (Platform.OS === 'android')
    return Boolean(GOOGLE_OAUTH_ANDROID_CLIENT_ID || GOOGLE_OAUTH_EXPO_CLIENT_ID);
  return Boolean(GOOGLE_OAUTH_WEB_CLIENT_ID || GOOGLE_OAUTH_EXPO_CLIENT_ID);
}

export function isAppleSignInAvailable(): boolean {
  return Platform.OS === 'ios';
}
