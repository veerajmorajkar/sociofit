import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { CalendarDays, Users, Plus } from 'lucide-react-native';
import { useJoinedEvents, useHostedEvents } from '@/hooks/useEvents';
import { colors, fonts, radius, shadows, eventGradient } from '@/constants/theme';
import { formatEventDayMonth } from '@/utils/formatDate';
import type { Event } from '@/types/event';

const GRID_GAP = 12;
const GRID_PADDING = 16;
const CARD_ASPECT = 1.25;
const FOOTER_HEIGHT = 38;

function EventCard({ event, width, height }: { event: Event; width: number; height: number }) {
  const grad = eventGradient(event.category?.slug ?? event.category?.name);
  const bannerHeight = height - FOOTER_HEIGHT;
  const joined = event.participantCount ?? 0;

  return (
    <TouchableOpacity
      style={[s.card, { width, height }]}
      activeOpacity={0.9}
      onPress={() => router.push(`/event/${event.id}` as never)}
    >
      <View style={[s.banner, { height: bannerHeight }]}>
        {event.coverImageUrl ? (
          <Image
            source={{ uri: event.coverImageUrl }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        ) : (
          <LinearGradient
            colors={grad}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        )}

        {event.status === 'live' && (
          <View style={s.liveBadge}>
            <View style={s.liveDot} />
            <Text style={s.liveText}>LIVE</Text>
          </View>
        )}

        <LinearGradient
          colors={['rgba(0,0,0,0.75)', 'rgba(0,0,0,0.35)', 'transparent']}
          locations={[0, 0.55, 1]}
          style={s.titleOverlay}
        >
          <Text style={s.title} numberOfLines={3}>
            {event.title}
          </Text>
        </LinearGradient>
      </View>

      <View style={s.footer}>
        <View style={s.footerItem}>
          <CalendarDays size={11} strokeWidth={2} color={colors.textMuted} />
          <Text style={s.footerText} numberOfLines={1}>
            {formatEventDayMonth(event.startTime)}
          </Text>
        </View>
        <View style={s.footerDot} />
        <View style={s.footerItem}>
          <Users size={11} strokeWidth={2} color={colors.textMuted} />
          <Text style={s.footerText} numberOfLines={1}>
            {joined} joined
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

interface Props {
  userId?: string;
  mode: 'organised' | 'attended';
}

export default function ProfileEventsTab({ userId, mode }: Props) {
  const { width } = useWindowDimensions();
  const isOwnProfile = !userId;

  const itemWidth = (width - GRID_PADDING * 2 - GRID_GAP) / 2;
  const itemHeight = itemWidth * CARD_ASPECT;

  const { data: joinedData, isLoading: joinedLoading } = useJoinedEvents(userId);
  const { data: hostedData, isLoading: hostedLoading } = useHostedEvents(userId);

  const isLoading = mode === 'attended' ? joinedLoading : hostedLoading;

  const events =
    mode === 'attended'
      ? [...(joinedData?.upcoming ?? []), ...(joinedData?.past ?? [])]
      : [...(hostedData?.upcoming ?? []), ...(hostedData?.past ?? [])];

  if (isLoading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator color={colors.tealPrimary} />
      </View>
    );
  }

  if (events.length === 0) {
    return (
      <View style={s.centered}>
        <Text style={s.emptyTitle}>
          {mode === 'attended' ? 'No attended events' : 'No organised events'}
        </Text>
        <Text style={s.emptyBody}>
          {mode === 'attended'
            ? isOwnProfile
              ? "Join events from the Events tab — they'll show up here"
              : "This user hasn't attended any events yet"
            : isOwnProfile
              ? 'Host your first event for others to join'
              : "This user hasn't organised any events yet"}
        </Text>
        {isOwnProfile && mode === 'organised' && (
          <TouchableOpacity
            style={s.createBtn}
            onPress={() => router.push('/event/create' as never)}
            activeOpacity={0.85}
          >
            <Plus size={14} strokeWidth={2} color={colors.onTeal} />
            <Text style={s.createBtnText}>HOST AN EVENT</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={s.grid}>
      {events.map((event) => (
        <EventCard key={event.id} event={event} width={itemWidth} height={itemHeight} />
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: GRID_PADDING,
    paddingTop: 12,
    paddingBottom: 8,
    gap: GRID_GAP,
  },

  card: {
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surface2,
  },
  banner: {
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  titleOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 36,
  },
  title: {
    fontFamily: fonts.h1,
    fontSize: 17,
    color: colors.textPrimary,
    lineHeight: 21,
    letterSpacing: -0.4,
  },
  liveBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 9999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(0,229,195,0.4)',
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 9999,
    backgroundColor: colors.tealPrimary,
  },
  liveText: {
    fontFamily: fonts.label,
    fontSize: 8,
    color: colors.tealPrimary,
    letterSpacing: 0.8,
  },
  footer: {
    height: FOOTER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    gap: 6,
    backgroundColor: colors.surface1,
    borderTopWidth: 1,
    borderTopColor: colors.surface3,
  },
  footerItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minWidth: 0,
  },
  footerDot: {
    width: 3,
    height: 3,
    borderRadius: 9999,
    backgroundColor: colors.surface3,
  },
  footerText: {
    fontFamily: fonts.caption,
    fontSize: 10,
    color: colors.textSecondary,
    flexShrink: 1,
  },

  centered: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24 },
  emptyTitle: {
    fontFamily: fonts.h2,
    fontSize: 15,
    color: colors.textMuted,
    marginBottom: 8,
  },
  emptyBody: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  createBtn: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: colors.tealPrimary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: radius.md,
    ...shadows.teal,
  },
  createBtnText: {
    fontFamily: fonts.button,
    fontSize: 13,
    color: colors.onTeal,
    letterSpacing: 0.5,
  },
});
