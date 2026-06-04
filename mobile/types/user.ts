export interface ClubProfile {
  id: string;
  userId: string;
  description: string | null;
  adminName: string | null;
  adminEmail: string | null;
  adminPhone: string | null;
  category: string | null;
  memberCount: number;
  avgFootfall: string;
  avgRating: string;
  totalReviews: number;
  eventsCount: number;
  isVerified: boolean;
}

export interface UserProfile {
  id: string;
  email: string | null;
  phone: string | null;
  accountType: 'personal' | 'club';
  displayName: string;
  username: string;
  bio: string | null;
  avatarUrl: string | null;
  coverPhotoUrl: string | null;
  websiteUrl: string | null;
  city: string | null;
  neighbourhood: string | null;
  activities: string[];
  isVerified: boolean;
  createdAt: string;
  followerCount: number;
  followingCount: number;
  postCount: number;
  isFollowing: boolean;
  isOwnProfile: boolean;
  clubProfile: ClubProfile | null;
}

export interface UserSummary {
  id: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  accountType: 'personal' | 'club';
  isVerified: boolean;
}
