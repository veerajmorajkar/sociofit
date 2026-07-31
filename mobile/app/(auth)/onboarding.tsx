import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { fonts, radius } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import MFMLogo from '@/components/ui/MFMLogo';
import { MFM_LOGO_HERO_WIDTH } from '@/constants/branding';

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
      <MFMLogo width={MFM_LOGO_HERO_WIDTH - 24} />
      <Text style={[s.body, { color: theme.textSecondary }]}>
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

const s = StyleSheet.create({
  body: {
    fontFamily: fonts.body,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 48,
    lineHeight: 24,
  },
});
