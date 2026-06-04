import { Text, View, StyleSheet } from 'react-native';
import { colors, fonts } from '@/constants/theme';

/**
 * Mumbai Fitness Mafia — header wordmark
 * Space Grotesk, all caps: MUMBAI + MAFIA (purple), FITNESS (teal).
 */
export default function MFMLogo() {
  return (
    <View style={s.wrap}>
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
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
    paddingHorizontal: 6,
  },
  wordmark: {
    fontFamily: fonts.label,
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
