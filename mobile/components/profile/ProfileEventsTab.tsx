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
import { fonts, radius, eventGradient } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { formatEventDayMonth } from '@/utils/formatDate';
import type { Event } from '@/types/event';

const GRID_GAP = 12;
const GRID_PADDING = 16;
const CARD_ASPECT = 1.25;
const FOOTER_HEIGHT = 42;

function EventCard({ event, width, height }: { event: Event; width: number; height: number }) {
  const { theme } = useTheme();
  const grad = eventGradient(event.category?.slug ?? event.category?.name);
  const bannerHeight = height - FOOTER_HEIGHT;
  const joined = Math.max(event.participantCount ?? 0, 1);

  return (
    <TouchableOpacity
      style={[
        s.card,
        {
          width,
          height,
          backgroundColor: theme.surface2,
          borderColor: theme.surface3,
          ...theme.shadows.sm,
        },
      ]}
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
            <View style={[s.liveDot, { backgroundColor: theme.tealPrimary }]} />
            <Text style={[s.liveText, { color: theme.tealPrimary }]}>LIVE</Text>
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

        <LinearGradient
          colors={['transparent', theme.surface2]}
          style={s.bannerFade}
          pointerEvents="none"
        />
      </View>

      <View style={[s.footer, { backgroundColor: theme.surface2, borderTopColor: theme.surface3 }]}>
        <View style={s.footerItem}>
          <CalendarDays size={11} strokeWidth={2} color={theme.textMuted} />
          <Text style={[s.footerText, { color: theme.textSecondary }]} numberOfLines={1}>
            {formatEventDayMonth(event.startTime)}
          </Text>
        </View>
        <View style={[s.footerDot, { backgroundColor: theme.textMuted }]} />
        <View style={s.footerItem}>
          <Users size={11} strokeWidth={2} color={theme.textMuted} />
          <Text style={[s.footerText, { color: theme.textSecondary }]} numberOfLines={1}>
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
  const { theme } = useTheme();
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
        <ActivityIndicator color={theme.tealPrimary} />
      </View>
    );
  }

  if (events.length === 0) {
    return (
      <View style={s.centered}>
        <Text style={[s.emptyTitle, { color: theme.textMuted }]}>
          {mode === 'attended' ? 'No attended events' : 'No organised events'}
        </Text>
        <Text style={[s.emptyBody, { color: theme.textMuted }]}>
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
            style={[s.createBtn, { backgroundColor: theme.tealPrimary, ...theme.shadows.teal }]}
            onPress={() => router.push('/event/create' as never)}
            activeOpacity={0.85}
          >
            <Plus size={14} strokeWidth={2} color={theme.onTeal} />
            <Text style={[s.createBtnText, { color: theme.onTeal }]}>HOST AN EVENT</Text>
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
  card: { borderRadius: radius.md, overflow: 'hidden', borderWidth: 1 },
  banner: { width: '100%', position: 'relative', overflow: 'hidden' },
  bannerFade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 18 },
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
    color: '#FFFFFF',
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
    borderColor: 'rgba(0,200,172,0.4)',
  },
  liveDot: { width: 5, height: 5, borderRadius: 9999 },
  liveText: { fontFamily: fonts.label, fontSize: 8, letterSpacing: 0.8 },
  footer: {
    height: FOOTER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    gap: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minWidth: 0,
  },
  footerDot: { width: 3, height: 3, borderRadius: 9999 },
  footerText: { fontFamily: fonts.caption, fontSize: 10, flexShrink: 1 },
  centered: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24 },
  emptyTitle: { fontFamily: fonts.h2, fontSize: 15, marginBottom: 8 },
  emptyBody: { fontFamily: fonts.body, fontSize: 13, textAlign: 'center', lineHeight: 20 },
  createBtn: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: radius.md,
  },
  createBtnText: { fontFamily: fonts.button, fontSize: 13, letterSpacing: 0.5 },
});
