import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MapPin, CalendarDays } from 'lucide-react-native';
import { useJoinedEvents } from '@/hooks/useEvents';
import { colors, fonts, radius, eventGradient } from '@/constants/theme';
import { formatEventDate, formatEventDateFull } from '@/utils/formatDate';
import type { Event } from '@/types/event';

function JoinedEventRow({ event, isPast }: { event: Event; isPast?: boolean }) {
  const grad = eventGradient(event.category?.slug ?? event.category?.name);

  return (
    <TouchableOpacity
      style={s.card}
      activeOpacity={0.85}
      onPress={() => router.push(`/event/${event.id}` as never)}
    >
      <LinearGradient colors={grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.accent} />
      <View style={s.cardBody}>
        {event.category && <Text style={s.category}>{event.category.name.toUpperCase()}</Text>}
        <Text style={s.title} numberOfLines={2}>
          {event.title}
        </Text>
        <View style={s.metaRow}>
          <CalendarDays size={13} color={colors.textMuted} />
          <Text style={s.meta}>
            {isPast ? formatEventDateFull(event.startTime) : formatEventDate(event.startTime)}
          </Text>
        </View>
        <View style={s.metaRow}>
          <MapPin size={13} color={colors.textMuted} />
          <Text style={s.meta} numberOfLines={1}>
            {event.locationName}
          </Text>
        </View>
        {event.status === 'live' && !isPast && (
          <View style={s.livePill}>
            <View style={s.liveDot} />
            <Text style={s.liveText}>LIVE NOW</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

function Section({
  title,
  emptyMessage,
  events,
  isPast,
}: {
  title: string;
  emptyMessage: string;
  events: Event[];
  isPast?: boolean;
}) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      {events.length === 0 ? (
        <Text style={s.sectionEmpty}>{emptyMessage}</Text>
      ) : (
        events.map((event) => <JoinedEventRow key={event.id} event={event} isPast={isPast} />)
      )}
    </View>
  );
}

export default function JoinedEventsActivity({ userId }: { userId?: string }) {
  const isOwnProfile = !userId;
  const { data, isLoading, isError, refetch } = useJoinedEvents(userId);

  if (isLoading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator size="large" color={colors.tealPrimary} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={s.centered}>
        <Text style={s.errorText}>COULDN'T LOAD ACTIVITY</Text>
        <TouchableOpacity onPress={() => void refetch()} style={s.retryBtn}>
          <Text style={s.retryText}>RETRY</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const upcoming = data?.upcoming ?? [];
  const past = data?.past ?? [];
  const isEmpty = upcoming.length === 0 && past.length === 0;

  if (isEmpty) {
    return (
      <View style={s.centered}>
        <Text style={s.emptyTitle}>NO JOINED EVENTS YET</Text>
        <Text style={s.emptyBody}>
          {isOwnProfile
            ? "Join events from the Events tab — they'll show up here"
            : "This user hasn't joined any events yet"}
        </Text>
        {isOwnProfile && (
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/events' as never)}
            style={s.browseBtn}
            activeOpacity={0.85}
          >
            <Text style={s.browseBtnText}>BROWSE EVENTS</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={s.container}>
      <Section
        title="UPCOMING & ONGOING"
        emptyMessage="No upcoming events — explore the Events tab to join one"
        events={upcoming}
      />
      <Section title="PAST EVENTS" emptyMessage="No past events yet" events={past} isPast />
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    gap: 24,
    paddingBottom: 8,
  },
  section: { gap: 10 },
  sectionTitle: {
    fontFamily: fonts.label,
    fontSize: 11,
    color: colors.purpleSoft,
    letterSpacing: 1.5,
  },
  sectionEmpty: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 20,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface1,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.surface3,
    overflow: 'hidden',
  },
  accent: { width: 5 },
  cardBody: { flex: 1, padding: 14, gap: 6 },
  category: {
    fontFamily: fonts.label,
    fontSize: 9,
    color: colors.textMuted,
    letterSpacing: 1,
  },
  title: {
    fontFamily: fonts.h2,
    fontSize: 16,
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  meta: {
    fontFamily: fonts.caption,
    fontSize: 12,
    color: colors.textSecondary,
    flex: 1,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.xs,
    backgroundColor: 'rgba(0,229,196,0.12)',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.tealPrimary,
  },
  liveText: {
    fontFamily: fonts.label,
    fontSize: 9,
    color: colors.tealPrimary,
    letterSpacing: 1,
  },
  centered: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontFamily: fonts.h2,
    fontSize: 16,
    color: colors.textMuted,
    letterSpacing: 1,
  },
  emptyBody: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  browseBtn: {
    marginTop: 20,
    backgroundColor: colors.tealPrimary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: radius.md,
  },
  browseBtnText: {
    fontFamily: fonts.button,
    fontSize: 13,
    color: colors.onTeal,
    letterSpacing: 0.5,
  },
  errorText: {
    fontFamily: fonts.h2,
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 12,
  },
  retryBtn: {
    backgroundColor: colors.tealPrimary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: radius.md,
  },
  retryText: { fontFamily: fonts.button, color: colors.onTeal, letterSpacing: 1 },
});
