import { View, Text, TextInput, Pressable, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { login } from '@/services/auth.service';
import { useAuthStore } from '@/stores/authStore';
import { colors, radius, fonts, shadows } from '@/constants/theme';

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
    } catch {
      Alert.alert('Connection error', 'Could not reach the server.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.text1,
    marginBottom: 12,
    // Carved neumorphic
    shadowColor: '#000',
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
  } as const;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ flex: 1, paddingHorizontal: 16, justifyContent: 'center' }}>
          <Text style={{ fontFamily: fonts.heading, fontSize: 28, color: colors.cream, textTransform: 'uppercase', letterSpacing: -1, marginBottom: 8 }}>
            WELCOME BACK
          </Text>
          <Text style={{ fontFamily: fonts.body, fontSize: 14, color: colors.text3, marginBottom: 32 }}>
            Sign in to your FitSocial account
          </Text>

          <TextInput
            style={inputStyle}
            placeholder="EMAIL"
            placeholderTextColor={colors.text4}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!loading}
            accessibilityLabel="Email input"
          />

          <TextInput
            style={{ ...inputStyle, marginBottom: 24 }}
            placeholder="PASSWORD"
            placeholderTextColor={colors.text4}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!loading}
            onSubmitEditing={() => void handleLogin()}
            returnKeyType="go"
            accessibilityLabel="Password input"
          />

          <Pressable
            style={({ pressed }) => ({
              backgroundColor: pressed ? colors.limeDark : colors.lime,
              borderRadius: radius.card,
              paddingVertical: 16,
              alignItems: 'center',
              marginBottom: 16,
              transform: [{ scale: pressed ? 0.97 : 1 }],
              opacity: loading ? 0.7 : 1,
              ...shadows.lime,
            })}
            onPress={() => void handleLogin()}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel="Sign in"
          >
            {loading ? (
              <ActivityIndicator color={colors.textInverse} />
            ) : (
              <Text style={{ fontFamily: fonts.heading, fontSize: 14, color: colors.textInverse, textTransform: 'uppercase', letterSpacing: 1 }}>
                SIGN IN
              </Text>
            )}
          </Pressable>

          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 4 }}>
            <Text style={{ fontFamily: fonts.body, fontSize: 14, color: colors.text3 }}>
              Don&apos;t have an account?
            </Text>
            <Link href="/(auth)/signup" asChild>
              <Pressable accessibilityRole="link">
                <Text style={{ fontFamily: fonts.bodyBold, fontSize: 14, color: colors.lime }}>
                  SIGN UP
                </Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
