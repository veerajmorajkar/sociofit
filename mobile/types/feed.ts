import type { Post } from '@/types/post';

export interface FeedSuggestedUser {
  id: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  accountType: 'personal' | 'club';
  followerCount: number;
  eventsAttended: number;
  eventsHosted: number;
  activityOverlap: number;
}

export type FeedItem =
  | {
      id: string;
      kind: 'post';
      source: 'following' | 'self';
      post: Post;
    }
  | {
      id: string;
      kind: 'recommended_post';
      label: string;
      post: Post;
    }
  | {
      id: string;
      kind: 'follow_suggestions';
      title: string;
      subtitle: string;
      refreshDate: string;
      users: FeedSuggestedUser[];
    };

export interface FeedActivitySnapshot {
  postsLast24h: number;
  postsLast7d: number;
  engagementsLast7d: number;
  activeUsersLast7d: number;
  viralThreshold: number;
  recommendedPostRatio: number;
  suggestionInterval: number;
}

export function isFeedPostItem(
  item: FeedItem,
): item is Extract<FeedItem, { kind: 'post' | 'recommended_post' }> {
  return item.kind === 'post' || item.kind === 'recommended_post';
}
