import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getPostById,
  getComments,
  addComment,
  getUserPosts,
  deletePost,
} from '@/services/posts.service';
import { useAuthStore } from '@/stores/authStore';
import type { Post } from '@/types/post';
import type { FeedItem } from '@/types/feed';
import { isFeedPostItem } from '@/types/feed';

export function useUserPosts(userId: string) {
  return useInfiniteQuery({
    queryKey: ['posts', 'user', userId],
    queryFn: ({ pageParam }) => getUserPosts(userId, pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => (last.meta.hasMore ? (last.meta.cursor ?? undefined) : undefined),
    enabled: !!userId,
    staleTime: 1000 * 60 * 2,
  });
}

export function usePostDetail(postId: string) {
  return useQuery({
    queryKey: ['post', postId],
    queryFn: async () => {
      const post = await getPostById(postId);
      if (!post) throw new Error('Post not found');
      return post;
    },
    enabled: !!postId,
  });
}

export function usePostComments(postId: string) {
  return useInfiniteQuery({
    queryKey: ['post', postId, 'comments'],
    queryFn: ({ pageParam }) => getComments(postId, pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => (last.meta.hasMore ? (last.meta.cursor ?? undefined) : undefined),
    enabled: !!postId,
    staleTime: 1000 * 60,
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);

  return useMutation({
    mutationFn: (postId: string) => deletePost(postId),
    onSuccess: (_data, postId) => {
      void queryClient.invalidateQueries({ queryKey: ['feed'] });
      void queryClient.invalidateQueries({ queryKey: ['post', postId] });
      if (userId) {
        void queryClient.invalidateQueries({ queryKey: ['posts', 'user', userId] });
      }
      void queryClient.invalidateQueries({ queryKey: ['profile', 'me'] });
    },
  });
}

export function useAddComment(postId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (content: string) => addComment(postId, content),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['post', postId, 'comments'] });
      void queryClient.invalidateQueries({ queryKey: ['post', postId] });

      queryClient.setQueriesData<{ pages: { data: FeedItem[] }[] }>(
        { queryKey: ['feed'] },
        (old) => {
          if (!old?.pages) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              data: (page.data ?? []).map((item) => {
                if (!isFeedPostItem(item) || item.post.id !== postId) return item;
                return {
                  ...item,
                  post: {
                    ...item.post,
                    commentCount: (item.post.commentCount ?? 0) + 1,
                  },
                };
              }),
            })),
          };
        },
      );

      queryClient.setQueryData<Post>(['post', postId], (old) =>
        old ? { ...old, commentCount: (old.commentCount ?? 0) + 1 } : old,
      );
    },
  });
}
