import { Text, Alert, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import AuthFormShell from '@/components/auth/AuthFormShell';
import AuthCtaButton from '@/components/auth/AuthCtaButton';
import AuthPasswordFields from '@/components/auth/AuthPasswordFields';
import StaggeredListItem from '@/components/ui/StaggeredListItem';
import { onVideo } from '@/components/auth/onVideoColors';
import { resetPassword } from '@/services/auth.service';
import { validatePasswordConfirm } from '@/utils/authValidation';
import { fonts } from '@/constants/theme';

export default function ResetPasswordScreen() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    if (!token) {
      Alert.alert('Missing token', 'Please request a password reset again.');
      router.replace('/(auth)/forgot-password');
      return;
    }
    const passwordError = validatePasswordConfirm(password, confirm);
    if (passwordError) {
      Alert.alert('Invalid password', passwordError);
      return;
    }
    setLoading(true);
    try {
      const res = await resetPassword(token, password);
      if (!res.success) {
        Alert.alert('Reset failed', res.error ?? 'Try again');
        return;
      }
      Alert.alert('Password updated', 'You can sign in with your new password.');
      router.replace('/(auth)/login');
    } catch {
      Alert.alert(
        'Connection error',
        'Could not reach the server. Check your internet connection and try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthFormShell>
      <StaggeredListItem index={0}>
        <Text style={s.title}>New password</Text>
        <Text style={s.subtitle}>Choose a strong password for your account.</Text>
      </StaggeredListItem>

      <StaggeredListItem index={1}>
        <AuthPasswordFields
          password={password}
          confirmPassword={confirm}
          onPasswordChange={setPassword}
          onConfirmChange={setConfirm}
          disabled={loading}
          onSubmit={() => void onSubmit()}
        />
      </StaggeredListItem>

      <StaggeredListItem index={2}>
        <AuthCtaButton
          label="Update password"
          onPress={() => void onSubmit()}
          loading={loading}
          style={s.cta}
        />
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
    marginBottom: 28,
  },
  cta: { marginTop: 8 },
});
