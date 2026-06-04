import { View, Text } from 'react-native';
import { Trophy } from 'lucide-react-native';
import { colors, fonts } from '@/constants/theme';

export default function LeaderboardScreen() {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.bgPrimary,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
      }}
    >
      <Trophy size={40} strokeWidth={1.5} color={colors.gold} />
      <Text
        style={{
          fontFamily: fonts.h1,
          fontSize: 18,
          color: colors.textPrimary,
          marginTop: 16,
          textTransform: 'uppercase',
          letterSpacing: -0.5,
        }}
      >
        LEADERBOARD
      </Text>
      <Text
        style={{
          fontFamily: fonts.body,
          fontSize: 14,
          color: colors.textSecondary,
          marginTop: 8,
          textAlign: 'center',
          lineHeight: 22,
        }}
      >
        Leaderboards are coming in a future update — keep joining events and posting in the
        meantime.
      </Text>
    </View>
  );
}
