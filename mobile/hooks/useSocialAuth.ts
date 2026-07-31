import { useCallback, useEffect, useState } from 'react';
import { Alert, Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import {
  getGoogleOAuthClientIds,
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

function useFinishAuth(accountType: AccountType | undefined) {
  const setAuth = useAuthStore((s) => s.setAuth);

  return useCallback(
    async (result: Awaited<ReturnType<typeof loginWithGoogle>>, provider: 'google' | 'apple') => {
      if (!result.success) {
        Alert.alert('Sign in failed', result.error ?? 'Could not authenticate.');
        return;
      }

      if (result.data.needsLinkConfirmation) {
        const { linkToken, maskedEmail } = result.data;
        router.push({
          pathname: '/(auth)/link-account',
          params: { linkToken, maskedEmail, provider },
        });
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
            email: user.email ?? '',
            provider,
          },
        });
        return;
      }

      router.replace('/(tabs)');
    },
    [accountType, setAuth],
  );
}

/** Apple + shared helpers — safe to call on every auth screen. */
export function useSocialAuth({ mode, accountType }: Options) {
  const [loading, setLoading] = useState<'google' | 'apple' | null>(null);
  const finishAuth = useFinishAuth(accountType);

  const signInWithGoogleUnavailable = useCallback(() => {
    Alert.alert(
      'Google Sign-In',
      'Add EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID (and iOS/Android client IDs) to mobile/.env. See mobile/.env.example.',
    );
  }, []);

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
    signInWithApple,
    loading,
    setLoading,
    finishAuth,
    signInWithGoogleUnavailable,
    appleReady: isAppleSignInAvailable(),
    googleReady: false,
    signInWithGoogle: signInWithGoogleUnavailable,
  };
}

/**
 * Google OAuth hook — only mount via `SocialAuthButtonsWithGoogle`.
 * Must not run unless client IDs are configured (expo-auth-session throws otherwise).
 */
export function useGoogleSocialAuth({ mode, accountType }: Options) {
  const base = useSocialAuth({ mode, accountType });
  const { finishAuth, setLoading, signInWithGoogleUnavailable } = base;
  const clientIds = getGoogleOAuthClientIds();

  const [googleRequest, googleResponse, promptGoogle] = Google.useAuthRequest({
    iosClientId: clientIds.iosClientId,
    androidClientId: clientIds.androidClientId,
    webClientId: clientIds.webClientId,
    scopes: ['openid', 'profile', 'email'],
  });

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
  }, [googleResponse, mode, accountType, finishAuth, setLoading]);

  const signInWithGoogle = useCallback(async () => {
    if (!isGoogleOAuthConfigured()) {
      signInWithGoogleUnavailable();
      return;
    }
    setLoading('google');
    try {
      await promptGoogle();
    } catch {
      setLoading(null);
    }
  }, [promptGoogle, setLoading, signInWithGoogleUnavailable]);

  return {
    ...base,
    signInWithGoogle,
    googleReady: Boolean(googleRequest),
  };
}
