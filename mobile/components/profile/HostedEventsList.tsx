import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MapPin, CalendarDays } from 'lucide-react-native';
import { useHostedEvents } from '@/hooks/useEvents';
import { colors, fonts, radius, eventGradient } from '@/constants/theme';
import { formatEventDate, formatEventDateFull } from '@/utils/formatDate';
import type { Event } from '@/types/event';

function EventRow({ event, isPast }: { event: Event; isPast?: boolean }) {
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
        <Text style={s.going}>
          {event.participantCount ?? 0} joined
          {event.maxCapacity ? ` · ${event.maxCapacity} cap` : ''}
        </Text>
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
        events.map((event) => <EventRow key={event.id} event={event} isPast={isPast} />)
      )}
    </View>
  );
}

export default function HostedEventsList({ userId }: { userId?: string }) {
  const isOwnProfile = !userId;
  const { data, isLoading, isError, refetch } = useHostedEvents(userId);

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
        <Text style={s.errorText}>COULDN'T LOAD EVENTS</Text>
        <TouchableOpacity onPress={() => void refetch()} style={s.retryBtn}>
          <Text style={s.retryText}>RETRY</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const upcoming = data?.upcoming ?? [];
  const past = data?.past ?? [];

  if (upcoming.length === 0 && past.length === 0) {
    return (
      <View style={s.centered}>
        <Text style={s.emptyTitle}>NO HOSTED EVENTS</Text>
        <Text style={s.emptyBody}>
          {isOwnProfile
            ? 'Create an event for others to join'
            : "This user hasn't hosted any events yet"}
        </Text>
        {isOwnProfile && (
          <TouchableOpacity
            onPress={() => router.push('/event/create' as never)}
            style={s.hostBtn}
            activeOpacity={0.85}
          >
            <Text style={s.hostBtnText}>HOST AN EVENT</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={s.container}>
      <Section title="UPCOMING" emptyMessage="No upcoming hosted events" events={upcoming} />
      <Section title="PAST" emptyMessage="No past hosted events" events={past} isPast />
    </View>
  );
}

const s = StyleSheet.create({
  container: { paddingHorizontal: 16, gap: 24, paddingBottom: 8 },
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
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  meta: {
    fontFamily: fonts.caption,
    fontSize: 12,
    color: colors.textSecondary,
    flex: 1,
  },
  going: {
    fontFamily: fonts.caption,
    fontSize: 12,
    color: colors.purpleSoft,
    marginTop: 2,
  },
  centered: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24 },
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
    marginTop: 8,
    textAlign: 'center',
  },
  hostBtn: {
    marginTop: 20,
    backgroundColor: colors.tealPrimary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: radius.md,
  },
  hostBtnText: { fontFamily: fonts.button, color: colors.onTeal, letterSpacing: 0.5 },
  errorText: { fontFamily: fonts.h2, color: colors.textMuted, marginBottom: 12 },
  retryBtn: {
    backgroundColor: colors.tealPrimary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: radius.md,
  },
  retryText: { fontFamily: fonts.button, color: colors.onTeal },
});
