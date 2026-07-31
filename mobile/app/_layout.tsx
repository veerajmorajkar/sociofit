import { useEffect } from 'react';
import { View, ActivityIndicator, AppState } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
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
import { syncPushToken, handleNotificationTap } from '@/services/push.service';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';

SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ fade: false, duration: 0 });

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60 * 5, retry: 2 },
  },
});

function AppContent() {
  const isLoading = useAuthStore((state) => state.isLoading);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const loadStoredAuth = useAuthStore((state) => state.loadStoredAuth);
  const { theme, mode } = useTheme();

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
    void loadStoredAuth();
  }, [loadStoredAuth]);

  useEffect(() => {
    if (!isAuthenticated) return;
    void syncPushToken();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void syncPushToken();
    });
    return () => sub.remove();
  }, [isAuthenticated]);

  useEffect(() => {
    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      handleNotificationTap(response);
    });

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) handleNotificationTap(response);
    });

    return () => responseSub.remove();
  }, []);

  useEffect(() => {
    if (!fontsLoaded || isLoading) return;
    void SplashScreen.hideAsync();
  }, [fontsLoaded, isLoading]);

  if (isLoading || !fontsLoaded) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.bgPrimary,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator size="large" color={theme.tealPrimary} />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.bgPrimary },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" options={{ animation: 'none' }} />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" options={{ animation: 'none' }} />
      <Stack.Screen
        name="messages"
        options={{
          headerShown: true,
          title: 'MESSAGES',
          headerStyle: { backgroundColor: theme.surface },
          headerTintColor: theme.text1,
          headerTitleStyle: { fontFamily: 'Outfit_700Bold' },
        }}
      />
      <Stack.Screen name="event/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="event/create" options={{ headerShown: false }} />
      <Stack.Screen name="profile/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="profile/edit" options={{ headerShown: false }} />
      <Stack.Screen name="profile/connections" options={{ headerShown: false }} />
      <Stack.Screen name="chat/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="messages/create-group" options={{ headerShown: false }} />
      <Stack.Screen name="post/create" options={{ presentation: 'modal', headerShown: false }} />
      <Stack.Screen name="notifications" options={{ headerShown: false }} />
      <Stack.Screen
        name="leaderboard"
        options={{
          headerShown: true,
          title: 'LEADERBOARD',
          headerStyle: { backgroundColor: theme.surface },
          headerTintColor: theme.text1,
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ThemedRoot>
          <StatusBarController />
          <AppContent />
        </ThemedRoot>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

/** Root background follows the active theme instead of hardcoding light. */
function ThemedRoot({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  return <View style={{ flex: 1, backgroundColor: theme.bgPrimary }}>{children}</View>;
}

/** Drives StatusBar style from the active theme mode. */
function StatusBarController() {
  const { mode } = useTheme();
  return <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />;
}
