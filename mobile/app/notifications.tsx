import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Bell, ChevronLeft, ImageIcon } from 'lucide-react-native';
import {
  useNotifications,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
} from '@/hooks/useNotifications';
import { useTealRefresh } from '@/hooks/useTealRefresh';
import { fonts, radius } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { timeAgo } from '@/utils/formatDate';
import type { AppNotification } from '@/types/notification';
import { isPostActionNotification } from '@/types/notification';

function openNotification(item: AppNotification) {
  const data = item.data ?? {};
  if (data.postId) {
    router.push(`/post/${data.postId}` as never);
    return;
  }
  if (data.eventId) {
    router.push(`/event/${data.eventId}` as never);
    return;
  }
  if (data.userId) {
    router.push(`/profile/${data.userId}` as never);
  }
}

function PostNotificationThumbnail({ imageUrl }: { imageUrl?: string | null }) {
  const { theme } = useTheme();
  if (imageUrl) {
    return (
      <Image source={{ uri: imageUrl }} style={s.postThumb} contentFit="cover" transition={150} />
    );
  }
  return (
    <View
      style={[
        s.postThumb,
        s.postThumbEmpty,
        { backgroundColor: theme.surface2, borderColor: theme.surface3 },
      ]}
    >
      <ImageIcon size={20} strokeWidth={1.5} color={theme.textMuted} />
    </View>
  );
}

