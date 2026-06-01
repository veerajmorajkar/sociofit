import { View, Text, TextInput, Pressable, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { register } from '@/services/auth.service';
import { useAuthStore } from '@/stores/authStore';
import { colors, radius, fonts, shadows } from '@/constants/theme';

type AccountType = 'personal' | 'club';

export default function SignupScreen() {
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('personal');
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((state) => state.setAuth);

  const handleSignup = async () => {
    if (!displayName.trim() || !username.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Missing fields', 'Please fill in all fields.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Weak password', 'Min 8 chars, 1 uppercase, 1 number.');
      return;
    }
    setLoading(true);
    try {
      const result = await register({ email: email.trim(), password, accountType, displayName: displayName.trim(), username: username.trim().toLowerCase() });
      if (result.success) {
        await setAuth(result.data.user, result.data.accessToken, result.data.refreshToken);
        router.replace('/(tabs)');
      } else {
        Alert.alert('Signup failed', result.error ?? 'Could not create account.');
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
    shadowColor: '#000',
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
  } as const;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 40 }} keyboardShouldPersistTaps="handled">
          <Text style={{ fontFamily: fonts.heading, fontSize: 28, color: colors.cream, textTransform: 'uppercase', letterSpacing: -1, marginBottom: 8 }}>
            CREATE ACCOUNT
          </Text>
          <Text style={{ fontFamily: fonts.body, fontSize: 14, color: colors.text3, marginBottom: 32 }}>
            Join the FitSocial community
          </Text>

          {/* Account type */}
          <Text style={{ fontFamily: fonts.bodyBold, fontSize: 10, color: colors.text4, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>
            ACCOUNT TYPE
          </Text>
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
            {(['personal', 'club'] as const).map((type) => (
              <Pressable
                key={type}
                style={{
                  flex: 1,
                  paddingVertical: 16,
                  borderRadius: radius.card,
                  backgroundColor: accountType === type ? colors.surface2 : colors.surface,
                  alignItems: 'center',
                  borderWidth: accountType === type ? 1.5 : 0,
                  borderColor: type === 'personal' ? colors.lime : colors.sage,
                  ...shadows.out,
                }}
                onPress={() => setAccountType(type)}
                accessibilityRole="radio"
                accessibilityState={{ selected: accountType === type }}
              >
                <Text style={{ fontSize: 20, marginBottom: 6 }}>{type === 'personal' ? '🏃' : '🏢'}</Text>
                <Text style={{
                  fontFamily: fonts.heading,
                  fontSize: 12,
                  color: accountType === type ? (type === 'personal' ? colors.lime : colors.sage) : colors.text3,
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                }}>
                  {type.toUpperCase()}
                </Text>
              </Pressable>
            ))}
          </View>

          <TextInput style={inputStyle} placeholder={accountType === 'club' ? 'CLUB NAME' : 'DISPLAY NAME'} placeholderTextColor={colors.text4} value={displayName} onChangeText={setDisplayName} editable={!loading} accessibilityLabel="Display name" />
          <TextInput style={inputStyle} placeholder="USERNAME" placeholderTextColor={colors.text4} value={username} onChangeText={setUsername} autoCapitalize="none" editable={!loading} accessibilityLabel="Username" />
          <TextInput style={inputStyle} placeholder="EMAIL" placeholderTextColor={colors.text4} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" editable={!loading} accessibilityLabel="Email" />
          <TextInput style={{ ...inputStyle, marginBottom: 24 }} placeholder="PASSWORD" placeholderTextColor={colors.text4} value={password} onChangeText={setPassword} secureTextEntry editable={!loading} onSubmitEditing={() => void handleSignup()} returnKeyType="go" accessibilityLabel="Password" />

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
            onPress={() => void handleSignup()}
            disabled={loading}
            accessibilityRole="button"
          >
            {loading ? (
              <ActivityIndicator color={colors.textInverse} />
            ) : (
              <Text style={{ fontFamily: fonts.heading, fontSize: 14, color: colors.textInverse, textTransform: 'uppercase', letterSpacing: 1 }}>
                CREATE ACCOUNT
              </Text>
            )}
          </Pressable>

          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 4 }}>
            <Text style={{ fontFamily: fonts.body, fontSize: 14, color: colors.text3 }}>Already have an account?</Text>
            <Link href="/(auth)/login" asChild>
              <Pressable accessibilityRole="link">
                <Text style={{ fontFamily: fonts.bodyBold, fontSize: 14, color: colors.lime }}>SIGN IN</Text>
              </Pressable>
            </Link>
          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
