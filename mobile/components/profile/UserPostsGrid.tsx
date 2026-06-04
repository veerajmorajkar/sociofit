import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  useWindowDimensions,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Repeat2, Layers } from 'lucide-react-native';
import { useAuthStore } from '@/stores/authStore';
import { useUserPosts, useDeletePost } from '@/hooks/usePosts';
import { useRepostPost } from '@/hooks/useFeed';
import { colors, fonts, radius } from '@/constants/theme';

export default function UserPostsGrid({ userId: userIdProp }: { userId?: string }) {
  const authUserId = useAuthStore((s) => s.user?.id) ?? '';
  const userId = userIdProp ?? authUserId;
  const { width } = useWindowDimensions();
  const gap = 12;
  const itemWidth = (width - 16 * 2 - gap) / 2;

  const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useUserPosts(userId);
  const { mutate: deletePost } = useDeletePost();
  const { mutate: toggleRepost } = useRepostPost();

  const posts = data?.pages.flatMap((p) => p.data) ?? [];
  const isOwnProfile = userId === authUserId;

  const onLongPressPost = (postId: string, isRepost: boolean) => {
    if (!isOwnProfile) return;

    if (isRepost) {
      Alert.alert('Remove repost?', 'This will remove the post from your profile.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            toggleRepost(
              { postId, isReposted: true },
              {
                onError: (err) => {
                  Alert.alert('Remove failed', err instanceof Error ? err.message : 'Try again');
                },
              },
            );
          },
        },
      ]);
      return;
    }

    Alert.alert('Delete post?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deletePost(postId, {
            onError: (err) => {
              Alert.alert('Delete failed', err instanceof Error ? err.message : 'Try again');
            },
          });
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator color={colors.tealPrimary} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={s.centered}>
        <Text style={s.error}>COULDN'T LOAD POSTS</Text>
        <TouchableOpacity onPress={() => void refetch()} style={s.retryBtn}>
          <Text style={s.retryText}>RETRY</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (posts.length === 0) {
    return (
      <View style={s.centered}>
        <Text style={s.emptyTitle}>NO POSTS YET</Text>
        <Text style={s.emptyBody}>
          {isOwnProfile ? 'Share your first workout or moment' : 'No posts from this user yet'}
        </Text>
        {isOwnProfile && (
          <TouchableOpacity
            onPress={() => router.push('/post/create' as never)}
            style={s.createBtn}
            activeOpacity={0.85}
          >
            <Text style={s.createBtnText}>CREATE POST</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={s.grid}>
      {posts.map((post) => {
        const thumb = post.media?.[0]?.url;
        const multiPhoto = (post.media?.length ?? 0) > 1;
        const isRepost = !!post.repostMeta;
        const itemKey = post.repostMeta?.repostId ?? post.id;

        return (
          <TouchableOpacity
            key={itemKey}
            style={[s.item, { width: itemWidth, height: itemWidth * 1.25 }]}
            onPress={() => router.push(`/post/${post.id}` as never)}
            onLongPress={() => onLongPressPost(post.id, isRepost)}
            activeOpacity={0.9}
          >
            {thumb ? (
              <Image source={{ uri: thumb }} style={s.thumb} contentFit="cover" />
            ) : (
              <View style={s.textThumb}>
                <Text style={s.textThumbLabel} numberOfLines={6}>
                  {post.caption?.trim() || 'Text post'}
                </Text>
              </View>
            )}
            {multiPhoto && (
              <View style={s.multiBadge}>
                <Layers size={11} strokeWidth={2.5} color={colors.textPrimary} />
              </View>
            )}
            {isRepost && (
              <View style={s.repostBadge}>
                <Repeat2 size={11} strokeWidth={2.5} color={colors.onTeal} />
              </View>
            )}
          </TouchableOpacity>
        );
      })}
      {hasNextPage && (
        <TouchableOpacity
          onPress={() => void fetchNextPage()}
          style={s.loadMore}
          disabled={isFetchingNextPage}
        >
          {isFetchingNextPage ? (
            <ActivityIndicator color={colors.tealPrimary} size="small" />
          ) : (
            <Text style={s.loadMoreText}>LOAD MORE</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
  },
  item: {
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surface2,
  },
  thumb: { width: '100%', height: '100%' },
  multiBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  repostBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.tealPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textThumb: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
    backgroundColor: colors.surface2,
  },
  textThumbLabel: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  centered: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24 },
  emptyTitle: {
    fontFamily: fonts.h2,
    fontSize: 16,
    color: colors.textMuted,
    letterSpacing: 1,
  },
  emptyBody: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 8,
    textAlign: 'center',
  },
  createBtn: {
    marginTop: 20,
    backgroundColor: colors.tealPrimary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: radius.md,
  },
  createBtnText: { fontFamily: fonts.button, color: colors.onTeal, letterSpacing: 0.5 },
  error: { fontFamily: fonts.h2, color: colors.textMuted, marginBottom: 12 },
  retryBtn: {
    backgroundColor: colors.tealPrimary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: radius.md,
  },
  retryText: { fontFamily: fonts.button, color: colors.onTeal },
  loadMore: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 16,
  },
  loadMoreText: {
    fontFamily: fonts.label,
    fontSize: 11,
    color: colors.tealPrimary,
    letterSpacing: 1,
  },
});
