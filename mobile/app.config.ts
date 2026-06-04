import type { ConfigContext, ExpoConfig } from 'expo/config';

/** Shown in builds until you set keys in mobile/.env or EAS env */
export const GOOGLE_MAPS_IOS_PLACEHOLDER = 'YOUR_IOS_GOOGLE_MAPS_API_KEY';
export const GOOGLE_MAPS_ANDROID_PLACEHOLDER = 'YOUR_ANDROID_GOOGLE_MAPS_API_KEY';

function resolveGoogleMapsKeys() {
  const shared = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
  const ios =
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_IOS_API_KEY?.trim() ||
    shared ||
    GOOGLE_MAPS_IOS_PLACEHOLDER;
  const android =
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY?.trim() ||
    shared ||
    GOOGLE_MAPS_ANDROID_PLACEHOLDER;
  return { ios, android };
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const { ios: googleMapsIosApiKey, android: googleMapsAndroidApiKey } = resolveGoogleMapsKeys();

  return {
    ...config,
    name: config.name ?? 'Mumbai Fitness Mafia',
    slug: config.slug ?? 'fitsocial',
    ios: {
      ...config.ios,
      config: {
        ...config.ios?.config,
        googleMapsApiKey: googleMapsIosApiKey,
      },
    },
    android: {
      ...config.android,
      config: {
        ...config.android?.config,
        googleMaps: {
          apiKey: googleMapsAndroidApiKey,
        },
      },
    },
    extra: {
      ...config.extra,
      googleMapsIosApiKey,
      googleMapsAndroidApiKey,
    },
  };
};
