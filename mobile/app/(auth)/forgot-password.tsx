import { Text, TextInput, Alert, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import AuthFormShell from '@/components/auth/AuthFormShell';
import AuthCtaButton from '@/components/auth/AuthCtaButton';
import StaggeredListItem from '@/components/ui/StaggeredListItem';
import { onVideo } from '@/components/auth/onVideoColors';
import { forgotPassword } from '@/services/auth.service';
import { sanitizeEmailInput, validateEmail } from '@/utils/authValidation';
import { radius, fonts } from '@/constants/theme';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    const emailError = validateEmail(email);
    if (emailError) {
      Alert.alert('Invalid email', emailError);
      return;
    }

    setLoading(true);
    try {
      const res = await forgotPassword({ email: sanitizeEmailInput(email) });

      if (!res.success) {
        Alert.alert('Reset failed', res.error ?? 'Try again');
        return;
      }

      if (__DEV__ && res.data?.resetToken) {
        router.replace(`/(auth)/reset-password?token=${res.data.resetToken}` as never);
        return;
      }

      Alert.alert(
        'Check your email',
        'If an account exists for this email, you will receive reset instructions shortly.',
      );
      router.back();
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
    <AuthFormShell onBack={() => router.back()}>
      <StaggeredListItem index={0}>
        <Text style={s.title}>Reset password</Text>
        <Text style={s.subtitle}>
          Enter your email address and we&apos;ll help you set a new password.
        </Text>
      </StaggeredListItem>

      <StaggeredListItem index={1}>
        <Text style={s.sectionLabel}>Email</Text>
        <TextInput
          style={s.input}
          placeholder="Email address"
          placeholderTextColor={onVideo.textFaint}
          value={email}
          onChangeText={(text) => setEmail(sanitizeEmailInput(text))}
          autoCapitalize="none"
          keyboardType="email-address"
          maxLength={254}
          editable={!loading}
          accessibilityLabel="Email input"
        />
      </StaggeredListItem>

      <StaggeredListItem index={2}>
        <AuthCtaButton label="Send reset link" onPress={() => void onSubmit()} loading={loading} />
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
  input: {
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 15,
    fontFamily: fonts.body,
    marginBottom: 20,
    borderWidth: 1,
    // on-video glass input: always light over dark video
    color: onVideo.text,
    borderColor: onVideo.inputBorder,
    backgroundColor: onVideo.inputBg,
  },
});
