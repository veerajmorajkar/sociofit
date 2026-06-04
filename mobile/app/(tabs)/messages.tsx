import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MessageCircle } from 'lucide-react-native';
import { useConversations } from '@/hooks/useMessages';
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus';
import { colors, fonts, radius } from '@/constants/theme';
import { timeAgo } from '@/utils/formatDate';
import { SCROLL_BOTTOM_PADDING } from '@/constants/layout';
import TabBarBottomFade from '@/components/ui/TabBarBottomFade';
import type { Conversation } from '@/types/message';

function ConversationRow({ item }: { item: Conversation }) {
  const other = item.participants[0];
  const preview = item.lastMessage?.content ?? 'Start the conversation';
  const name = item.title ?? other?.displayName ?? 'Chat';

  return (
    <TouchableOpacity
      style={s.row}
      onPress={() => router.push(`/chat/${item.id}` as never)}
      activeOpacity={0.85}
    >
      <View style={s.avatar}>
        <Text style={s.avatarText}>{(other?.displayName ?? name).charAt(0).toUpperCase()}</Text>
      </View>
      <View style={s.rowBody}>
        <View style={s.rowTop}>
          <Text style={s.name} numberOfLines={1}>
            {name}
          </Text>
          {item.lastMessageAt ? <Text style={s.time}>{timeAgo(item.lastMessageAt)}</Text> : null}
        </View>
        <Text style={[s.preview, item.unreadCount > 0 && s.previewUnread]} numberOfLines={1}>
          {preview}
        </Text>
      </View>
      {item.unreadCount > 0 && (
        <View style={s.badge}>
          <Text style={s.badgeText}>{item.unreadCount > 9 ? '9+' : item.unreadCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function MessagesTab() {
  const { data: conversations, isLoading, isError, refetch } = useConversations();
  useRefreshOnFocus(refetch, 20_000);

  return (
    <View style={s.root}>
      <SafeAreaView edges={['top']} style={s.headerWrap}>
        <View style={s.header}>
          <Text style={s.headerTitle}>MESSAGES</Text>
        </View>
      </SafeAreaView>

      {isLoading ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color={colors.tealPrimary} />
        </View>
      ) : isError ? (
        <View style={s.centered}>
          <Text style={s.emptyTitle}>COULDN'T LOAD MESSAGES</Text>
          <TouchableOpacity onPress={() => void refetch()} style={s.retryBtn}>
            <Text style={s.retryText}>RETRY</Text>
          </TouchableOpacity>
        </View>
      ) : !conversations?.length ? (
        <View style={s.centered}>
          <MessageCircle size={44} strokeWidth={1.5} color={colors.textMuted} />
          <Text style={s.emptyTitle}>NO CONVERSATIONS YET</Text>
          <Text style={s.emptyBody}>
            Message someone from their profile after you connect with them
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/search' as never)}
            style={s.retryBtn}
          >
            <Text style={s.retryText}>FIND PEOPLE</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <FlatList
            data={conversations}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <ConversationRow item={item} />}
            contentContainerStyle={{ paddingBottom: SCROLL_BOTTOM_PADDING }}
            showsVerticalScrollIndicator={false}
          />
          <TabBarBottomFade />
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgPrimary },
  headerWrap: { backgroundColor: colors.bgPrimary },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface3,
  },
  headerTitle: {
    fontFamily: fonts.h1,
    fontSize: 22,
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface3,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.purpleHero,
  },
  avatarText: { fontFamily: fonts.h2, fontSize: 18, color: colors.purpleSoft },
  rowBody: { flex: 1 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  name: { fontFamily: fonts.bodyStrong, fontSize: 15, color: colors.textPrimary, flex: 1 },
  time: { fontFamily: fonts.caption, fontSize: 11, color: colors.textMuted },
  preview: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, marginTop: 3 },
  previewUnread: { color: colors.textPrimary, fontFamily: fonts.bodyStrong },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.tealPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: { fontFamily: fonts.label, fontSize: 10, color: colors.onTeal },
  emptyTitle: {
    fontFamily: fonts.h2,
    fontSize: 16,
    color: colors.textPrimary,
    marginTop: 16,
    letterSpacing: 0.5,
  },
  emptyBody: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 22,
  },
  retryBtn: {
    marginTop: 20,
    backgroundColor: colors.tealPrimary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: radius.md,
  },
  retryText: { fontFamily: fonts.button, color: colors.onTeal, letterSpacing: 0.5 },
});
