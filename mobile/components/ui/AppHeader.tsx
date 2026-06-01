import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bell, MessageCircle } from 'lucide-react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts } from '@/constants/theme';

interface AppHeaderProps {
  title?: string;
  showActions?: boolean;
}

const ICON_BOX = 46;

export default function AppHeader({
  title = 'FITSOCIAL',
  showActions = true,
}: AppHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View>
      <LinearGradient
        colors={['#060606', '#0A0A0A', colors.bg, colors.bg]}
        locations={[0, 0.35, 0.75, 1]}
        style={{ paddingTop: insets.top }}
      >
        <View style={styles.bar}>
          {showActions ? (
            <Pressable
              onPress={() => router.push('/notifications')}
              style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}
              hitSlop={8}
              accessibilityLabel="Notifications"
              accessibilityRole="button"
            >
              <Bell size={22} strokeWidth={1.75} color={colors.text2} />
            </Pressable>
          ) : (
            <View style={{ width: ICON_BOX }} />
          )}

          <Text style={styles.logotype}>{title}</Text>

          {showActions ? (
            <Pressable
              onPress={() => router.push('/messages')}
              style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}
              hitSlop={8}
              accessibilityLabel="Messages"
              accessibilityRole="button"
            >
              <MessageCircle size={22} strokeWidth={1.75} color={colors.text2} />
            </Pressable>
          ) : (
            <View style={{ width: ICON_BOX }} />
          )}
        </View>

        <View style={{ height: 20 }} />
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
  },
  logotype: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.lime,
    textTransform: 'uppercase',
    letterSpacing: 3,
  },
  iconButton: {
    width: ICON_BOX,
    height: ICON_BOX,
    borderRadius: 14,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.04)',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 5, height: 5 },
        shadowOpacity: 0.6,
        shadowRadius: 12,
      },
      android: { elevation: 10 },
    }),
  },
  iconButtonPressed: {
    backgroundColor: colors.surface,
    borderColor: 'rgba(255,255,255,0.02)',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 1, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
      },
      android: { elevation: 1 },
    }),
  },
});
