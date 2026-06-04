export interface TaggedUser {
  id: string;
  displayName: string;
  username: string;
  avatarUrl?: string | null;
}

export interface PostAuthor {
  id: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  accountType: 'personal' | 'club';
  isVerified: boolean;
}

export interface PostMedia {
  id: string;
  postId: string;
  mediaType: 'image' | 'video';
  url: string;
  thumbnailUrl: string | null;
  width: number | null;
  height: number | null;
  durationMs: number | null;
  sortOrder: number;
}

export type PostType = 'photo' | 'video' | 'text' | 'link' | 'event_invite' | 'route';

export interface Post {
  id: string;
  authorId: string;
  postType: PostType;
  caption: string | null;
  linkUrl: string | null;
  linkPreview: {
    title: string;
    description: string;
    image: string;
    domain: string;
  } | null;
  routeData: unknown | null;
  stravaActivityId: string | null;
  eventId: string | null;
  categoryId: string | null;
  locationName: string | null;
  likeCount: number | null;
  commentCount: number | null;
  shareCount: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  author: PostAuthor;
  media: PostMedia[];
  isLiked: boolean;
  isReposted?: boolean;
  repostMeta?: {
    repostId: string;
    repostedAt: string;
  } | null;
  taggedUsers?: TaggedUser[];
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  parentId: string | null;
  content: string;
  likeCount: number;
  isActive: boolean;
  createdAt: string;
  author: {
    id: string;
    displayName: string;
    username: string;
    avatarUrl: string | null;
  };
}
