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
import { colors, fonts, radius } from '@/constants/theme';
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
  if (imageUrl) {
    return (
      <Image source={{ uri: imageUrl }} style={s.postThumb} contentFit="cover" transition={150} />
    );
  }

  return (
    <View style={[s.postThumb, s.postThumbEmpty]}>
      <ImageIcon size={20} strokeWidth={1.5} color={colors.textMuted} />
    </View>
  );
}

function NotificationRow({ item, onPress }: { item: AppNotification; onPress: () => void }) {
  const isPostAction = isPostActionNotification(item.type);
  const postImageUrl = item.data?.postImageUrl;
  const commentPreview = item.type === 'comment' ? (item.data?.commentPreview ?? item.body) : null;
  const showCommentPreview = item.type === 'comment' && Boolean(commentPreview);
  const showPostThumb = isPostAction;

  return (
    <TouchableOpacity
      style={[s.row, !item.isRead && s.rowUnread]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={s.dotCol}>{!item.isRead && <View style={s.unreadDot} />}</View>
      <View style={s.rowContent}>
        <View style={s.rowBody}>
          <Text style={s.title} numberOfLines={2}>
            {item.title ?? 'Notification'}
          </Text>
          {showCommentPreview ? (
            <Text style={s.commentPreview} numberOfLines={2}>
              {commentPreview}
            </Text>
          ) : item.body && !isPostAction ? (
            <Text style={s.body} numberOfLines={2}>
              {item.body}
            </Text>
          ) : null}
          <Text style={s.time}>{timeAgo(item.createdAt)}</Text>
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
  return (
    <SafeAreaView edges={['top']} style={s.navSafe}>
      <View style={s.navBar}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityLabel="Go back"
          style={s.backHit}
        >
          <ChevronLeft size={24} strokeWidth={1.75} color={colors.textPrimary} />
        </Pressable>
        <View style={s.navTitleWrap}>
          <Text style={s.navTitle}>NOTIFICATIONS</Text>
        </View>
        <View style={s.navSide}>
          {unreadCount > 0 ? (
            <Pressable onPress={onMarkAll} disabled={markingAll} hitSlop={8} style={s.markAllHit}>
              <Text style={[s.markAllAction, markingAll && s.markAllActionDisabled]}>
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
  const isFocused = useIsFocused();
  const { data, isLoading, isError, refetch } = useNotifications();
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
      <View style={s.root}>
        {header}
        <View style={s.centered}>
          <ActivityIndicator size="large" color={colors.tealPrimary} />
        </View>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={s.root}>
        {header}
        <View style={s.centered}>
          <Text style={s.emptyTitle}>COULDN'T LOAD NOTIFICATIONS</Text>
          <TouchableOpacity onPress={() => void refetch()} style={s.retryBtn}>
            <Text style={s.retryBtnText}>RETRY</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={s.root}>
      {header}

      {!data?.length ? (
        <View style={s.centered}>
          <Bell size={40} strokeWidth={1.5} color={colors.purpleSoft} />
          <Text style={s.emptyTitle}>NO NOTIFICATIONS</Text>
          <Text style={s.emptyBody}>
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
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  navSafe: {
    backgroundColor: colors.bgPrimary,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.surface3,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 10,
    minHeight: 44,
  },
  backHit: {
    width: 44,
    height: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  navTitleWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    fontFamily: fonts.h2,
    fontSize: 16,
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
  navSide: {
    width: 72,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  markAllHit: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  markAllAction: {
    fontFamily: fonts.bodyStrong,
    fontSize: 13,
    color: colors.tealPrimary,
  },
  markAllActionDisabled: {
    opacity: 0.5,
  },
  listContent: {
    paddingBottom: 24,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  retryBtn: {
    marginTop: 16,
    backgroundColor: colors.tealPrimary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: radius.md,
  },
  retryBtnText: {
    fontFamily: fonts.button,
    color: colors.onTeal,
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.surface3,
  },
  rowUnread: { backgroundColor: 'rgba(0,229,196,0.06)' },
  dotCol: {
    width: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.tealPrimary,
  },
  rowContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowBody: { flex: 1, minWidth: 0 },
  postThumb: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    backgroundColor: colors.surface2,
  },
  postThumbEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.surface3,
  },
  title: {
    fontFamily: fonts.bodyStrong,
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  commentPreview: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  time: {
    fontFamily: fonts.caption,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 6,
  },
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
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 22,
  },
});
