import {
  View,
  Text,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Platform,
} from 'react-native';
import { useCallback, memo } from 'react';
import { router } from 'expo-router';
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus';
import { Home as HomeIcon } from 'lucide-react-native';
import AppHeader from '@/components/ui/AppHeader';
import TabBarBottomFade from '@/components/ui/TabBarBottomFade';
import PostCard from '@/components/feed/PostCard';
import { useFeed, useLikePost, useRepostPost } from '@/hooks/useFeed';
import { colors, fonts } from '@/constants/theme';
import { SCROLL_BOTTOM_PADDING } from '@/constants/layout';
import { timeAgo } from '@/utils/formatDate';
import type { Post } from '@/types/post';

const FeedPostCard = memo(function FeedPostCard({ post }: { post: Post }) {
  const { mutate: toggleLike } = useLikePost();
  const { mutate: toggleRepost } = useRepostPost();

  return (
    <PostCard
      postId={post.id}
      postType={post.postType}
      eventId={post.eventId}
      username={post.author.displayName}
      timestamp={timeAgo(post.createdAt)}
      caption={post.caption ?? undefined}
      likeCount={post.likeCount ?? 0}
      commentCount={post.commentCount ?? 0}
      reshareCount={post.shareCount ?? 0}
      isLiked={post.isLiked}
      isReposted={post.isReposted ?? false}
      isVerified={post.author.isVerified}
      avatarInitial={post.author.displayName.charAt(0).toUpperCase()}
      avatarUrl={post.author.avatarUrl}
      mediaUrls={post.media?.map((m) => m.url) ?? []}
      locationName={post.locationName}
      taggedUsers={post.taggedUsers}
      onLike={() => toggleLike({ postId: post.id, isLiked: post.isLiked })}
      onRepost={() => toggleRepost({ postId: post.id, isReposted: post.isReposted ?? false })}
      onPress={() => router.push(`/post/${post.id}` as never)}
      onAuthorPress={() => router.push(`/profile/${post.author.id}` as never)}
    />
  );
});

export default function HomeScreen() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useFeed();

  useRefreshOnFocus(refetch);

  const allPosts = data?.pages.flatMap((page) => page.data) ?? [];

  const onEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderFooter = () => {
    if (!isFetchingNextPage) return null;
    return (
      <View style={s.loadingMore}>
        <ActivityIndicator size="small" color={colors.tealPrimary} />
      </View>
    );
  };

  const renderEmpty = () => {
    if (isLoading) {
      return (
        <View style={s.emptyState}>
          <ActivityIndicator size="large" color={colors.tealPrimary} />
        </View>
      );
    }
    if (isError) {
      return (
        <View style={s.emptyState}>
          <HomeIcon size={40} strokeWidth={1.5} color={colors.textMuted} />
          <Text style={s.emptyTitle}>COULD NOT LOAD FEED</Text>
          <Text style={s.emptyBody}>Pull down to try again</Text>
          <Pressable onPress={() => void refetch()} style={s.retryBtn}>
            <Text style={s.retryText}>RETRY</Text>
          </Pressable>
        </View>
      );
    }
    return (
      <View style={s.emptyState}>
        <HomeIcon size={40} strokeWidth={1.5} color={colors.textMuted} />
        <Text style={s.emptyTitle}>YOUR FEED IS QUIET</Text>
        <Text style={s.emptyBody}>
          Follow people and clubs to see their posts — popular posts from the community will appear
          here too
        </Text>
        <Pressable onPress={() => router.push('/(tabs)/search' as never)} style={s.retryBtn}>
          <Text style={s.retryText}>FIND PEOPLE</Text>
        </Pressable>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <AppHeader />

      <View style={{ flex: 1 }}>
        <FlatList
          data={allPosts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <FeedPostCard post={item} />}
          removeClippedSubviews
          maxToRenderPerBatch={8}
          windowSize={7}
          initialNumToRender={6}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching && !isFetchingNextPage}
              onRefresh={() => void refetch()}
              tintColor={colors.tealPrimary}
            />
          }
          onEndReached={onEndReached}
          onEndReachedThreshold={0.4}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={{ paddingTop: 4, paddingBottom: SCROLL_BOTTOM_PADDING }}
          showsVerticalScrollIndicator={false}
        />

        <TabBarBottomFade />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontFamily: fonts.h2,
    fontSize: 16,
    color: colors.textPrimary,
    marginTop: 16,
    letterSpacing: 0.5,
    textAlign: 'center',
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
    borderRadius: 14,
    ...Platform.select({
      ios: {
        shadowColor: colors.tealPrimary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
      },
      android: { elevation: 4 },
    }),
  },
  retryText: {
    fontFamily: fonts.button,
    fontSize: 12,
    color: colors.onTeal,
    letterSpacing: 1,
  },
  loadingMore: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});
