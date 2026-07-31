import { StyleSheet, Text, View } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import AuthPillButton from '@/components/auth/AuthPillButton';
import { isGoogleOAuthConfigured } from '@/constants/auth';
import { useGoogleSocialAuth, useSocialAuth } from '@/hooks/useSocialAuth';

type AccountType = 'personal' | 'club';
type AuthMode = 'login' | 'signup';

interface Props {
  mode: AuthMode;
  accountType?: AccountType;
  onContactPress: () => void;
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

interface ViewProps extends Props {
  signInWithGoogle: () => void;
  signInWithApple: () => void;
  loading: 'google' | 'apple' | null;
  googleReady: boolean;
  appleReady: boolean;
}

function SocialAuthButtonsView({
  mode,
  onContactPress,
  signInWithGoogle,
  signInWithApple,
  loading,
  googleReady,
  appleReady,
}: ViewProps) {
  const appleLabel = mode === 'signup' ? 'Sign up with Apple' : 'Log in with Apple';
  const googleLabel = mode === 'signup' ? 'Sign up with Google' : 'Log in with Google';
  const contactLabel = mode === 'signup' ? 'Sign up with email' : 'Log in with email';

  return (
    <View style={s.stack}>
      {appleReady && (
        <AuthPillButton
          label={appleLabel}
          variant="apple"
          icon={<AppleIcon />}
          onPress={() => void signInWithApple()}
          loading={loading === 'apple'}
          disabled={loading !== null && loading !== 'apple'}
        />
      )}

      <AuthPillButton
        label={googleLabel}
        variant="purple"
        icon={<GoogleIcon />}
        onPress={() => void signInWithGoogle()}
        loading={loading === 'google'}
        disabled={!googleReady || (loading !== null && loading !== 'google')}
      />

      <AuthPillButton
        label={contactLabel}
        variant="white"
        onPress={onContactPress}
        disabled={loading !== null}
      />
    </View>
  );
}

function SocialAuthButtonsWithGoogle(props: Props) {
  const auth = useGoogleSocialAuth({ mode: props.mode, accountType: props.accountType });
  return <SocialAuthButtonsView {...props} {...auth} />;
}

function SocialAuthButtonsWithoutGoogle(props: Props) {
  const auth = useSocialAuth({ mode: props.mode, accountType: props.accountType });
  return <SocialAuthButtonsView {...props} {...auth} />;
}

export default function SocialAuthButtons(props: Props) {
  if (isGoogleOAuthConfigured()) {
    return <SocialAuthButtonsWithGoogle {...props} />;
  }
  return <SocialAuthButtonsWithoutGoogle {...props} />;
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
