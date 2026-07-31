import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getFeed, likePost, unlikePost, repostPost, unrepostPost } from '@/services/posts.service';
import { useAuthStore } from '@/stores/authStore';
import type { Post } from '@/types/post';
import type { FeedItem } from '@/types/feed';
import { isFeedPostItem } from '@/types/feed';

type FeedInfiniteData = {
  pages: {
    data: FeedItem[];
    meta: { cursor: string | null; hasMore: boolean };
  }[];
  pageParams: unknown[];
};

export function useFeed() {
  return useInfiniteQuery({
    queryKey: ['feed'],
    queryFn: ({ pageParam }) => getFeed(pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.meta.hasMore ? (lastPage.meta.cursor ?? undefined) : undefined,
    staleTime: 1000 * 60 * 2,
  });
}

function patchFeedPosts(
  queryClient: ReturnType<typeof useQueryClient>,
  postId: string,
  patch: (post: Post) => Post,
) {
  queryClient.setQueriesData<FeedInfiniteData>({ queryKey: ['feed'] }, (old) => {
    if (!old?.pages) return old;
    return {
      ...old,
      pages: old.pages.map((page) => ({
        ...page,
        data: (page.data ?? []).map((item) => {
          if (!isFeedPostItem(item) || item.post.id !== postId) return item;
          return { ...item, post: patch(item.post) };
        }),
      })),
    };
  });
}

export function useLikePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, isLiked }: { postId: string; isLiked: boolean }) => {
      if (isLiked) return unlikePost(postId);
      return likePost(postId);
    },
    onMutate: async ({ postId, isLiked }) => {
      await queryClient.cancelQueries({ queryKey: ['feed'] });
      const snapshots = queryClient.getQueriesData<FeedInfiniteData>({ queryKey: ['feed'] });

      patchFeedPosts(queryClient, postId, (post) => ({
        ...post,
        isLiked: !isLiked,
        likeCount: (post.likeCount ?? 0) + (isLiked ? -1 : 1),
      }));

      return { snapshots };
    },
    onError: (_err, _vars, context) => {
      if (context?.snapshots) {
        for (const [key, data] of context.snapshots) {
          queryClient.setQueryData(key, data);
        }
      }
    },
    onSuccess: (data, { postId, isLiked }) => {
      if (typeof data?.likeCount === 'number') {
        const patch = { isLiked: !isLiked, likeCount: data.likeCount };
        patchFeedPosts(queryClient, postId, (post) => ({ ...post, ...patch }));
        queryClient.setQueryData<Post>(['post', postId], (old) =>
          old ? { ...old, ...patch } : old,
        );
      }
    },
  });
}

export function useRepostPost() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);

  return useMutation({
    mutationFn: async ({ postId, isReposted }: { postId: string; isReposted: boolean }) => {
      if (isReposted) return unrepostPost(postId);
      return repostPost(postId);
    },
    onMutate: async ({ postId, isReposted }) => {
      await queryClient.cancelQueries({ queryKey: ['feed'] });
      const snapshots = queryClient.getQueriesData<FeedInfiniteData>({ queryKey: ['feed'] });

      patchFeedPosts(queryClient, postId, (post) => ({
        ...post,
        isReposted: !isReposted,
        shareCount: (post.shareCount ?? 0) + (isReposted ? -1 : 1),
      }));

      return { snapshots };
    },
    onError: (_err, _vars, context) => {
      if (context?.snapshots) {
        for (const [key, data] of context.snapshots) {
          queryClient.setQueryData(key, data);
        }
      }
    },
    onSuccess: (data, { postId, isReposted }) => {
      if (typeof data?.repostCount === 'number') {
        const patch = { isReposted: !isReposted, shareCount: data.repostCount };
        patchFeedPosts(queryClient, postId, (post) => ({ ...post, ...patch }));
        queryClient.setQueryData<Post>(['post', postId], (old) =>
          old ? { ...old, ...patch } : old,
        );
      }
      if (userId) {
        void queryClient.invalidateQueries({ queryKey: ['posts', 'user', userId] });
      }
      void queryClient.invalidateQueries({ queryKey: ['posts', 'user'] });
    },
  });
}
