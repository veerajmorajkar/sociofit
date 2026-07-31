import type { TaggedUserSummary } from '../services/post.service.js';

export type FeedPostSource = 'following' | 'self';

export interface FeedPostAuthor {
  id: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  accountType: string;
  isVerified: boolean;
}

export interface FeedPostPayload {
  id: string;
  authorId: string;
  postType: string;
  caption: string | null;
  linkUrl: string | null;
  categoryId: string | null;
  locationName: string | null;
  eventId: string | null;
  likeCount: number | null;
  commentCount: number | null;
  shareCount: number | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  author: FeedPostAuthor;
  media: Array<{
    id: string;
    postId: string;
    mediaType: string;
    url: string;
    thumbnailUrl: string | null;
    width: number | null;
    height: number | null;
    durationMs: number | null;
    sortOrder: number;
  }>;
  isLiked: boolean;
  isReposted: boolean;
  taggedUsers: TaggedUserSummary[];
}

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
      source: FeedPostSource;
      post: FeedPostPayload;
    }
  | {
      id: string;
      kind: 'recommended_post';
      label: string;
      post: FeedPostPayload;
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
