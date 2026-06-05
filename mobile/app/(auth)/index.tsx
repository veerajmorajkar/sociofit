import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AuthVideoBackdrop from '@/components/auth/AuthVideoBackdrop';
import AuthHeroBrand from '@/components/auth/AuthHeroBrand';
import AuthLegalFooter from '@/components/auth/AuthLegalFooter';
import AuthPillButton from '@/components/auth/AuthPillButton';
import { fonts } from '@/constants/theme';

export default function AuthWelcomeScreen() {
  return (
    <AuthVideoBackdrop>
      <StatusBar style="light" />
      <SafeAreaView style={s.safe}>
        <View style={s.center}>
          <AuthHeroBrand />
        </View>

        <View style={s.bottom}>
          <AuthLegalFooter />
          <AuthPillButton
            label="Create Account"
            variant="white"
            onPress={() => router.push('/(auth)/signup-type')}
            style={s.cta}
          />
          <Text
            style={s.loginLink}
            onPress={() => router.push('/(auth)/login-options')}
            accessibilityRole="link"
          >
            Log in
          </Text>
        </View>
      </SafeAreaView>
    </AuthVideoBackdrop>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, justifyContent: 'space-between' },
  center: { flex: 1, justifyContent: 'center' },
  bottom: {
    paddingHorizontal: 28,
    paddingBottom: 16,
    gap: 16,
    alignItems: 'center',
  },
  cta: { width: '100%', marginTop: 8 },
  loginLink: {
    fontFamily: fonts.h3,
    fontSize: 16,
    color: '#FFFFFF',
    paddingVertical: 8,
  },
});
