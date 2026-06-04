import { Text, StyleSheet } from 'react-native';
import { colors, fonts } from '@/constants/theme';

/**
 * Mumbai Fitness Mafia — header wordmark
 * Outfit, all caps: MUMBAI + MAFIA (purple), FITNESS (teal).
 */
export default function MFMLogo() {
  return (
    <Text
      style={s.wordmark}
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.82}
      accessibilityRole="header"
      accessibilityLabel="Mumbai Fitness Mafia"
    >
      <Text style={s.purple}>MUMBAI </Text>
      <Text style={s.teal}>FITNESS </Text>
      <Text style={s.purple}>MAFIA</Text>
    </Text>
  );
}

const s = StyleSheet.create({
  wordmark: {
    fontFamily: fonts.button,
    fontSize: 11,
    lineHeight: 13,
    letterSpacing: 1.75,
    textAlign: 'center',
    includeFontPadding: false,
  },
  purple: {
    color: colors.purpleHero,
  },
  teal: {
    color: colors.tealPrimary,
  },
});