function NotificationRow({ item, onPress }: { item: AppNotification; onPress: () => void }) {
  const { theme } = useTheme();
  const isPostAction = isPostActionNotification(item.type);
  const postImageUrl = item.data?.postImageUrl;
  const commentPreview = item.type === 'comment' ? (item.data?.commentPreview ?? item.body) : null;
  const showCommentPreview = item.type === 'comment' && Boolean(commentPreview);
  const showPostThumb = isPostAction;

  return (
    <TouchableOpacity
      style={[
        s.row,
        { borderBottomColor: theme.surface3 },
        !item.isRead && { backgroundColor: 'rgba(0,200,172,0.06)' },
      ]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={s.dotCol}>
        {!item.isRead && <View style={[s.unreadDot, { backgroundColor: theme.tealPrimary }]} />}
      </View>
      <View style={s.rowContent}>
        <View style={s.rowBody}>
          <Text style={[s.title, { color: theme.textPrimary }]} numberOfLines={2}>
            {item.title ?? 'Notification'}
          </Text>
          {showCommentPreview ? (
            <Text style={[s.commentPreview, { color: theme.textSecondary }]} numberOfLines={2}>
              {commentPreview}
            </Text>
          ) : item.body && !isPostAction ? (
            <Text style={[s.body, { color: theme.textSecondary }]} numberOfLines={2}>
              {item.body}
            </Text>
          ) : null}
          <Text style={[s.time, { color: theme.textMuted }]}>{timeAgo(item.createdAt)}</Text>
        </View>
        {showPostThumb ? <PostNotificationThumbnail imageUrl={postImageUrl} /> : null}
      </View>
    </TouchableOpacity>
  );
}

function NotificationsHeader({
  unreadCount,
  onMarkAll,
  markingAll,
}: {
  unreadCount: number;
  onMarkAll: () => void;
  markingAll: boolean;
}) {
  const { theme } = useTheme();
  return (
    <SafeAreaView
      edges={['top']}
      style={[s.navSafe, { backgroundColor: theme.bgPrimary, borderBottomColor: theme.surface3 }]}
    >
      <View style={s.navBar}>
        <View style={s.navSide}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            accessibilityLabel="Go back"
            style={s.backHit}
          >
            <ChevronLeft size={24} strokeWidth={1.75} color={theme.textPrimary} />
          </Pressable>
        </View>
        <View style={s.navTitleWrap}>
          <Text style={[s.navTitle, { color: theme.textPrimary }]}>NOTIFICATIONS</Text>
        </View>
        <View style={[s.navSide, s.navSideRight]}>
          {unreadCount > 0 ? (
            <Pressable onPress={onMarkAll} disabled={markingAll} hitSlop={8} style={s.markAllHit}>
              <Text
                style={[
                  s.markAllAction,
                  { color: theme.tealPrimary },
                  markingAll && s.markAllActionDisabled,
                ]}
              >
                {markingAll ? '…' : 'Read all'}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </SafeAreaView>
  );
}

export default function NotificationsScreen() {
  const { theme } = useTheme();
  const isFocused = useIsFocused();
  const { data, isLoading, isError, refetch } = useNotifications();
  const { refreshListProps } = useTealRefresh(refetch);
  const { mutate: markAll, isPending: markingAll } = useMarkAllNotificationsRead();
  const { mutate: markOne } = useMarkNotificationRead();

  useEffect(() => {
    if (!isFocused) return;
    const timer = setInterval(() => void refetch(), 45_000);
    return () => clearInterval(timer);
  }, [isFocused, refetch]);

  const unreadCount = data?.filter((n) => !n.isRead).length ?? 0;

  const header = (
    <NotificationsHeader
      unreadCount={unreadCount}
      onMarkAll={() => markAll()}
      markingAll={markingAll}
    />
  );

  if (isLoading) {
    return (
      <View style={[s.root, { backgroundColor: theme.bgPrimary }]}>
        {header}
        <View style={s.centered}>
          <ActivityIndicator size="large" color={theme.tealPrimary} />
        </View>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[s.root, { backgroundColor: theme.bgPrimary }]}>
        {header}
        <View style={s.centered}>
          <Text style={[s.emptyTitle, { color: theme.textPrimary }]}>
            COULDN'T LOAD NOTIFICATIONS
          </Text>
          <TouchableOpacity
            onPress={() => void refetch()}
            style={[s.retryBtn, { backgroundColor: theme.tealPrimary }]}
          >
            <Text style={[s.retryBtnText, { color: theme.onTeal }]}>RETRY</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[s.root, { backgroundColor: theme.bgPrimary }]}>
      {header}

      {!data?.length ? (
        <View style={s.centered}>
          <Bell size={40} strokeWidth={1.5} color={theme.purpleSoft} />
          <Text style={[s.emptyTitle, { color: theme.textPrimary }]}>NO NOTIFICATIONS</Text>
          <Text style={[s.emptyBody, { color: theme.textSecondary }]}>
            Likes, comments, follows, and event joins will show up here
          </Text>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <NotificationRow
              item={item}
              onPress={() => {
                markOne(item.id);
                openNotification(item);
              }}
            />
          )}
          {...refreshListProps}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  navSafe: { borderBottomWidth: StyleSheet.hairlineWidth },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 10,
    minHeight: 44,
  },
  navSide: { width: 72, alignItems: 'flex-start', justifyContent: 'center' },
  navSideRight: { alignItems: 'flex-end' },
  backHit: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -8,
  },
  navTitleWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  navTitle: { fontFamily: fonts.h2, fontSize: 16, letterSpacing: 0.5, textAlign: 'center' },
  markAllHit: { paddingVertical: 6, paddingHorizontal: 4 },
  markAllAction: { fontFamily: fonts.bodyStrong, fontSize: 13 },
  markAllActionDisabled: { opacity: 0.5 },
  listContent: { paddingBottom: 24 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  retryBtn: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 12, borderRadius: radius.md },
  retryBtnText: { fontFamily: fonts.button, letterSpacing: 0.5 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dotCol: { width: 8, alignItems: 'center', justifyContent: 'center' },
  unreadDot: { width: 8, height: 8, borderRadius: 4 },
  rowContent: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowBody: { flex: 1, minWidth: 0 },
  postThumb: { width: 48, height: 48, borderRadius: radius.sm },
  postThumbEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  title: { fontFamily: fonts.bodyStrong, fontSize: 14, lineHeight: 20 },
  body: { fontFamily: fonts.body, fontSize: 13, marginTop: 4, lineHeight: 18 },
  commentPreview: { fontFamily: fonts.body, fontSize: 13, marginTop: 4, lineHeight: 18 },
  time: { fontFamily: fonts.caption, fontSize: 11, marginTop: 6 },
  emptyTitle: { fontFamily: fonts.h2, fontSize: 16, marginTop: 16, letterSpacing: 0.5 },
  emptyBody: {
    fontFamily: fonts.body,
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 22,
  },
});
