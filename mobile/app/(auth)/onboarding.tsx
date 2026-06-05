import { View, Text, Pressable } from 'react-native';
import { router } from 'expo-router';
import { fonts, radius } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';

export default function OnboardingScreen() {
  const { theme } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.bgPrimary,
        paddingHorizontal: 24,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Text
        style={{
          fontFamily: fonts.h1,
          fontSize: 38,
          color: theme.textPrimary,
          textTransform: 'uppercase',
          letterSpacing: -1,
          textAlign: 'center',
        }}
      >
        SocioFit<Text style={{ color: theme.tealPrimary }}>.</Text>
      </Text>
      <Text
        style={{
          fontFamily: fonts.body,
          fontSize: 16,
          color: theme.textSecondary,
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
          backgroundColor: pressed ? theme.tealDark : theme.tealPrimary,
          borderRadius: radius.md,
          paddingVertical: 16,
          paddingHorizontal: 48,
          marginBottom: 16,
          ...theme.shadows.teal,
        })}
        onPress={() => router.push('/(auth)/signup-type')}
        accessibilityRole="button"
        accessibilityLabel="Get started"
      >
        <Text
          style={{
            fontFamily: fonts.button,
            fontSize: 15,
            color: theme.onTeal,
            textTransform: 'uppercase',
            letterSpacing: 1,
          }}
        >
          Get Started
        </Text>
      </Pressable>

      <Pressable
        onPress={() => router.push('/(auth)/login-options')}
        accessibilityRole="button"
        accessibilityLabel="I already have an account"
      >
        <Text style={{ fontFamily: fonts.bodyStrong, fontSize: 14, color: theme.purpleSoft }}>
          I already have an account
        </Text>
      </Pressable>
    </View>
  );
}
