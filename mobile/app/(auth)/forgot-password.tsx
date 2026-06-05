import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import AuthFormShell from '@/components/auth/AuthFormShell';
import { forgotPassword } from '@/services/auth.service';
import { radius, fonts } from '@/constants/theme';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    if (!email.trim()) {
      Alert.alert('Missing email', 'Enter your email to reset your password.');
      return;
    }
    setLoading(true);
    try {
      const res = await forgotPassword(email.trim());
      if (!res.success) {
        Alert.alert('Reset failed', res.error ?? 'Try again');
        return;
      }
      const token = res.data?.token;
      if (token) {
        router.push(`/(auth)/reset-password?token=${token}` as never);
        return;
      }
      Alert.alert('Check your email', 'If the account exists, a reset link has been sent.');
      router.back();
    } catch (err) {
      Alert.alert('Connection error', err instanceof Error ? err.message : 'Try again');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthFormShell>
      <TouchableOpacity onPress={() => router.back()} style={s.back}>
        <Text style={s.backText}>← Back</Text>
      </TouchableOpacity>

      <Text style={s.title}>Reset password</Text>
      <Text style={s.subtitle}>Enter your email and we&apos;ll help you get back in.</Text>

      <TextInput
        style={s.input}
        placeholder="Email"
        placeholderTextColor="rgba(255,255,255,0.45)"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        editable={!loading}
      />

      <TouchableOpacity
        style={[s.btn, loading && s.btnDisabled]}
        onPress={() => void onSubmit()}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#001A14" />
        ) : (
          <Text style={s.btnText}>SEND RESET LINK</Text>
        )}
      </TouchableOpacity>
    </AuthFormShell>
  );
}

const s = StyleSheet.create({
  back: { marginBottom: 16 },
  backText: { fontFamily: fonts.bodyStrong, fontSize: 15, color: '#A882FF' },
  title: { fontFamily: fonts.h1, fontSize: 28, color: '#FFFFFF', marginBottom: 8 },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: 'rgba(255,255,255,0.72)',
    marginBottom: 28,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 15,
    fontFamily: fonts.body,
    color: '#FFFFFF',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  btn: {
    backgroundColor: '#00E5C3',
    borderRadius: radius.md,
    paddingVertical: 16,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.7 },
  btnText: { fontFamily: fonts.button, fontSize: 14, color: '#001A14', letterSpacing: 1 },
});
