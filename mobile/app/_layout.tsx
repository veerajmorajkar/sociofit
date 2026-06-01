import '../global.css';
import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { colors } from '@/constants/theme';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60 * 5, retry: 2 },
  },
});

function AppContent() {
  const isLoading = useAuthStore((state) => state.isLoading);
  const loadStoredAuth = useAuthStore((state) => state.loadStoredAuth);

  const [fontsLoaded] = useFonts({
    'SpaceGrotesk-Regular': SpaceGrotesk_400Regular,
    'SpaceGrotesk-Medium': SpaceGrotesk_500Medium,
    'SpaceGrotesk-Bold': SpaceGrotesk_700Bold,
    'DMSans-Regular': DMSans_400Regular,
    'DMSans-Medium': DMSans_500Medium,
    'DMSans-Bold': DMSans_700Bold,
  });

  useEffect(() => {
    const init = async () => {
      await loadStoredAuth();
      if (fontsLoaded) {
        await SplashScreen.hideAsync();
      }
    };
    void init();
  }, [loadStoredAuth, fontsLoaded]);

  if (isLoading || !fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.lime} />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="messages" options={{ headerShown: true, title: 'MESSAGES', headerStyle: { backgroundColor: colors.surface }, headerTintColor: colors.text1, headerTitleStyle: { fontFamily: 'SpaceGrotesk-Bold' } }} />
      <Stack.Screen name="event/[id]" options={{ headerShown: true, title: 'EVENT', headerStyle: { backgroundColor: colors.surface }, headerTintColor: colors.text1 }} />
      <Stack.Screen name="profile/[id]" options={{ headerShown: true, title: 'PROFILE', headerStyle: { backgroundColor: colors.surface }, headerTintColor: colors.text1 }} />
      <Stack.Screen name="chat/[id]" options={{ headerShown: true, title: 'CHAT', headerStyle: { backgroundColor: colors.surface }, headerTintColor: colors.text1 }} />
      <Stack.Screen name="post/create" options={{ presentation: 'modal', headerShown: true, title: 'NEW POST', headerStyle: { backgroundColor: colors.surface }, headerTintColor: colors.text1 }} />
      <Stack.Screen name="notifications" options={{ headerShown: true, title: 'NOTIFICATIONS', headerStyle: { backgroundColor: colors.surface }, headerTintColor: colors.text1 }} />
      <Stack.Screen name="leaderboard" options={{ headerShown: true, title: 'LEADERBOARD', headerStyle: { backgroundColor: colors.surface }, headerTintColor: colors.text1 }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="light" />
      <AppContent />
    </QueryClientProvider>
  );
}
