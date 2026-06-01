import { View, Text, Pressable } from 'react-native';
import { router } from 'expo-router';

export default function OnboardingScreen() {
  return (
    <View className="flex-1 bg-white px-6 justify-center items-center">
      <Text className="text-4xl font-bold text-primary-600 mb-4">FitSocial</Text>
      <Text className="text-lg text-gray-500 text-center mb-12">
        Connect with fitness enthusiasts.{'\n'}Discover events near you.
      </Text>

      <Pressable
        className="bg-primary-600 rounded-xl py-4 px-12 mb-4"
        onPress={() => router.push('/(auth)/signup')}
        accessibilityRole="button"
        accessibilityLabel="Get started"
      >
        <Text className="text-white font-semibold text-base">Get Started</Text>
      </Pressable>

      <Pressable
        onPress={() => router.push('/(auth)/login')}
        accessibilityRole="button"
        accessibilityLabel="I already have an account"
      >
        <Text className="text-primary-600 font-semibold">I already have an account</Text>
      </Pressable>
    </View>
  );
}
