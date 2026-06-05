import { StyleSheet, Text, View } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import AuthPillButton from '@/components/auth/AuthPillButton';
import { useSocialAuth } from '@/hooks/useSocialAuth';

type AccountType = 'personal' | 'club';
type AuthMode = 'login' | 'signup';

interface Props {
  mode: AuthMode;
  accountType?: AccountType;
  onPhonePress: () => void;
}

function GoogleIcon() {
  return (
    <View style={s.googleBadge}>
      <Text style={s.googleG}>G</Text>
    </View>
  );
}

function AppleIcon() {
  return <AntDesign name="apple" size={20} color="#0E0E14" />;
}

export default function SocialAuthButtons({ mode, accountType, onPhonePress }: Props) {
  const { signInWithGoogle, signInWithApple, loading, googleReady, appleReady } = useSocialAuth({
    mode,
    accountType,
  });

  return (
    <View style={s.stack}>
      {appleReady && (
        <AuthPillButton
          label="Log in with Apple"
          variant="apple"
          icon={<AppleIcon />}
          onPress={() => void signInWithApple()}
          loading={loading === 'apple'}
          disabled={loading !== null && loading !== 'apple'}
        />
      )}

      <AuthPillButton
        label="Log in with Google"
        variant="purple"
        icon={<GoogleIcon />}
        onPress={() => void signInWithGoogle()}
        loading={loading === 'google'}
        disabled={!googleReady || (loading !== null && loading !== 'google')}
      />

      <AuthPillButton
        label={mode === 'signup' ? 'Sign up with email' : 'Log in with email'}
        variant="white"
        onPress={onPhonePress}
        disabled={loading !== null}
      />
    </View>
  );
}

const s = StyleSheet.create({
  stack: { gap: 12, width: '100%' },
  googleBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleG: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4285F4',
  },
});
