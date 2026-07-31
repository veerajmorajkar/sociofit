import { StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AuthVideoBackdrop from '@/components/auth/AuthVideoBackdrop';
import AuthBackButton from '@/components/auth/AuthBackButton';
import AuthHeroBrand from '@/components/auth/AuthHeroBrand';
import AuthLegalFooter from '@/components/auth/AuthLegalFooter';
import SocialAuthButtons from '@/components/auth/SocialAuthButtons';
import { accountTypeSignupLabel } from '@/constants/accountType';
import { fonts } from '@/constants/theme';
import { onVideo } from '@/components/auth/onVideoColors';

type AccountType = 'personal' | 'club';
type AuthMode = 'login' | 'signup';

export default function LoginOptionsScreen() {
  const params = useLocalSearchParams<{ mode?: string; accountType?: string }>();
  const mode: AuthMode = params.mode === 'signup' ? 'signup' : 'login';
  const accountType = (params.accountType === 'club' ? 'club' : 'personal') as AccountType;

  const goContact = () => {
    if (mode === 'signup') {
      const pathname = accountType === 'club' ? '/(auth)/signup-club' : '/(auth)/signup-athlete';
      router.push(pathname);
    } else {
      router.push('/(auth)/login');
    }
  };

  return (
    <AuthVideoBackdrop>
      <StatusBar style="light" />
      <SafeAreaView style={s.safe}>
        <AuthBackButton style={s.back} />

        <View style={s.top}>
          <AuthHeroBrand />
          {mode === 'signup' && (
            <Text style={s.subtitle}>Joining as {accountTypeSignupLabel(accountType)}</Text>
          )}
        </View>

        <View style={s.bottom}>
          <AuthLegalFooter />
          <View style={s.buttons}>
            <SocialAuthButtons mode={mode} accountType={accountType} onContactPress={goContact} />
          </View>
        </View>
      </SafeAreaView>
    </AuthVideoBackdrop>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, justifyContent: 'space-between' },
  back: { marginLeft: 20, marginTop: 4 },
  top: { flex: 1, justifyContent: 'center', paddingHorizontal: 24, gap: 12 },
  subtitle: {
    fontFamily: fonts.caption,
    fontSize: 14,
    // on-video text: always light over dark video
    color: onVideo.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  bottom: {
    paddingHorizontal: 28,
    paddingBottom: 16,
    gap: 16,
    alignItems: 'center',
  },
  buttons: { width: '100%', marginTop: 4 },
});
