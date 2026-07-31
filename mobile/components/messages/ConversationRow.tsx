import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Megaphone, MessagesSquare } from 'lucide-react-native';
import UserAvatar from '@/components/ui/UserAvatar';
import PressableScale from '@/components/ui/PressableScale';
import ConversationTypeBadge from '@/components/messages/ConversationTypeBadge';
import { fonts, radius } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuthStore } from '@/stores/authStore';
import { getConversationPresentation } from '@/constants/messaging';
import { timeAgo } from '@/utils/formatDate';
import type { Conversation, ConversationType } from '@/types/message';

const TAGGED_TYPES: ConversationType[] = ['group', 'event_chat', 'club_announcement'];
const AVATAR_SIZE = 42;
const WELL_SIZE = AVATAR_SIZE + 6;
const RING_SIZE = WELL_SIZE + 6;

export default function ConversationRow({ item }: { item: Conversation }) {
  const { theme } = useTheme();
  const myId = useAuthStore((s) => s.user?.id);
  const { title, subtitle, avatarName, avatarUrl } = getConversationPresentation(item);

  const isSystem = item.lastMessage?.messageType === 'system';
  const isMinePreview = !isSystem && item.lastMessage?.senderId === myId;
  const rawPreview = item.lastMessage?.content ?? 'Start the conversation';
  const preview = isMinePreview ? `You: ${rawPreview}` : rawPreview;

  const showTag = TAGGED_TYPES.includes(item.type);
  const hasUnread = item.unreadCount > 0;

  // Accent role per conversation type: teal = group/action, purple = discussion,
  // gold = club prestige, soft purple = DM brand accent.
  const typeAccent =
    item.type === 'group'
      ? theme.tealPrimary
      : item.type === 'club_announcement'
        ? theme.gold
        : item.type === 'event_chat'
          ? theme.purpleHero
          : theme.purpleSoft;

  return (
    <PressableScale
      pressedScale={0.975}
      style={[
        s.card,
        {
          backgroundColor: theme.chatCard,
          borderWidth: 1,
          borderColor: hasUnread ? 'rgba(0, 229, 195, 0.35)' : theme.surface3,
          ...theme.shadows.sm,
        },
      ]}
      onPress={() => router.push(`/chat/${item.id}` as never)}
      accessibilityRole="button"
      accessibilityLabel={`Conversation with ${title}${hasUnread ? `, ${item.unreadCount} unread` : ''}`}
    >
      <LinearGradient
        colors={
          hasUnread
            ? ['rgba(0, 229, 195, 0.08)', 'rgba(0, 229, 195, 0.02)', 'transparent']
            : ['rgba(168, 130, 255, 0.06)', 'rgba(168, 130, 255, 0.015)', 'transparent']
        }
        locations={[0, 0.35, 1]}
        style={s.cardShine}
        pointerEvents="none"
      />

      {/* Unread accent bar */}
      {hasUnread ? (
        <View style={[s.accentBar, { backgroundColor: theme.tealPrimary }]} pointerEvents="none" />
      ) : null}

      <View style={s.avatarCol}>
        {/* Avatar ring: teal when unread, faint type accent otherwise */}
        <View
          style={[
            s.avatarRing,
            { borderWidth: 2, borderColor: hasUnread ? theme.tealPrimary : 'transparent' },
          ]}
        >
          <View
            style={[
              s.avatarWell,
              {
                backgroundColor: theme.insetWell,
                borderWidth: 1,
                borderColor: theme.surface3,
              },
            ]}
          >
            <UserAvatar name={avatarName} avatarUrl={avatarUrl} size={AVATAR_SIZE} />
          </View>
        </View>

        {/* Type chip on the avatar corner */}
        {item.type === 'group' ? (
          <View
            style={[s.cornerChip, { backgroundColor: theme.tealDark, borderColor: theme.surface1 }]}
          >
            <Text style={[s.cornerChipText, { color: theme.tealPrimary }]}>
              {item.memberCount > 9 ? '9+' : Math.max(item.memberCount, 1)}
            </Text>
          </View>
        ) : item.type === 'event_chat' ? (
          <View
            style={[
              s.cornerChip,
              { backgroundColor: theme.purpleDeep, borderColor: theme.surface1 },
            ]}
          >
            <MessagesSquare size={9} strokeWidth={2.5} color={theme.purpleSoft} />
          </View>
        ) : item.type === 'club_announcement' ? (
          <View
            style={[
              s.cornerChip,
              { backgroundColor: 'rgba(201, 168, 76, 0.24)', borderColor: theme.surface1 },
            ]}
          >
            <Megaphone size={9} strokeWidth={2.5} color={theme.goldLight} />
          </View>
        ) : null}
      </View>

      <View style={s.body}>
        <View style={s.topRow}>
          <View style={s.titleCol}>
            <Text
              style={[
                s.name,
                {
                  color: theme.textPrimary,
                  fontFamily: hasUnread ? fonts.bold : fonts.bodyStrong,
                },
              ]}
              numberOfLines={1}
            >
              {title}
            </Text>
            {subtitle ? (
              <Text style={[s.subtitle, { color: typeAccent }]} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>

          <View style={s.metaCol}>
            {item.lastMessageAt ? (
              <Text
                style={[
                  s.time,
                  {
                    color: hasUnread ? theme.tealMid : theme.textMuted,
                    fontFamily: hasUnread ? fonts.semibold : fonts.caption,
                  },
                ]}
              >
                {timeAgo(item.lastMessageAt)}
              </Text>
            ) : null}
            {hasUnread ? (
              <View style={[s.unreadBadge, { backgroundColor: theme.tealPrimary }]}>
                <Text style={[s.unreadBadgeText, { color: theme.onTeal }]}>
                  {item.unreadCount > 9 ? '9+' : item.unreadCount}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={s.previewRow}>
          <Text
            style={[
              s.preview,
              {
                color: hasUnread ? theme.textSecondary : theme.textMuted,
                fontFamily: hasUnread || isSystem ? fonts.bodyStrong : fonts.body,
                fontStyle: isSystem ? 'italic' : 'normal',
              },
            ]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {preview}
          </Text>
          {showTag ? <ConversationTypeBadge type={item.type} compact /> : null}
        </View>
      </View>
    </PressableScale>
  );
}

const s = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 18,
    marginBottom: 10,
    paddingVertical: 12,
    paddingHorizontal: 13,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  cardShine: {
    ...StyleSheet.absoluteFillObject,
    height: '55%',
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 10,
    bottom: 10,
    width: 3.5,
    borderTopRightRadius: radius.full,
    borderBottomRightRadius: radius.full,
  },
  avatarCol: {
    position: 'relative',
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarRing: {
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarWell: {
    width: WELL_SIZE,
    height: WELL_SIZE,
    borderRadius: WELL_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  cornerChip: {
    position: 'absolute',
    right: -1,
    bottom: -1,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    zIndex: 1,
  },
  cornerChipText: {
    fontFamily: fonts.stat,
    fontSize: 9,
    lineHeight: 11,
    includeFontPadding: false,
  },
  body: { flex: 1, minWidth: 0, gap: 5 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  titleCol: { flex: 1, minWidth: 0 },
  metaCol: { flexDirection: 'row', alignItems: 'center', gap: 7, flexShrink: 0, paddingTop: 1 },
  name: { fontSize: 15, letterSpacing: 0.1 },
  subtitle: { fontFamily: fonts.caption, fontSize: 11, marginTop: 1, opacity: 0.9 },
  time: { fontSize: 11 },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 18 },
  preview: { flex: 1, fontSize: 13, lineHeight: 18 },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  unreadBadgeText: { fontFamily: fonts.stat, fontSize: 10, letterSpacing: 0.2 },
});
