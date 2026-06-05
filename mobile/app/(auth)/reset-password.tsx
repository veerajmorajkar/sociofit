import {
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import AuthFormShell from '@/components/auth/AuthFormShell';
import { resetPassword } from '@/services/auth.service';
import { radius, fonts } from '@/constants/theme';

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
    if (!password.trim() || password.length < 8) {
      Alert.alert('Weak password', 'Min 8 chars, 1 uppercase, 1 number.');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Mismatch', 'Passwords do not match.');
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
    } catch (err) {
      Alert.alert('Connection error', err instanceof Error ? err.message : 'Try again');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = s.input;

  return (
    <AuthFormShell>
      <Text style={s.title}>New password</Text>
      <Text style={s.subtitle}>Choose a strong password for your account.</Text>

      <TextInput
        style={inputStyle}
        placeholder="New password"
        placeholderTextColor="rgba(255,255,255,0.45)"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        editable={!loading}
      />
      <TextInput
        style={inputStyle}
        placeholder="Confirm password"
        placeholderTextColor="rgba(255,255,255,0.45)"
        value={confirm}
        onChangeText={setConfirm}
        secureTextEntry
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
          <Text style={s.btnText}>UPDATE PASSWORD</Text>
        )}
      </TouchableOpacity>
    </AuthFormShell>
  );
}

const s = StyleSheet.create({
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
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  btn: {
    backgroundColor: '#00E5C3',
    borderRadius: radius.md,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.7 },
  btnText: { fontFamily: fonts.button, fontSize: 14, color: '#001A14', letterSpacing: 1 },
});
