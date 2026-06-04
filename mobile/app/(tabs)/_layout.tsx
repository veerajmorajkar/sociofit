import { Tabs } from 'expo-router';
import FloatingTabBar from '@/components/ui/FloatingTabBar';
import AuthGuard from '@/components/auth/AuthGuard';

export default function TabLayout() {
  return (
    <AuthGuard>
      <Tabs
        tabBar={(props) => <FloatingTabBar {...props} />}
        screenOptions={{ headerShown: false }}
      >
        <Tabs.Screen name="index" options={{ title: 'Home' }} />
        <Tabs.Screen name="messages" options={{ title: 'Messages' }} />
        <Tabs.Screen name="search" options={{ title: 'Search' }} />
        <Tabs.Screen name="events" options={{ title: 'Events' }} />
        <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
        {/* post tab hidden — create post is now launched from the header + button */}
        <Tabs.Screen name="post" options={{ href: null }} />
      </Tabs>
    </AuthGuard>
  );
}
