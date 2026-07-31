import {
  useInfiniteQuery,
  useQuery,
  useMutation,
  useQueryClient,
  type QueryClient,
  type QueryKey,
} from '@tanstack/react-query';
import {
  getEvents,
  getEventById,
  rsvpEvent,
  cancelRsvp,
  getCategories,
  getJoinedEvents,
  getHostedEvents,
  getEventParticipants,
} from '@/services/events.service';
import type { EventsQueryParams } from '@/services/events.service';
import type { Event } from '@/types/event';

type EventsInfiniteData = {
  pages: { data: Event[]; meta: { cursor: string | null; hasMore: boolean } }[];
  pageParams: unknown[];
};

type JoinedEventsData = { upcoming: Event[]; past: Event[] };

function isEventsListQueryKey(key: QueryKey): boolean {
  return (
    key.length >= 2 &&
    key[0] === 'events' &&
    typeof key[1] === 'object' &&
    key[1] !== null &&
    !Array.isArray(key[1])
  );
}

function patchEventInArray(events: Event[] | undefined, eventId: string, patch: Partial<Event>) {
  return (events ?? []).map((event) => (event.id === eventId ? { ...event, ...patch } : event));
}

function patchEventCaches(
  queryClient: QueryClient,
  eventId: string,
  patch: Partial<Pick<Event, 'isRsvped' | 'participantCount'>>,
) {
  // Only infinite-query caches (['events', { category, ... }]) — not joined/hosted
  queryClient.setQueriesData<EventsInfiniteData>(
    {
      queryKey: ['events'],
      predicate: (query) => isEventsListQueryKey(query.queryKey),
    },
    (old) => {
      if (!old?.pages) return old;
      return {
        ...old,
        pages: old.pages.map((page) => ({
          ...page,
          data: patchEventInArray(page.data, eventId, patch),
        })),
      };
    },
  );

  queryClient.setQueriesData<JoinedEventsData>(
    { predicate: (q) => q.queryKey[0] === 'events' && q.queryKey[1] === 'joined' },
    (old) => {
      if (!old) return old;
      return {
        upcoming: patchEventInArray(old.upcoming, eventId, patch),
        past: patchEventInArray(old.past, eventId, patch),
      };
    },
  );

  queryClient.setQueriesData<JoinedEventsData>(
    { predicate: (q) => q.queryKey[0] === 'events' && q.queryKey[1] === 'hosted' },
    (old) => {
      if (!old) return old;
      return {
        upcoming: patchEventInArray(old.upcoming, eventId, patch),
        past: patchEventInArray(old.past, eventId, patch),
      };
    },
  );

  queryClient.setQueryData<Event>(['event', eventId], (old) => {
    if (!old || old.id !== eventId) return old;
    return { ...old, ...patch };
  });
}

export function useEvents(params: Omit<EventsQueryParams, 'cursor'> = {}) {
  return useInfiniteQuery({
    queryKey: ['events', params],
    queryFn: ({ pageParam }) => getEvents({ ...params, cursor: pageParam as string | undefined }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.meta.hasMore ? (lastPage.meta.cursor ?? undefined) : undefined,
    staleTime: 1000 * 60 * 2,
  });
}

export function useEventDetail(eventId: string) {
  return useQuery({
    queryKey: ['event', eventId],
    queryFn: () => getEventById(eventId),
    staleTime: 1000 * 60 * 1,
    enabled: !!eventId,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
    staleTime: 1000 * 60 * 60,
  });
}

export function useJoinedEvents(userId?: string) {
  return useQuery({
    queryKey: ['events', 'joined', userId ?? 'me'],
    queryFn: () => getJoinedEvents(userId),
    staleTime: 1000 * 60 * 2,
  });
}

export function useHostedEvents(userId?: string) {
  return useQuery({
    queryKey: ['events', 'hosted', userId ?? 'me'],
    queryFn: () => getHostedEvents(userId),
    staleTime: 1000 * 60 * 2,
  });
}

export function useEventParticipants(eventId: string) {
  return useQuery({
    queryKey: ['event', eventId, 'participants'],
    queryFn: () => getEventParticipants(eventId),
    enabled: !!eventId,
    staleTime: 1000 * 60,
  });
}

export function useRsvpEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ eventId, isRsvped }: { eventId: string; isRsvped: boolean }) => {
      if (isRsvped) return cancelRsvp(eventId);
      return rsvpEvent(eventId);
    },
    onMutate: async ({ eventId, isRsvped }) => {
      await queryClient.cancelQueries({ queryKey: ['events'] });
      await queryClient.cancelQueries({ queryKey: ['event', eventId] });

      const previousEvents = queryClient.getQueriesData<EventsInfiniteData>({
        queryKey: ['events'],
      });
      const previousEvent = queryClient.getQueryData<Event>(['event', eventId]);

      const joining = !isRsvped;
      const baseCount =
        previousEvent?.participantCount ??
        previousEvents
          .filter(([key]) => isEventsListQueryKey(key))
          .flatMap(([, data]) => data?.pages ?? [])
          .flatMap((page) => page.data ?? [])
          .find((e) => e.id === eventId)?.participantCount ??
        0;

      patchEventCaches(queryClient, eventId, {
        isRsvped: joining,
        participantCount: Math.max(1, baseCount + (joining ? 1 : -1)),
      });

      return { previousEvents, previousEvent };
    },
    onSuccess: (data, { eventId, isRsvped }) => {
      const joining = !isRsvped;
      const patch: Partial<Pick<Event, 'isRsvped' | 'participantCount'>> = {
        isRsvped: joining,
      };
      if (typeof data.participantCount === 'number') {
        patch.participantCount = data.participantCount;
      }
      patchEventCaches(queryClient, eventId, patch);
      void queryClient.invalidateQueries({ queryKey: ['events', 'joined'] });
      void queryClient.invalidateQueries({ queryKey: ['events', 'hosted'] });
      void queryClient.invalidateQueries({ queryKey: ['event', eventId, 'participants'] });
    },
    onError: (_err, { eventId }, context) => {
      if (context?.previousEvents) {
        for (const [key, data] of context.previousEvents) {
          queryClient.setQueryData(key as QueryKey, data);
        }
      }
      if (context?.previousEvent) {
        queryClient.setQueryData(['event', eventId], context.previousEvent);
      }
    },
  });
}
