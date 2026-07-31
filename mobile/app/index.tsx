import { View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/contexts/ThemeContext';

export default function Index() {
  const { theme } = useTheme();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return (
    <View style={{ flex: 1, backgroundColor: theme.bgPrimary }}>
      <Redirect href={isAuthenticated ? '/(tabs)' : '/(auth)'} />
    </View>
  );
}
