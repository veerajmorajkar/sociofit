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
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { resetPassword } from '@/services/auth.service';
import { colors, radius, fonts, shadows } from '@/constants/theme';

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

  const inputStyle = {
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.textPrimary,
    marginBottom: 12,
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
            NEW PASSWORD
          </Text>
          <Text
            style={{ fontFamily: fonts.body, fontSize: 14, color: colors.text3, marginBottom: 24 }}
          >
            Choose a strong password you’ll remember.
          </Text>

          <TextInput
            style={inputStyle}
            placeholder="NEW PASSWORD"
            placeholderTextColor={colors.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!loading}
          />
          <TextInput
            style={{ ...inputStyle, marginBottom: 20 }}
            placeholder="CONFIRM PASSWORD"
            placeholderTextColor={colors.textMuted}
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry
            editable={!loading}
            onSubmitEditing={() => void onSubmit()}
            returnKeyType="go"
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
                UPDATE PASSWORD
              </Text>
            )}
          </Pressable>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
