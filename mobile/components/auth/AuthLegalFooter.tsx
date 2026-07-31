import { Text, StyleSheet, Linking } from 'react-native';
import { fonts } from '@/constants/theme';
import { TERMS_URL, PRIVACY_URL } from '@/constants/auth';
import { onVideo } from '@/components/auth/onVideoColors';

export default function AuthLegalFooter() {
  return (
    <Text style={s.text}>
      By tapping on &apos;Create Account&apos; or &apos;Log In&apos; you agree to our{' '}
      <Text style={s.link} onPress={() => void Linking.openURL(TERMS_URL)} accessibilityRole="link">
        Terms and Conditions
      </Text>{' '}
      and{' '}
      <Text
        style={s.link}
        onPress={() => void Linking.openURL(PRIVACY_URL)}
        accessibilityRole="link"
      >
        Privacy Policy
      </Text>
    </Text>
  );
}

const s = StyleSheet.create({
  text: {
    fontFamily: fonts.caption,
    fontSize: 12,
    lineHeight: 18,
    // on-video text: always light over dark video
    color: onVideo.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  link: {
    textDecorationLine: 'underline',
    color: onVideo.text,
  },
});
