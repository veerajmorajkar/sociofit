export interface PaginationMeta {
  cursor: string | null;
  hasMore: boolean;
  total?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  meta?: PaginationMeta;
}

export interface User {
  id: string;
  email: string | null;
  phone: string | null;
  accountType: 'personal' | 'club';
  displayName: string;
  username: string;
  bio: string | null;
  avatarUrl: string | null;
  coverPhotoUrl: string | null;
  city: string | null;
  isVerified: boolean;
  followerCount: number;
  followingCount: number;
  isFollowing: boolean;
  stats: {
    steps: number;
    eventsAttended: number;
    eventsOrganised: number;
  };
  clubProfile?: ClubProfile;
}

export interface ClubProfile {
  description: string;
  category: string;
  memberCount: number;
  avgFootfall: number;
  avgRating: number;
  totalReviews: number;
  eventsCount: number;
  isVerified: boolean;
}

export interface Post {
  id: string;
  authorId: string;
  author: UserSummary;
  postType: 'photo' | 'video' | 'text' | 'link' | 'event_invite' | 'route';
  caption: string | null;
  media: PostMedia[];
  linkUrl: string | null;
  linkPreview: LinkPreview | null;
  eventId: string | null;
  categoryId: string | null;
  locationName: string | null;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  isLiked: boolean;
  createdAt: string;
}

export interface PostMedia {
  id: string;
  mediaType: 'image' | 'video';
  url: string;
  thumbnailUrl: string | null;
  width: number | null;
  height: number | null;
}

export interface LinkPreview {
  title: string;
  description: string;
  image: string;
  domain: string;
}

export interface UserSummary {
  id: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  isVerified: boolean;
}

export interface Event {
  id: string;
  organiserId: string;
  organiser: UserSummary;
  title: string;
  description: string | null;
  categoryId: string;
  categoryName: string;
  coverImageUrl: string | null;
  startTime: string;
  endTime: string;
  latitude: number;
  longitude: number;
  locationName: string;
  locationAddress: string | null;
  maxCapacity: number | null;
  priceInr: number;
  participantCount: number;
  status: 'draft' | 'upcoming' | 'live' | 'completed' | 'cancelled';
  avgRating: number;
  isJoined: boolean;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  iconUrl: string | null;
}

export interface Conversation {
  id: string;
  type: 'dm' | 'event_chat' | 'club_discussion' | 'club_announcement';
  title: string | null;
  lastMessage: MessageSummary | null;
  unreadCount: number;
  participants: UserSummary[];
}

export interface MessageSummary {
  content: string | null;
  senderName: string;
  createdAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  sender: UserSummary;
  content: string | null;
  messageType: 'text' | 'image' | 'gif' | 'system';
  mediaUrl: string | null;
  createdAt: string;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, string>;
  isRead: boolean;
  createdAt: string;
}
