import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import AuthFormShell from '@/components/auth/AuthFormShell';
import { login } from '@/services/auth.service';
import { useAuthStore } from '@/stores/authStore';
import { radius, fonts } from '@/constants/theme';
import { API_URL } from '@/constants/config';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((state) => state.setAuth);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing fields', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      const result = await login({ email: email.trim(), password });
      if (result.success) {
        await setAuth(result.data.user, result.data.accessToken, result.data.refreshToken);
        router.replace('/(tabs)');
      } else {
        Alert.alert('Login failed', result.error ?? 'Invalid credentials.');
      }
    } catch (err) {
      Alert.alert(
        'Connection error',
        `${err instanceof Error ? err.message : 'Could not reach the server.'}\n\nAPI: ${API_URL}`,
      );
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = [s.input, { borderColor: 'rgba(255,255,255,0.15)', color: '#FFFFFF' }];

  return (
    <AuthFormShell>
      <TouchableOpacity onPress={() => router.back()} style={s.back} accessibilityRole="button">
        <Text style={s.backText}>← Back</Text>
      </TouchableOpacity>

      <Text style={s.title}>Welcome back</Text>
      <Text style={s.subtitle}>Sign in with your email and password</Text>

      <TextInput
        style={inputStyle}
        placeholder="Email"
        placeholderTextColor="rgba(255,255,255,0.45)"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        editable={!loading}
        accessibilityLabel="Email input"
      />

      <TextInput
        style={[...inputStyle, s.inputLast]}
        placeholder="Password"
        placeholderTextColor="rgba(255,255,255,0.45)"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        editable={!loading}
        onSubmitEditing={() => void handleLogin()}
        returnKeyType="go"
        accessibilityLabel="Password input"
      />

      <Link href="/(auth)/forgot-password" asChild>
        <TouchableOpacity style={s.forgotRow} accessibilityRole="link">
          <Text style={s.forgotText}>Forgot password?</Text>
        </TouchableOpacity>
      </Link>

      <TouchableOpacity
        style={[s.btn, loading && s.btnDisabled]}
        onPress={() => void handleLogin()}
        disabled={loading}
        activeOpacity={0.8}
        accessibilityRole="button"
      >
        {loading ? <ActivityIndicator color="#001A14" /> : <Text style={s.btnText}>LOG IN</Text>}
      </TouchableOpacity>

      <View style={s.switchRow}>
        <Text style={s.switchLabel}>New here? </Text>
        <Link href="/(auth)/signup-type" asChild>
          <TouchableOpacity accessibilityRole="link">
            <Text style={s.switchAction}>Create account</Text>
          </TouchableOpacity>
        </Link>
      </View>
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
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 15,
    fontFamily: fonts.body,
    marginBottom: 12,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  inputLast: { marginBottom: 14 },
  forgotRow: { alignSelf: 'flex-end', marginBottom: 24 },
  forgotText: { fontFamily: fonts.bodyStrong, fontSize: 13, color: '#A882FF' },
  btn: {
    borderRadius: radius.md,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    backgroundColor: '#00E5C3',
  },
  btnDisabled: { opacity: 0.65 },
  btnText: { fontFamily: fonts.h2, fontSize: 15, color: '#001A14', letterSpacing: 1 },
  switchRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  switchLabel: { fontFamily: fonts.body, fontSize: 14, color: 'rgba(255,255,255,0.65)' },
  switchAction: { fontFamily: fonts.bodyStrong, fontSize: 14, color: '#00E5C3' },
});
