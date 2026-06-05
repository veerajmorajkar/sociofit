import { View, Text, StyleSheet } from 'react-native';
import { fonts } from '@/constants/theme';
import { AUTH_TAGLINE } from '@/constants/auth';

export default function AuthHeroBrand() {
  return (
    <View style={s.wrap} accessibilityRole="header">
      <Text style={s.tagline}>{AUTH_TAGLINE}</Text>
      <Text style={s.wordmark} accessibilityLabel="Mumbai Fitness Mafia">
        <Text style={s.purple}>MUMBAI </Text>
        <Text style={s.teal}>FITNESS </Text>
        <Text style={s.purple}>MAFIA</Text>
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  tagline: {
    fontFamily: fonts.body,
    fontSize: 17,
    color: 'rgba(255,255,255,0.88)',
    letterSpacing: 0.3,
    marginBottom: 14,
    textAlign: 'center',
  },
  wordmark: {
    fontFamily: fonts.h1,
    fontSize: 28,
    letterSpacing: 2,
    textAlign: 'center',
    lineHeight: 34,
  },
  purple: {
    color: '#FFFFFF',
  },
  teal: {
    color: '#00E5C3',
  },
});
