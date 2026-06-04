import { View, Text, Pressable } from 'react-native';
import { router } from 'expo-router';
import { colors, fonts, radius, shadows } from '@/constants/theme';

export default function OnboardingScreen() {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.bgPrimary,
        paddingHorizontal: 24,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Text
        style={{
          fontFamily: fonts.display,
          fontSize: 38,
          color: colors.textPrimary,
          textTransform: 'uppercase',
          letterSpacing: -1,
          textAlign: 'center',
        }}
      >
        SocioFit<Text style={{ color: colors.tealPrimary }}>.</Text>
      </Text>
      <Text
        style={{
          fontFamily: fonts.body,
          fontSize: 16,
          color: colors.textSecondary,
          textAlign: 'center',
          marginTop: 12,
          marginBottom: 48,
          lineHeight: 24,
        }}
      >
        Connect with fitness enthusiasts.{'\n'}Discover events near you.
      </Text>

      <Pressable
        style={({ pressed }) => ({
          backgroundColor: pressed ? colors.tealDark : colors.tealPrimary,
          borderRadius: radius.md,
          paddingVertical: 16,
          paddingHorizontal: 48,
          marginBottom: 16,
          ...shadows.teal,
        })}
        onPress={() => router.push('/(auth)/signup')}
        accessibilityRole="button"
        accessibilityLabel="Get started"
      >
        <Text
          style={{
            fontFamily: fonts.button,
            fontSize: 15,
            color: colors.onTeal,
            textTransform: 'uppercase',
            letterSpacing: 1,
          }}
        >
          Get Started
        </Text>
      </Pressable>

      <Pressable
        onPress={() => router.push('/(auth)/login')}
        accessibilityRole="button"
        accessibilityLabel="I already have an account"
      >
        <Text style={{ fontFamily: fonts.bodyStrong, fontSize: 14, color: colors.purpleSoft }}>
          I already have an account
        </Text>
      </Pressable>
    </View>
  );
}
