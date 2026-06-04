import { api } from './api';
import type { Event, Category } from '@/types/event';

export interface EventsPage {
  data: Event[];
  meta: { cursor: string | null; hasMore: boolean };
}

export interface EventsQueryParams {
  cursor?: string;
  limit?: number;
  category?: string;
  /** Multiple category slugs (sent as comma-separated query param) */
  categories?: string[];
  status?: 'upcoming' | 'live';
  priceType?: 'free' | 'paid';
  startDate?: string;
  endDate?: string;
  search?: string;
}

export async function getEvents(params: EventsQueryParams = {}): Promise<EventsPage> {
  const query = new URLSearchParams();
  query.set('limit', String(params.limit ?? 20));
  if (params.cursor) query.set('cursor', params.cursor);
  if (params.categories?.length) {
    query.set('categories', params.categories.join(','));
  } else if (params.category && params.category !== 'all') {
    query.set('category', params.category);
  }
  if (params.status) query.set('status', params.status);
  if (params.priceType) query.set('priceType', params.priceType);
  if (params.startDate) query.set('startDate', params.startDate);
  if (params.endDate) query.set('endDate', params.endDate);
  if (params.search) query.set('search', params.search);

  const res = await api.get<Event[]>(`/events?${query.toString()}`);
  return {
    data: res.data ?? [],
    meta: { cursor: res.meta?.cursor ?? null, hasMore: res.meta?.hasMore ?? false },
  };
}

export async function getEventById(eventId: string): Promise<Event> {
  const res = await api.get<Event>(`/events/${eventId}`);
  if (!res.success) throw new Error(res.error ?? 'Event not found');
  return res.data;
}

export interface CreateEventParams {
  title: string;
  description?: string;
  categoryId: string;
  coverImageUrl?: string;
  startTime: string;
  endTime: string;
  locationName: string;
  locationAddress?: string;
  latitude: number;
  longitude: number;
  maxCapacity?: number;
  priceInr: number;
}

export async function createEvent(params: CreateEventParams): Promise<Event> {
  const res = await api.post<Event>('/events', params);
  if (!res.success) throw new Error(res.error ?? 'Failed to create event');
  return res.data;
}

export async function rsvpEvent(
  eventId: string,
): Promise<{ rsvped: boolean; participantCount: number }> {
  const res = await api.post<{ rsvped: boolean; participantCount: number }>(
    `/events/${eventId}/rsvp`,
  );
  if (!res.success) throw new Error(res.error ?? 'Failed to RSVP');
  return res.data;
}

export async function cancelRsvp(
  eventId: string,
): Promise<{ rsvped: boolean; participantCount: number }> {
  const res = await api.delete<{ rsvped: boolean; participantCount: number }>(
    `/events/${eventId}/rsvp`,
  );
  if (!res.success) throw new Error(res.error ?? 'Failed to cancel RSVP');
  return res.data;
}

export async function getCategories(): Promise<Category[]> {
  const res = await api.get<Category[]>('/categories');
  return res.data ?? [];
}

export interface JoinedEventsResult {
  upcoming: Event[];
  past: Event[];
}

export async function getJoinedEvents(userId?: string): Promise<JoinedEventsResult> {
  const path = userId ? `/events/user/${userId}/joined` : '/events/me/joined';
  const res = await api.get<JoinedEventsResult>(path);
  if (!res.success) throw new Error(res.error ?? 'Failed to load joined events');
  return {
    upcoming: res.data?.upcoming ?? [],
    past: res.data?.past ?? [],
  };
}

export async function getHostedEvents(userId?: string): Promise<JoinedEventsResult> {
  const path = userId ? `/events/user/${userId}/hosted` : '/events/me/hosted';
  const res = await api.get<JoinedEventsResult>(path);
  if (!res.success) throw new Error(res.error ?? 'Failed to load hosted events');
  return {
    upcoming: res.data?.upcoming ?? [],
    past: res.data?.past ?? [],
  };
}

export interface EventParticipant {
  id: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  joinedAt: string;
}

export async function getEventParticipants(eventId: string): Promise<EventParticipant[]> {
  const res = await api.get<EventParticipant[]>(`/events/${eventId}/participants?limit=20`);
  return res.data ?? [];
}
