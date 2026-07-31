import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Platform,
} from 'react-native';
import { useCallback, memo } from 'react';
import { router } from 'expo-router';
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus';
import { useTealRefresh } from '@/hooks/useTealRefresh';
import { Home as HomeIcon } from 'lucide-react-native';
import AppHeader, { APP_HEADER_BODY_HEIGHT } from '@/components/ui/AppHeader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import TabBarBottomFade from '@/components/ui/TabBarBottomFade';
import PostCard from '@/components/feed/PostCard';
import FeedFollowSuggestions from '@/components/feed/FeedFollowSuggestions';
import ContentActionsMenu from '@/components/moderation/ContentActionsMenu';
import { useAuthStore } from '@/stores/authStore';
import { useFeed, useLikePost, useRepostPost } from '@/hooks/useFeed';
import { fonts } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { SCROLL_BOTTOM_PADDING } from '@/constants/layout';
import { timeAgo } from '@/utils/formatDate';
import type { FeedItem } from '@/types/feed';
import type { Post } from '@/types/post';

const FeedPostCard = memo(function FeedPostCard({
  post,
  promotedLabel,
}: {
  post: Post;
  promotedLabel?: string;
}) {
  const { mutate: toggleLike } = useLikePost();
  const { mutate: toggleRepost } = useRepostPost();
  const currentUserId = useAuthStore((state) => state.user?.id);

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
      accountType={post.author.accountType}
      promotedLabel={promotedLabel}
      avatarInitial={post.author.displayName.charAt(0).toUpperCase()}
      avatarUrl={post.author.avatarUrl}
      mediaUrls={post.media?.map((m) => m.url) ?? []}
      locationName={post.locationName}
      taggedUsers={post.taggedUsers}
      onLike={() => toggleLike({ postId: post.id, isLiked: post.isLiked })}
      onRepost={() => toggleRepost({ postId: post.id, isReposted: post.isReposted ?? false })}
      onPress={() => router.push(`/post/${post.id}` as never)}
      onAuthorPress={() => router.push(`/profile/${post.author.id}` as never)}
      headerTrailing={
        currentUserId !== post.authorId ? (
          <ContentActionsMenu
            variant="icon"
            targetType="post"
            targetId={post.id}
            targetTitle={post.caption?.trim() || `${post.author.displayName}'s post`}
            isOwnContent={false}
          />
        ) : undefined
      }
    />
  );
});

function FeedListItem({ item }: { item: FeedItem }) {
  if (item.kind === 'follow_suggestions') {
    return <FeedFollowSuggestions title={item.title} subtitle={item.subtitle} users={item.users} />;
  }

  if (item.kind === 'recommended_post') {
    return <FeedPostCard post={item.post} promotedLabel={item.label} />;
  }

  return <FeedPostCard post={item.post} />;
}

export default function HomeScreen() {
  const { theme, pageBg } = useTheme();
  const insets = useSafeAreaInsets();
  const listTopInset = insets.top + APP_HEADER_BODY_HEIGHT;
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError, refetch } =
    useFeed();

  const { refreshListProps } = useTealRefresh(refetch);

  useRefreshOnFocus(refetch);

  const allItems = data?.pages.flatMap((page) => page.data) ?? [];

  const onEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderFooter = () => {
    if (isFetchingNextPage) {
      return (
        <View style={s.loadingMore}>
          <ActivityIndicator size="small" color={theme.tealPrimary} />
        </View>
      );
    }
    if (allItems.length > 0 && !hasNextPage) {
      return (
        <View style={s.feedEnd}>
          <Text style={[s.feedEndText, { color: theme.textMuted }]}>
            Follow more people to see more posts
          </Text>
        </View>
      );
    }
    return null;
  };

  const renderEmpty = () => {
    if (isLoading) {
      return (
        <View style={s.emptyState}>
          <ActivityIndicator size="large" color={theme.tealPrimary} />
        </View>
      );
    }
    if (isError) {
      return (
        <View style={s.emptyState}>
          <HomeIcon size={40} strokeWidth={1.5} color={theme.textMuted} />
          <Text style={[s.emptyTitle, { color: theme.textPrimary }]}>Couldn't load feed</Text>
          <Text style={[s.emptyBody, { color: theme.textMuted }]}>Pull down to try again</Text>
          <Pressable
            onPress={() => void refetch()}
            style={[
              s.retryBtn,
              {
                backgroundColor: theme.tealPrimary,
                ...Platform.select({
                  ios: {
                    shadowColor: theme.tealPrimary,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.25,
                    shadowRadius: 12,
                  },
                  android: { elevation: 4 },
                }),
              },
            ]}
          >
            <Text style={[s.retryText, { color: theme.onTeal }]}>Retry</Text>
          </Pressable>
        </View>
      );
    }
    return (
      <View style={s.emptyState}>
        <HomeIcon size={40} strokeWidth={1.5} color={theme.textMuted} />
        <Text style={[s.emptyTitle, { color: theme.textPrimary }]}>Your feed is quiet</Text>
        <Text style={[s.emptyBody, { color: theme.textMuted }]}>
          Follow athletes and clubs to see their posts — popular posts from the community will
          appear here too
        </Text>
        <Pressable
          onPress={() =>
            router.push({ pathname: '/(tabs)/search', params: { filter: 'athletes' } } as never)
          }
          style={[
            s.retryBtn,
            {
              backgroundColor: theme.tealPrimary,
              ...Platform.select({
                ios: {
                  shadowColor: theme.tealPrimary,
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.25,
                  shadowRadius: 12,
                },
                android: { elevation: 4 },
              }),
            },
          ]}
        >
          <Text style={[s.retryText, { color: theme.onTeal }]}>Find athletes</Text>
        </Pressable>
      </View>
    );
  };

  return (
    <View style={[s.root, { backgroundColor: pageBg }]}>
      <View style={s.listWrap}>
        <FlatList
          data={allItems}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <FeedListItem item={item} />}
          style={{ flex: 1, backgroundColor: pageBg }}
          {...refreshListProps}
          maxToRenderPerBatch={8}
          windowSize={7}
          initialNumToRender={6}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.4}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={[
            s.listContent,
            { paddingTop: listTopInset },
            allItems.length === 0 && s.listContentEmpty,
          ]}
          showsVerticalScrollIndicator={false}
        />

        <TabBarBottomFade floorColor={pageBg} />
      </View>

      <AppHeader />
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
  },
  listWrap: {
    flex: 1,
  },
  listContent: {
    paddingBottom: SCROLL_BOTTOM_PADDING,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontFamily: fonts.h2,
    fontSize: 16,
    marginTop: 16,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  emptyBody: {
    fontFamily: fonts.body,
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 22,
  },
  retryBtn: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
  },
  retryText: {
    fontFamily: fonts.button,
    fontSize: 12,
    letterSpacing: 1,
  },
  loadingMore: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  feedEnd: {
    paddingVertical: 28,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  feedEndText: {
    fontFamily: fonts.body,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
