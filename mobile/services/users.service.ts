import { api } from './api';
import type { UserProfile, UserSummary } from '@/types/user';

export async function getMe(): Promise<UserProfile> {
  const res = await api.get<UserProfile>('/users/me');
  if (!res.success) throw new Error(res.error ?? 'Failed to fetch profile');
  return res.data;
}

export async function getUserProfile(userId: string): Promise<UserProfile> {
  const res = await api.get<UserProfile>(`/users/${userId}`);
  if (!res.success) throw new Error(res.error ?? 'User not found');
  return res.data;
}

export interface UpdateProfileParams {
  displayName?: string;
  username?: string;
  bio?: string;
  email?: string;
  phone?: string;
  avatarUrl?: string | null;
  coverPhotoUrl?: string;
  websiteUrl?: string | null;
  city?: string;
  neighbourhood?: string;
  activities?: string[];
}

export async function updateProfile(params: UpdateProfileParams): Promise<UserProfile> {
  const res = await api.patch<UserProfile>('/users/me', params);
  if (!res.success) throw new Error(res.error ?? 'Failed to update profile');
  return res.data;
}

export async function followUser(userId: string): Promise<{ following: boolean }> {
  const res = await api.post<{ following: boolean }>(`/users/${userId}/follow`);
  if (!res.success) throw new Error(res.error ?? 'Failed to follow user');
  return res.data;
}

export async function unfollowUser(userId: string): Promise<{ following: boolean }> {
  const res = await api.delete<{ following: boolean }>(`/users/${userId}/follow`);
  if (!res.success) throw new Error(res.error ?? 'Failed to unfollow user');
  return res.data;
}

export interface FollowersPage {
  data: UserSummary[];
  meta: { cursor: string | null; hasMore: boolean };
}

export async function getFollowers(userId: string, cursor?: string): Promise<FollowersPage> {
  const params = new URLSearchParams({ limit: '20' });
  if (cursor) params.set('cursor', cursor);
  const res = await api.get<UserSummary[]>(`/users/${userId}/followers?${params.toString()}`);
  return {
    data: res.data ?? [],
    meta: { cursor: res.meta?.cursor ?? null, hasMore: res.meta?.hasMore ?? false },
  };
}

export async function searchUsers(query: string): Promise<UserSummary[]> {
  const params = new URLSearchParams({ q: query.trim() });
  const res = await api.get<UserSummary[]>(`/users/search?${params.toString()}`);
  return res.data ?? [];
}

export async function getFollowing(userId: string, cursor?: string): Promise<FollowersPage> {
  const params = new URLSearchParams({ limit: '20' });
  if (cursor) params.set('cursor', cursor);
  const res = await api.get<UserSummary[]>(`/users/${userId}/following?${params.toString()}`);
  return {
    data: res.data ?? [],
    meta: { cursor: res.meta?.cursor ?? null, hasMore: res.meta?.hasMore ?? false },
  };
}
