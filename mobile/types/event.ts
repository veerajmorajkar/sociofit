export interface EventOrganiser {
  id: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  accountType: 'personal' | 'club';
  isVerified: boolean;
}

export interface EventCategory {
  id: string;
  name: string;
  slug: string;
}

export type EventStatus = 'draft' | 'upcoming' | 'live' | 'completed' | 'cancelled';

export interface Event {
  id: string;
  organiserId: string;
  title: string;
  description: string | null;
  categoryId: string;
  coverImageUrl: string | null;
  startTime: string;
  endTime: string;
  latitude: string;
  longitude: string;
  locationName: string;
  locationAddress: string | null;
  maxCapacity: number | null;
  priceInr: number | null;
  currency: string;
  participantCount: number | null;
  status: EventStatus;
  chatroomActive: boolean;
  chatroomExpiresAt: string | null;
  avgRating: string;
  totalReviews: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  organiser: EventOrganiser;
  category: EventCategory;
  isRsvped: boolean;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  iconUrl: string | null;
  sortOrder: number;
}
