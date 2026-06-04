import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { forgotPassword } from '@/services/auth.service';
import { colors, radius, fonts, shadows } from '@/constants/theme';

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

      // Dev convenience: backend returns token in non-production.
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

  const inputStyle = {
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.textPrimary,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.surface3,
  } as const;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ flex: 1, paddingHorizontal: 16, justifyContent: 'center' }}>
          <Text
            style={{
              fontFamily: fonts.heading,
              fontSize: 26,
              color: colors.cream,
              textTransform: 'uppercase',
              letterSpacing: -1,
              marginBottom: 8,
            }}
          >
            RESET PASSWORD
          </Text>
          <Text
            style={{ fontFamily: fonts.body, fontSize: 14, color: colors.text3, marginBottom: 24 }}
          >
            Enter your email and we’ll help you get back in.
          </Text>

          <TextInput
            style={inputStyle}
            placeholder="EMAIL"
            placeholderTextColor={colors.textMuted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!loading}
          />

          <Pressable
            style={({ pressed }) => ({
              backgroundColor: pressed ? colors.limeDark : colors.lime,
              borderRadius: radius.card,
              paddingVertical: 16,
              alignItems: 'center',
              transform: [{ scale: pressed ? 0.97 : 1 }],
              opacity: loading ? 0.7 : 1,
              ...shadows.lime,
            })}
            onPress={() => void onSubmit()}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.textInverse} />
            ) : (
              <Text
                style={{
                  fontFamily: fonts.heading,
                  fontSize: 14,
                  color: colors.textInverse,
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                }}
              >
                SEND RESET LINK
              </Text>
            )}
          </Pressable>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
