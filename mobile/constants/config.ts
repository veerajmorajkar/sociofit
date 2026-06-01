import Constants from 'expo-constants';
import { Platform } from 'react-native';

// On physical devices, localhost won't work. Use your machine's local IP.
// On Android emulator, 10.0.2.2 maps to host machine's localhost.
// On iOS simulator, localhost works fine.
function getDefaultApiUrl(): string {
  if (__DEV__) {
    // Try to get the debugger host (Expo sets this automatically)
    const debuggerHost = Constants.expoConfig?.hostUri?.split(':')[0];
    if (debuggerHost) {
      return `http://${debuggerHost}:3000/api/v1`;
    }

    if (Platform.OS === 'android') {
      return 'http://10.0.2.2:3000/api/v1';
    }

    return 'http://localhost:3000/api/v1';
  }

  // Production URL — update when you deploy
  return 'https://api.fitsocial.app/api/v1';
}

export const API_URL = Constants.expoConfig?.extra?.apiUrl ?? getDefaultApiUrl();
