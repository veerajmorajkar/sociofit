import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bell, Plus } from 'lucide-react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useNotifications } from '@/hooks/useNotifications';
import { fonts, radius } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import MFMLogo from './MFMLogo';

interface AppHeaderProps {
  showActions?: boolean;
}

const HIT = 38;
/** Bar + 1px divider — add safe-area top inset for list offset. */
export const APP_HEADER_BODY_HEIGHT = 47;

export default function AppHeader({ showActions = true }: AppHeaderProps) {
  const insets = useSafeAreaInsets();
  const { theme, pageBg } = useTheme();
  const { data: notifications } = useNotifications();

  const notificationUnread = notifications?.filter((n) => !n.isRead).length ?? 0;

  return (
    <View style={[s.shell, { paddingTop: insets.top, backgroundColor: pageBg }]}>
      <LinearGradient
        pointerEvents="none"
        colors={[`rgba(${hexToRgb(pageBg)},0)`, pageBg, pageBg]}
        locations={[0, 0.4, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={s.bar}>
        <View style={s.sideSlot}>
          {showActions ? (
            <TouchableOpacity
              onPress={() => router.push('/post/create' as never)}
              style={s.iconHit}
              activeOpacity={0.6}
              hitSlop={12}
              accessibilityLabel="Create post"
              accessibilityRole="button"
            >
              <Plus size={20} strokeWidth={1.75} color={theme.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={s.centerSlot}>
          <MFMLogo />
        </View>

        <View style={[s.sideSlot, s.sideSlotRight]}>
          {showActions ? (
            <TouchableOpacity
              onPress={() => router.push('/notifications')}
              style={s.iconHit}
              activeOpacity={0.6}
              hitSlop={12}
              accessibilityLabel="Notifications"
              accessibilityRole="button"
            >
              <Bell size={20} strokeWidth={1.75} color={theme.textMuted} />
              {notificationUnread > 0 && (
                <View style={[s.badge, { backgroundColor: theme.tealPrimary }]}>
                  <Text style={[s.badgeText, { color: theme.onTeal }]}>
                    {notificationUnread > 9 ? '9+' : notificationUnread}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <View style={s.headerDivider}>
        <LinearGradient
          colors={['transparent', `rgba(${hexToRgb(theme.purpleSoft)},0.22)`, 'transparent']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={s.headerDividerLine}
        />
      </View>
    </View>
  );
}

/** Convert a #RRGGBB hex to "R,G,B" for rgba() strings. Falls back to 0,0,0. */
function hexToRgb(hex: string): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return '0,0,0';
  return `${parseInt(m[1]!, 16)},${parseInt(m[2]!, 16)},${parseInt(m[3]!, 16)}`;
}

const s = StyleSheet.create({
  shell: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
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
  headerDivider: {
    paddingHorizontal: 28,
  },
  headerDividerLine: {
    height: 1,
    borderRadius: radius.full,
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontFamily: fonts.caption,
    fontSize: 9,
  },
});
