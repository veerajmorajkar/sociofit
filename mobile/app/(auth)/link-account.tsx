import { Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import AuthFormShell from '@/components/auth/AuthFormShell';
import AuthCtaButton from '@/components/auth/AuthCtaButton';
import PasswordInput from '@/components/auth/PasswordInput';
import StaggeredListItem from '@/components/ui/StaggeredListItem';
import { onVideo } from '@/components/auth/onVideoColors';
import { confirmAccountLink } from '@/services/auth.service';
import { useAuthStore } from '@/stores/authStore';
import { fonts } from '@/constants/theme';

export default function LinkAccountScreen() {
  const params = useLocalSearchParams<{
    linkToken?: string;
    maskedEmail?: string;
    provider?: string;
  }>();

  const linkToken = typeof params.linkToken === 'string' ? params.linkToken : '';
  const maskedEmail = typeof params.maskedEmail === 'string' ? params.maskedEmail : 'this email';
  const providerLabel = params.provider === 'apple' ? 'Apple' : 'Google';

  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);

  const handleConfirm = async () => {
    if (!linkToken) {
      Alert.alert('Link expired', 'Please try signing in again.');
      router.replace('/(auth)/login-options');
      return;
    }
    if (!password) {
      Alert.alert('Password required', 'Enter your account password to continue.');
      return;
    }

    setLoading(true);
    try {
      const result = await confirmAccountLink({ linkToken, password });

      if (!result.success) {
        Alert.alert('Could not link account', result.error ?? 'Try again.');
        return;
      }

      const { user, accessToken, refreshToken, needsProfile } = result.data;
      await setAuth(user, accessToken, refreshToken);

      if (needsProfile) {
        router.replace({
          pathname: '/(auth)/oauth-complete',
          params: {
            accountType: user.accountType,
            displayName: user.displayName,
            username: user.username,
            email: user.email ?? '',
            provider: providerLabel.toLowerCase(),
          },
        });
        return;
      }

      router.replace('/(tabs)');
    } catch {
      Alert.alert(
        'Could not link account',
        'Could not reach the server. Check your internet connection and try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  // This screen is always pushed from the social-auth flow (login-options),
  // so router.back() pops to where the user actually came from.
  return (
    <AuthFormShell onBack={() => router.back()}>
      <StaggeredListItem index={0}>
        <Text style={s.title}>Link your account</Text>
        <Text style={s.subtitle}>
          An account with {maskedEmail} already exists. Enter its password to link your{' '}
          {providerLabel} sign-in to it.
        </Text>
      </StaggeredListItem>

      <StaggeredListItem index={1}>
        <Text style={s.sectionLabel}>Password</Text>
        <PasswordInput
          containerStyle={s.passwordField}
          inputStyle={s.passwordInput}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          editable={!loading}
          onSubmitEditing={() => void handleConfirm()}
          returnKeyType="go"
          accessibilityLabel="Existing account password"
        />
      </StaggeredListItem>

      <StaggeredListItem index={2}>
        <AuthCtaButton
          label="Link account"
          onPress={() => void handleConfirm()}
          loading={loading}
          style={s.cta}
        />
      </StaggeredListItem>

      <StaggeredListItem index={3}>
        <TouchableOpacity
          style={s.cancelRow}
          onPress={() => router.replace('/(auth)/login-options')}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel="Cancel linking account"
        >
          <Text style={s.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </StaggeredListItem>
    </AuthFormShell>
  );
}

const s = StyleSheet.create({
  // on-video text: always light over dark video
  title: { fontFamily: fonts.h1, fontSize: 28, color: onVideo.text, marginBottom: 8 },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: onVideo.textSecondary,
    marginBottom: 24,
    lineHeight: 22,
  },
  sectionLabel: {
    fontFamily: fonts.label,
    fontSize: 13,
    color: onVideo.label,
    letterSpacing: 0.3,
    marginBottom: 10,
  },
  passwordField: { marginBottom: 20 },
  passwordInput: { paddingVertical: 16 },
  cta: { marginBottom: 16 },
  cancelRow: { alignSelf: 'center', minHeight: 44, justifyContent: 'center' },
  cancelText: { fontFamily: fonts.bodyStrong, fontSize: 14, color: 'rgba(255,255,255,0.65)' },
});
