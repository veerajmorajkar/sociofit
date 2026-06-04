import { useQuery } from '@tanstack/react-query';
import { searchUsers } from '@/services/users.service';
import { getEvents } from '@/services/events.service';
import { useAuthStore } from '@/stores/authStore';

export type SearchFilter = 'all' | 'people' | 'clubs' | 'events' | 'location';

export function useUserSearch(query: string) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: ['search', 'users', trimmed],
    queryFn: () => searchUsers(trimmed),
    enabled: trimmed.replace(/^@/, '').length >= 1,
    staleTime: 1000 * 60,
  });
}

export function useClubSearch(query: string) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: ['search', 'clubs', trimmed],
    queryFn: async () => {
      const all = await searchUsers(trimmed);
      return all.filter((u) => u.accountType === 'club');
    },
    enabled: trimmed.replace(/^@/, '').length >= 1,
    staleTime: 1000 * 60,
  });
}

export function usePeopleSearch(query: string) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: ['search', 'people', trimmed],
    queryFn: async () => {
      const all = await searchUsers(trimmed);
      return all.filter((u) => u.accountType === 'personal');
    },
    enabled: trimmed.replace(/^@/, '').length >= 1,
    staleTime: 1000 * 60,
  });
}

function categoriesQueryKey(categories?: string[]): string {
  if (!categories?.length) return '';
  return [...categories].sort().join(',');
}

export function useEventSearch(query: string, categories?: string[]) {
  const trimmed = query.trim();
  const catKey = categoriesQueryKey(categories);
  return useQuery({
    queryKey: ['search', 'events', trimmed, catKey],
    queryFn: () =>
      getEvents({
        search: trimmed || undefined,
        categories: categories?.length ? categories : undefined,
      }),
    enabled: trimmed.length >= 1 || (categories?.length ?? 0) > 0,
    staleTime: 1000 * 60,
  });
}

/** Map-view: fetch upcoming events for pins */
export function useMapEvents(categories?: string[]) {
  const isAuthenticated = useAuthStore((s) => !!s.accessToken);
  const catKey = categoriesQueryKey(categories);
  return useQuery({
    queryKey: ['map-events', catKey],
    queryFn: () =>
      getEvents({
        limit: 50,
        status: 'upcoming',
        categories: categories?.length ? categories : undefined,
      }),
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 3,
  });
}
