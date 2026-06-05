import { View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { colors } from '@/constants/theme';

export default function Index() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgPrimary }}>
      <Redirect href={isAuthenticated ? '/(tabs)' : '/(auth)'} />
    </View>
  );
}
