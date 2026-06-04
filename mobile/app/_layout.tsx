import '../global.css';
import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import {
  Outfit_300Light,
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
  Outfit_800ExtraBold,
  Outfit_900Black,
} from '@expo-google-fonts/outfit';
import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
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
    Outfit_300Light,
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
    Outfit_800ExtraBold,
    Outfit_900Black,
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
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
      <View
        style={{
          flex: 1,
          backgroundColor: colors.bg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
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
      <Stack.Screen
        name="messages"
        options={{
          headerShown: true,
          title: 'MESSAGES',
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text1,
          headerTitleStyle: { fontFamily: 'Outfit_700Bold' },
        }}
      />
      <Stack.Screen
        name="event/[id]"
        options={{
          headerShown: true,
          title: 'EVENT',
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text1,
        }}
      />
      <Stack.Screen name="event/create" options={{ headerShown: false }} />
      <Stack.Screen name="profile/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="profile/edit" options={{ headerShown: false }} />
      <Stack.Screen
        name="profile/connections"
        options={{
          headerShown: true,
          title: 'CONNECTIONS',
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text1,
        }}
      />
      <Stack.Screen
        name="chat/[id]"
        options={{
          headerShown: true,
          title: 'CHAT',
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text1,
        }}
      />
      <Stack.Screen name="post/create" options={{ presentation: 'modal', headerShown: false }} />
      <Stack.Screen name="notifications" options={{ headerShown: false }} />
      <Stack.Screen
        name="leaderboard"
        options={{
          headerShown: true,
          title: 'LEADERBOARD',
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text1,
        }}
      />
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
