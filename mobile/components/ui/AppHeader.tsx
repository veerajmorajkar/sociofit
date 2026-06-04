import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bell, Plus } from 'lucide-react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useNotifications } from '@/hooks/useNotifications';
import { colors, fonts } from '@/constants/theme';
import MFMLogo from './MFMLogo';

interface AppHeaderProps {
  showActions?: boolean;
}

const HIT = 38;

export default function AppHeader({ showActions = true }: AppHeaderProps) {
  const insets = useSafeAreaInsets();
  const { data: notifications } = useNotifications();

  const notificationUnread = notifications?.filter((n) => !n.isRead).length ?? 0;

  return (
    <View>
      <LinearGradient
        colors={['#08080C', '#0B0B12', colors.bgPrimary, colors.bgPrimary]}
        locations={[0, 0.45, 0.88, 1]}
        style={{ paddingTop: insets.top }}
      >
        <View style={styles.bar}>
          <View style={styles.sideSlot}>
            {showActions ? (
              <TouchableOpacity
                onPress={() => router.push('/post/create' as never)}
                style={styles.iconHit}
                activeOpacity={0.6}
                hitSlop={12}
                accessibilityLabel="Create post"
                accessibilityRole="button"
              >
                <Plus size={20} strokeWidth={1.75} color={colors.textPrimary} />
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={styles.centerSlot}>
            <MFMLogo />
          </View>

          <View style={[styles.sideSlot, styles.sideSlotRight]}>
            {showActions ? (
              <TouchableOpacity
                onPress={() => router.push('/notifications')}
                style={styles.iconHit}
                activeOpacity={0.6}
                hitSlop={12}
                accessibilityLabel="Notifications"
                accessibilityRole="button"
              >
                <Bell size={20} strokeWidth={1.75} color={colors.textPrimary} />
                {notificationUnread > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {notificationUnread > 9 ? '9+' : notificationUnread}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        <View style={styles.fadeTail} />
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 4,
  },
  sideSlot: {
    width: HIT,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  sideSlotRight: {
    alignItems: 'flex-end',
  },
  centerSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
    paddingHorizontal: 8,
  },
  fadeTail: {
    height: 5,
  },
  iconHit: {
    width: HIT,
    height: HIT,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 0,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontFamily: fonts.caption,
    fontSize: 9,
    color: colors.textPrimary,
  },
});
