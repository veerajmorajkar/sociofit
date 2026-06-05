import { useCallback, useEffect, useState } from 'react';
import { Alert, Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import {
  GOOGLE_OAUTH_ANDROID_CLIENT_ID,
  GOOGLE_OAUTH_EXPO_CLIENT_ID,
  GOOGLE_OAUTH_IOS_CLIENT_ID,
  GOOGLE_OAUTH_WEB_CLIENT_ID,
  isAppleSignInAvailable,
  isGoogleOAuthConfigured,
} from '@/constants/auth';
import { loginWithApple, loginWithGoogle } from '@/services/auth.service';
import { useAuthStore } from '@/stores/authStore';
import { API_URL } from '@/constants/config';

WebBrowser.maybeCompleteAuthSession();

type AccountType = 'personal' | 'club';
type AuthMode = 'login' | 'signup';

interface Options {
  mode: AuthMode;
  accountType?: AccountType;
}

export function useSocialAuth({ mode, accountType }: Options) {
  const setAuth = useAuthStore((s) => s.setAuth);
  const [loading, setLoading] = useState<'google' | 'apple' | null>(null);

  const googleConfigured = isGoogleOAuthConfigured();
  const webClientId = GOOGLE_OAUTH_WEB_CLIENT_ID || GOOGLE_OAUTH_EXPO_CLIENT_ID || undefined;

  const [googleRequest, googleResponse, promptGoogle] = Google.useAuthRequest({
    iosClientId: GOOGLE_OAUTH_IOS_CLIENT_ID || webClientId,
    androidClientId: GOOGLE_OAUTH_ANDROID_CLIENT_ID || webClientId,
    webClientId,
    scopes: ['openid', 'profile', 'email'],
  });

  const finishAuth = useCallback(
    async (result: Awaited<ReturnType<typeof loginWithGoogle>>, provider: 'google' | 'apple') => {
      if (!result.success) {
        Alert.alert('Sign in failed', result.error ?? 'Could not authenticate.');
        return;
      }

      const { user, accessToken, refreshToken, needsProfile } = result.data;
      await setAuth(user, accessToken, refreshToken);

      if (needsProfile) {
        router.push({
          pathname: '/(auth)/oauth-complete',
          params: {
            accountType: accountType ?? user.accountType ?? 'personal',
            displayName: user.displayName,
            username: user.username,
            provider,
          },
        });
        return;
      }

      router.replace('/(tabs)');
    },
    [accountType, setAuth],
  );

  useEffect(() => {
    if (!googleResponse || googleResponse.type !== 'success') return;
    const idToken = googleResponse.authentication?.idToken;
    if (!idToken) {
      Alert.alert(
        'Google sign-in',
        'No identity token returned. Check OAuth client IDs in mobile/.env',
      );
      setLoading(null);
      return;
    }

    void (async () => {
      try {
        const result = await loginWithGoogle({
          idToken,
          mode,
          accountType: mode === 'signup' ? accountType : undefined,
        });
        await finishAuth(result, 'google');
      } catch (err) {
        Alert.alert(
          'Connection error',
          `${err instanceof Error ? err.message : 'Could not reach server.'}\n\nAPI: ${API_URL}`,
        );
      } finally {
        setLoading(null);
      }
    })();
  }, [googleResponse, mode, accountType, finishAuth]);

  const signInWithGoogle = useCallback(async () => {
    if (!googleConfigured) {
      Alert.alert(
        'Google Sign-In',
        'Add EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID (and platform client IDs) to mobile/.env. See mobile/.env.example.',
      );
      return;
    }
    setLoading('google');
    try {
      await promptGoogle();
    } catch {
      setLoading(null);
    }
  }, [googleConfigured, promptGoogle]);

  const signInWithApple = useCallback(async () => {
    if (!isAppleSignInAvailable()) {
      Alert.alert('Apple Sign-In', 'Available on iOS only.');
      return;
    }

    setLoading('apple');
    try {
      const available = await AppleAuthentication.isAvailableAsync();
      if (!available) {
        Alert.alert('Apple Sign-In', 'Not available on this device.');
        return;
      }

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        Alert.alert('Apple Sign-In', 'No identity token returned.');
        return;
      }

      const result = await loginWithApple({
        identityToken: credential.identityToken,
        fullName: credential.fullName
          ? {
              givenName: credential.fullName.givenName ?? undefined,
              familyName: credential.fullName.familyName ?? undefined,
            }
          : undefined,
        mode,
        accountType: mode === 'signup' ? accountType : undefined,
      });
      await finishAuth(result, 'apple');
    } catch (err) {
      if (err && typeof err === 'object' && 'code' in err && err.code === 'ERR_REQUEST_CANCELED')
        return;
      Alert.alert('Apple Sign-In failed', err instanceof Error ? err.message : 'Try again.');
    } finally {
      setLoading(null);
    }
  }, [accountType, finishAuth, mode]);

  return {
    signInWithGoogle,
    signInWithApple,
    loading,
    googleReady: googleConfigured && !!googleRequest,
    appleReady: isAppleSignInAvailable(),
  };
}
