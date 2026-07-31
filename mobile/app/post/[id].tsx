import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRef, useState } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { ChevronLeft, Trash2 } from 'lucide-react-native';
import ContentActionsMenu from '@/components/moderation/ContentActionsMenu';
import { SafeAreaView } from 'react-native-safe-area-context';
import PostCard from '@/components/feed/PostCard';
import CommentListItem from '@/components/feed/CommentListItem';
import CommentComposer from '@/components/feed/CommentComposer';
import KeyboardStickyFooter from '@/components/ui/KeyboardStickyFooter';
import { usePostDetail, usePostComments, useAddComment, useDeletePost } from '@/hooks/usePosts';
import { useLikePost, useRepostPost } from '@/hooks/useFeed';
import { useAuthStore } from '@/stores/authStore';
import { fonts, radius } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { useBottomBarScrollPadding } from '@/constants/composer';
import { timeAgo } from '@/utils/formatDate';

export default function PostDetailScreen() {
  const { theme } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const scrollRef = useRef<ScrollView>(null);
  const [commentsY, setCommentsY] = useState(0);
  const [commentText, setCommentText] = useState('');
  const scrollBottomPad = useBottomBarScrollPadding();

  const { data: post, isLoading, isError, refetch } = usePostDetail(id ?? '');
  const {
    data: commentsPages,
    isLoading: commentsLoading,
    isError: commentsError,
    fetchNextPage: fetchMoreComments,
    hasNextPage: hasMoreComments,
    isFetchingNextPage: loadingMoreComments,
    refetch: refetchComments,
  } = usePostComments(id ?? '');
  const comments = commentsPages?.pages.flatMap((p) => p.data) ?? [];
  const { mutate: submitComment, isPending: commenting } = useAddComment(id ?? '');
  const { mutate: toggleLike } = useLikePost();
  const { mutate: toggleRepost } = useRepostPost();
  const { mutate: removePost, isPending: deleting } = useDeletePost();
  const user = useAuthStore((s) => s.user);

  if (isLoading) {
    return (
      <View style={[s.centered, { backgroundColor: theme.bg }]}>
        <ActivityIndicator size="large" color={theme.tealPrimary} />
      </View>
    );
  }

  if (isError || !post) {
    return (
      <View style={[s.centered, { backgroundColor: theme.bg }]}>
        <Text style={[s.errTitle, { color: theme.textPrimary }]}>POST NOT FOUND</Text>
        <TouchableOpacity
          onPress={() => void refetch()}
          style={[s.retryBtn, { backgroundColor: theme.tealPrimary }]}
        >
          <Text style={[s.retryText, { color: theme.onTeal }]}>RETRY</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isOwner = user?.id === post.authorId;

  const onDelete = () => {
    Alert.alert('Delete post?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          removePost(post.id, {
            onSuccess: () => router.back(),
            onError: (err) => {
              Alert.alert('Delete failed', err instanceof Error ? err.message : 'Try again');
            },
          });
        },
      },
    ]);
  };

  const onSendComment = () => {
    const text = commentText.trim();
    if (!text) return;
    submitComment(text, {
      onSuccess: () => setCommentText(''),
      onError: (err) => {
        Alert.alert('Comment failed', err instanceof Error ? err.message : 'Try again');
      },
    });
  };

  const scrollToComments = () => {
    scrollRef.current?.scrollTo({ y: Math.max(0, commentsY - 12), animated: true });
  };

  return (
    <View style={[s.root, { backgroundColor: theme.bg }]}>
      <SafeAreaView edges={['top']} style={[s.navSafe, { backgroundColor: theme.bgPrimary }]}>
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
            <Text style={[s.navTitle, { color: theme.textPrimary }]}>POST</Text>
          </View>
          <View style={[s.navSide, s.navSideRight]}>
            <View style={{ width: 40, height: 40 }} />
          </View>
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView
        style={s.keyboardFrame}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollRef}
          style={s.scroll}
          contentContainerStyle={[s.scrollContent, { paddingBottom: scrollBottomPad }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <PostCard
            variant="detail"
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
            avatarInitial={post.author.displayName.charAt(0).toUpperCase()}
            avatarUrl={post.author.avatarUrl}
            mediaUrls={post.media?.map((m) => m.url) ?? []}
            locationName={post.locationName}
            taggedUsers={post.taggedUsers}
            onLike={() => toggleLike({ postId: post.id, isLiked: post.isLiked })}
            onRepost={() => toggleRepost({ postId: post.id, isReposted: post.isReposted ?? false })}
            onCommentPress={scrollToComments}
            onAuthorPress={() => router.push(`/profile/${post.author.id}` as never)}
            headerTrailing={
              isOwner ? (
                <TouchableOpacity
                  onPress={onDelete}
                  disabled={deleting}
                  hitSlop={10}
                  style={[
                    s.deleteBtn,
                    { backgroundColor: theme.surface2, borderColor: theme.surface3 },
                  ]}
                  activeOpacity={0.75}
                >
                  {deleting ? (
                    <ActivityIndicator size="small" color={theme.error} />
                  ) : (
                    <Trash2 size={18} strokeWidth={1.75} color={theme.error} />
                  )}
                </TouchableOpacity>
              ) : (
                <ContentActionsMenu
                  variant="icon"
                  targetType="post"
                  targetId={post.id}
                  targetTitle={post.caption?.trim() || 'Post'}
                  onHidden={() => router.back()}
                />
              )
            }
          />

          <View style={s.commentsSection} onLayout={(e) => setCommentsY(e.nativeEvent.layout.y)}>
            <View style={[s.sectionDivider, { backgroundColor: theme.surface3 }]} />

            {commentsLoading ? (
              <ActivityIndicator color={theme.tealPrimary} style={s.commentsLoader} />
            ) : commentsError ? (
              <View style={s.commentsEmpty}>
                <Text style={[s.emptyText, { color: theme.textMuted }]}>
                  Could not load comments
                </Text>
                <TouchableOpacity
                  onPress={() => void refetchComments()}
                  style={[
                    s.retryInline,
                    { backgroundColor: theme.surface2, borderColor: theme.surface3 },
                  ]}
                >
                  <Text style={[s.retryInlineText, { color: theme.tealPrimary }]}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : comments.length === 0 ? (
              <Text style={[s.emptyText, { color: theme.textMuted }]}>
                No comments yet. Start the conversation.
              </Text>
            ) : (
              <View style={s.commentsList}>
                {comments.map((c) => (
                  <CommentListItem key={c.id} comment={c} />
                ))}
                {hasMoreComments && (
                  <TouchableOpacity
                    onPress={() => void fetchMoreComments()}
                    disabled={loadingMoreComments}
                    style={s.loadMore}
                  >
                    {loadingMoreComments ? (
                      <ActivityIndicator size="small" color={theme.tealPrimary} />
                    ) : (
                      <Text style={[s.loadMoreText, { color: theme.tealPrimary }]}>
                        Load older comments
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </ScrollView>

        <KeyboardStickyFooter variant="comment">
          <CommentComposer
            value={commentText}
            onChangeText={setCommentText}
            onSubmit={onSendComment}
            sending={commenting}
            displayName={user?.displayName}
            avatarUrl={user?.avatarUrl}
          />
        </KeyboardStickyFooter>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  keyboardFrame: { flex: 1 },
  navSafe: {},
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 10,
    minHeight: 44,
  },
  navSide: { width: 52, alignItems: 'flex-start', justifyContent: 'center' },
  navSideRight: { alignItems: 'flex-end' },
  backHit: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -8,
  },
  navTitleWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  navTitle: { fontFamily: fonts.h2, fontSize: 16, letterSpacing: 0.5 },
  scroll: { flex: 1 },
  scrollContent: { paddingTop: 4 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  errTitle: { fontFamily: fonts.h2, marginBottom: 16 },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: radius.md },
  retryText: { fontFamily: fonts.button },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentsSection: { paddingHorizontal: 16, paddingTop: 4 },
  sectionDivider: { height: StyleSheet.hairlineWidth, marginBottom: 12, opacity: 0.65 },
  commentsList: { gap: 10 },
  commentsLoader: { marginVertical: 24 },
  commentsEmpty: { alignItems: 'center', gap: 10, paddingVertical: 16 },
  emptyText: { fontFamily: fonts.body, fontSize: 14, textAlign: 'center', paddingVertical: 12 },
  retryInline: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  retryInlineText: { fontFamily: fonts.bodyStrong, fontSize: 13 },
  loadMore: { alignItems: 'center', paddingTop: 8, paddingBottom: 4 },
  loadMoreText: { fontFamily: fonts.label, fontSize: 11, letterSpacing: 0.5 },
});
