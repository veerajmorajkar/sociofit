import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { login } from '@/services/auth.service';
import { useAuthStore } from '@/stores/authStore';
import { colors, radius, fonts } from '@/constants/theme';
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

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={s.title}>WELCOME BACK</Text>
          <Text style={s.subtitle}>Sign in to Mumbai Fitness Mafia</Text>

          <TextInput
            style={s.input}
            placeholder="EMAIL"
            placeholderTextColor={colors.textMuted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!loading}
            accessibilityLabel="Email input"
          />

          <TextInput
            style={[s.input, s.inputLast]}
            placeholder="PASSWORD"
            placeholderTextColor={colors.textMuted}
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
            accessibilityLabel="Sign in"
          >
            {loading ? (
              <ActivityIndicator color={colors.onTeal} />
            ) : (
              <Text style={s.btnText}>SIGN IN</Text>
            )}
          </TouchableOpacity>

          <View style={s.switchRow}>
            <Text style={s.switchLabel}>Don't have an account? </Text>
            <Link href="/(auth)/signup" asChild>
              <TouchableOpacity accessibilityRole="link">
                <Text style={s.switchAction}>SIGN UP</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  title: {
    fontFamily: fonts.h1,
    fontSize: 32,
    color: colors.textPrimary,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.textMuted,
    marginBottom: 36,
  },
  input: {
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 15,
    fontFamily: fonts.body,
    color: colors.textPrimary,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.surface3,
  },
  inputLast: {
    marginBottom: 14,
  },
  forgotRow: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotText: {
    fontFamily: fonts.bodyStrong,
    fontSize: 13,
    color: colors.purpleSoft,
  },
  btn: {
    backgroundColor: colors.tealPrimary,
    borderRadius: radius.md,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  btnDisabled: {
    opacity: 0.65,
  },
  btnText: {
    fontFamily: fonts.h2,
    fontSize: 15,
    color: colors.onTeal,
    letterSpacing: 1,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  switchLabel: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textMuted,
  },
  switchAction: {
    fontFamily: fonts.bodyStrong,
    fontSize: 14,
    color: colors.tealPrimary,
  },
});
