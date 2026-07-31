import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import AuthFormShell from '@/components/auth/AuthFormShell';
import AuthCtaButton from '@/components/auth/AuthCtaButton';
import PasswordInput from '@/components/auth/PasswordInput';
import StaggeredListItem from '@/components/ui/StaggeredListItem';
import { onVideo } from '@/components/auth/onVideoColors';
import { login } from '@/services/auth.service';
import { useAuthStore } from '@/stores/authStore';
import { radius, fonts } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { sanitizeEmailInput, validateEmail } from '@/utils/authValidation';

export default function LoginScreen() {
  const { theme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);

  const handleLogin = async () => {
    const emailError = validateEmail(email);
    if (emailError) {
      Alert.alert('Invalid email', emailError);
      return;
    }
    if (!password.trim()) {
      Alert.alert('Missing password', 'Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      const result = await login({
        email: sanitizeEmailInput(email),
        password,
      });

      if (result.success) {
        if (result.data.needsEmailVerification) {
          router.replace({
            pathname: '/(auth)/verify-email',
            params: {
              email: result.data.email,
              maskedEmail: result.data.maskedEmail,
            },
          });
          return;
        }
        await setAuth(result.data.user, result.data.accessToken, result.data.refreshToken);
        router.replace('/(tabs)');
        return;
      }

      Alert.alert('Login failed', result.error ?? 'Invalid credentials.');
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
        <Text style={s.title}>Welcome back</Text>
        <Text style={s.subtitle}>Sign in with your email and password.</Text>
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
          editable={!loading}
          maxLength={254}
          accessibilityLabel="Email input"
        />
      </StaggeredListItem>

      <StaggeredListItem index={2}>
        <View style={s.labelRow}>
          <Text style={[s.sectionLabel, s.labelInRow]}>Password</Text>
          <Link href="/(auth)/forgot-password" asChild>
            <TouchableOpacity accessibilityRole="link" hitSlop={8}>
              <Text style={[s.forgotText, { color: theme.tealPrimary }]}>Forgot password?</Text>
            </TouchableOpacity>
          </Link>
        </View>
        <PasswordInput
          containerStyle={s.passwordField}
          inputStyle={s.passwordInput}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          editable={!loading}
          onSubmitEditing={() => void handleLogin()}
          returnKeyType="go"
          accessibilityLabel="Password input"
        />
      </StaggeredListItem>

      <StaggeredListItem index={3}>
        <AuthCtaButton
          label="Log in"
          onPress={() => void handleLogin()}
          loading={loading}
          style={s.cta}
        />
      </StaggeredListItem>

      <StaggeredListItem index={4}>
        <View style={s.switchRow}>
          <Text style={s.switchLabel}>New here? </Text>
          <Link href="/(auth)/signup-type" asChild>
            <TouchableOpacity accessibilityRole="link">
              <Text style={[s.switchAction, { color: theme.tealPrimary }]}>Create account</Text>
            </TouchableOpacity>
          </Link>
        </View>
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
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  labelInRow: { marginBottom: 0 },
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
  passwordField: { marginBottom: 24 },
  passwordInput: { paddingVertical: 16 },
  forgotText: { fontFamily: fonts.semibold, fontSize: 13 },
  cta: { marginBottom: 20 },
  switchRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  switchLabel: { fontFamily: fonts.body, fontSize: 14, color: 'rgba(255,255,255,0.65)' },
  switchAction: { fontFamily: fonts.bodyStrong, fontSize: 14 },
});
