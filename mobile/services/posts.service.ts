import { api } from './api';
import type { Post, Comment } from '@/types/post';
import type { FeedActivitySnapshot, FeedItem } from '@/types/feed';

export interface FeedPage {
  data: FeedItem[];
  meta: {
    cursor: string | null;
    hasMore: boolean;
    activity?: FeedActivitySnapshot;
  };
}

export async function getFeed(cursor?: string): Promise<FeedPage> {
  const params = new URLSearchParams({ limit: '20' });
  if (cursor) params.set('cursor', cursor);

  const res = await api.get<FeedItem[]>(`/posts/feed?${params.toString()}`);

  return {
    data: res.data ?? [],
    meta: {
      cursor: res.meta?.cursor ?? null,
      hasMore: res.meta?.hasMore ?? false,
      activity: res.meta?.activity as FeedActivitySnapshot | undefined,
    },
  };
}

export async function getPostById(postId: string): Promise<Post | null> {
  const res = await api.get<Post>(`/posts/${postId}`);
  return res.success ? res.data : null;
}

export async function likePost(postId: string): Promise<{ liked: boolean; likeCount: number }> {
  const res = await api.post<{ liked: boolean; likeCount: number }>(`/posts/${postId}/like`);
  if (!res.success) throw new Error(res.error ?? 'Failed to like post');
  return res.data;
}

export async function unlikePost(postId: string): Promise<{ liked: boolean; likeCount: number }> {
  const res = await api.delete<{ liked: boolean; likeCount: number }>(`/posts/${postId}/like`);
  if (!res.success) throw new Error(res.error ?? 'Failed to unlike post');
  return res.data;
}

export async function repostPost(
  postId: string,
): Promise<{ reposted: boolean; repostCount: number }> {
  const res = await api.post<{ reposted: boolean; repostCount: number }>(`/posts/${postId}/repost`);
  if (!res.success) throw new Error(res.error ?? 'Failed to repost');
  return res.data;
}

export async function unrepostPost(
  postId: string,
): Promise<{ reposted: boolean; repostCount: number }> {
  const res = await api.delete<{ reposted: boolean; repostCount: number }>(
    `/posts/${postId}/repost`,
  );
  if (!res.success) throw new Error(res.error ?? 'Failed to remove repost');
  return res.data;
}

export interface GetCommentsPage {
  data: Comment[];
  meta: { cursor: string | null; hasMore: boolean };
}

export async function getComments(postId: string, cursor?: string): Promise<GetCommentsPage> {
  const params = new URLSearchParams({ limit: '20' });
  if (cursor) params.set('cursor', cursor);

  const res = await api.get<Comment[]>(`/posts/${postId}/comments?${params.toString()}`);
  return {
    data: res.data ?? [],
    meta: { cursor: res.meta?.cursor ?? null, hasMore: res.meta?.hasMore ?? false },
  };
}

export async function addComment(
  postId: string,
  content: string,
  parentId?: string,
): Promise<Comment> {
  const res = await api.post<Comment>(`/posts/${postId}/comments`, { content, parentId });
  if (!res.success) throw new Error(res.error ?? 'Failed to add comment');
  return res.data;
}

export interface CreatePostParams {
  postType: 'photo' | 'video' | 'text' | 'link' | 'event_invite' | 'route';
  caption?: string;
  mediaUrls?: Array<{
    url: string;
    mediaType: 'image' | 'video';
    thumbnailUrl?: string;
    width?: number;
    height?: number;
  }>;
  linkUrl?: string;
  categoryId?: string;
  locationName?: string;
  latitude?: number;
  longitude?: number;
  taggedUsernames?: string[];
}

export async function createPost(params: CreatePostParams): Promise<Post> {
  const res = await api.post<Post>('/posts', params);
  if (!res.success) throw new Error(res.error ?? 'Failed to create post');
  return res.data;
}

export async function deletePost(postId: string): Promise<void> {
  const res = await api.delete<{ deleted: boolean }>(`/posts/${postId}`);
  if (!res.success) throw new Error(res.error ?? 'Failed to delete post');
}

export interface UserPostsPage {
  data: Post[];
  meta: {
    cursor: string | null;
    hasMore: boolean;
  };
}

export async function getUserPosts(userId: string, cursor?: string): Promise<UserPostsPage> {
  const params = new URLSearchParams({ limit: '20' });
  if (cursor) params.set('cursor', cursor);

  const res = await api.get<Post[]>(`/posts/user/${userId}?${params.toString()}`);
  return {
    data: res.data ?? [],
    meta: {
      cursor: res.meta?.cursor ?? null,
      hasMore: res.meta?.hasMore ?? false,
    },
  };
}
