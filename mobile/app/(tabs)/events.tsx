import {
  View,
  Text,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  Pressable,
  Alert,
} from 'react-native';
import { useState, useCallback, useRef } from 'react';
import { router } from 'expo-router';
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapPin, CalendarDays, Users, Plus } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import TabBarBottomFade from '@/components/ui/TabBarBottomFade';
import { useEvents, useCategories, useRsvpEvent } from '@/hooks/useEvents';
import { colors, fonts, radius, eventGradient } from '@/constants/theme';
import { SCROLL_BOTTOM_PADDING } from '@/constants/layout';
import { formatEventDate, formatPrice } from '@/utils/formatDate';
import type { Event } from '@/types/event';

// Static fallback category filter tabs shown before API loads
const STATIC_FILTERS = [
  { slug: 'all', name: 'ALL' },
  { slug: 'running', name: 'RUNNING' },
  { slug: 'cycling', name: 'CYCLING' },
  { slug: 'yoga_zumba', name: 'YOGA' },
  { slug: 'sports_games', name: 'SPORTS' },
  { slug: 'treks', name: 'TREKS' },
  { slug: 'fun_events', name: 'FUN' },
];

// ── Event Discovery Card ─────────────────────────────────────
function EventDiscoveryCard({ event, onRsvp }: { event: Event; onRsvp: () => void }) {
  const isFree = !event.priceInr || event.priceInr === 0;
  const isClubOrganiser = event.organiser.accountType === 'club';
  const isLive = event.status === 'live';

  return (
    <TouchableOpacity
      onPress={() => router.push(`/event/${event.id}` as never)}
      activeOpacity={0.9}
      style={s.card}
      accessibilityLabel={event.title}
    >
      {/* Cover image area — category gradient */}
      <View style={s.coverArea}>
        <LinearGradient
          colors={eventGradient(event.category?.slug ?? event.category?.name)}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.coverPlaceholder}
        />
        {isLive && (
          <View style={s.liveBadge}>
            <View style={s.liveDot} />
            <Text style={s.liveBadgeText}>LIVE</Text>
          </View>
        )}
        {!isFree && (
          <View style={s.priceBadge}>
            <Text style={s.priceBadgeText}>{formatPrice(event.priceInr)}</Text>
          </View>
        )}
        {isFree && (
          <View style={[s.priceBadge, s.freeBadge]}>
            <Text style={[s.priceBadgeText, s.freeBadgeText]}>FREE</Text>
          </View>
        )}
      </View>

      {/* Content */}
      <View style={s.cardContent}>
        {/* Category pill */}
        {event.category && (
          <View style={s.categoryPill}>
            <Text style={s.categoryPillText}>{event.category.name.toUpperCase()}</Text>
          </View>
        )}

        {/* Title */}
        <Text style={s.title} numberOfLines={2}>
          {event.title.toUpperCase()}
        </Text>

        {/* Organiser */}
        <View style={s.organiserRow}>
          <View style={[s.organiserAvatar, isClubOrganiser && s.organiserAvatarClub]}>
            <Text style={s.organiserAvatarText}>
              {event.organiser.displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={s.organiserName} numberOfLines={1}>
            {event.organiser.displayName.toUpperCase()}
          </Text>
          {event.organiser.isVerified && <View style={s.verifiedDot} />}
        </View>

        {/* Date & Location */}
        <View style={s.metaRow}>
          <View style={s.metaItem}>
            <CalendarDays size={13} strokeWidth={1.75} color={colors.text3} />
            <Text style={s.metaText}>{formatEventDate(event.startTime)}</Text>
          </View>
          <View style={s.metaSep} />
          <View style={s.metaItem}>
            <MapPin size={13} strokeWidth={1.75} color={colors.text3} />
            <Text style={s.metaText} numberOfLines={1}>
              {event.locationName}
            </Text>
          </View>
        </View>

        {/* Footer: going count + RSVP */}
        <View style={s.cardFooter}>
          <View style={s.goingRow}>
            <Users size={13} strokeWidth={1.75} color={colors.sageLight} />
            <Text style={s.goingText}>
              {event.participantCount ?? 0} going
              {event.maxCapacity ? ` · ${event.maxCapacity} cap` : ''}
            </Text>
          </View>

          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              onRsvp();
            }}
            style={[s.rsvpBtn, event.isRsvped && s.rsvpBtnJoined]}
            accessibilityLabel={event.isRsvped ? 'Leave event' : 'Join event'}
          >
            {event.isRsvped ? (
              <Text style={[s.rsvpText, s.rsvpTextJoined]}>JOINED ✓</Text>
            ) : (
              <Text style={s.rsvpText}>JOIN →</Text>
            )}
          </Pressable>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── Main Events Screen ───────────────────────────────────────
export default function EventsScreen() {
  const [activeCategory, setActiveCategory] = useState('all');
  const { data: categories } = useCategories();
  const { mutate: toggleRsvp } = useRsvpEvent();
  const rsvpBusyRef = useRef<string | null>(null);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useEvents({
    category: activeCategory === 'all' ? undefined : activeCategory,
  });

  useRefreshOnFocus(refetch);

  const allEvents = data?.pages.flatMap((page) => page.data) ?? [];

  const filterTabs =
    categories && categories.length > 0
      ? [
          { slug: 'all', name: 'ALL' },
          ...categories.map((c) => ({ slug: c.slug, name: c.name.toUpperCase() })),
        ]
      : STATIC_FILTERS;

  const onEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderHeader = () => (
    <>
      {/* Sticky category filter bar */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.filterBar}
        style={s.filterBarWrapper}
      >
        {filterTabs.map((tab) => (
          <TouchableOpacity
            key={tab.slug}
            onPress={() => setActiveCategory(tab.slug)}
            style={[s.filterChip, activeCategory === tab.slug && s.filterChipActive]}
            activeOpacity={0.75}
          >
            <Text style={[s.filterChipText, activeCategory === tab.slug && s.filterChipTextActive]}>
              {tab.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </>
  );

  const renderEmpty = () => {
    if (isLoading) {
      return (
        <View style={s.emptyState}>
          <ActivityIndicator size="large" color={colors.lime} />
        </View>
      );
    }
    if (isError) {
      return (
        <View style={s.emptyState}>
          <MapPin size={40} strokeWidth={1.5} color={colors.text4} />
          <Text style={s.emptyTitle}>COULDN'T LOAD EVENTS</Text>
          <Text style={s.emptyBody}>Check your connection and try again</Text>
          <TouchableOpacity onPress={() => void refetch()} style={s.retryBtn} activeOpacity={0.8}>
            <Text style={s.retryText}>RETRY</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={s.emptyState}>
        <MapPin size={40} strokeWidth={1.5} color={colors.text4} />
        <Text style={s.emptyTitle}>NO EVENTS YET</Text>
        <Text style={s.emptyBody}>Be the first — host an event for others to join</Text>
        <TouchableOpacity
          onPress={() => router.push('/event/create' as never)}
          style={s.createBtn}
          activeOpacity={0.8}
        >
          <Plus size={16} strokeWidth={2.5} color={colors.textInverse} />
          <Text style={s.createBtnText}>HOST AN EVENT</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderFooter = () =>
    isFetchingNextPage ? (
      <View style={{ paddingVertical: 20, alignItems: 'center' }}>
        <ActivityIndicator size="small" color={colors.lime} />
      </View>
    ) : null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <SafeAreaView edges={['top']} style={{ backgroundColor: colors.bg }}>
        <View style={s.screenHeader}>
          <Text style={s.screenTitle}>EVENTS</Text>
          <TouchableOpacity
            onPress={() => router.push('/event/create' as never)}
            style={s.headerCreateBtn}
            activeOpacity={0.8}
            accessibilityLabel="Create event"
          >
            <Plus size={20} strokeWidth={2.5} color={colors.textInverse} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <View style={{ flex: 1 }}>
        <FlatList
          data={allEvents}
          keyExtractor={(item) => item.id}
          removeClippedSubviews
          maxToRenderPerBatch={6}
          windowSize={7}
          initialNumToRender={5}
          renderItem={({ item }) => (
            <EventDiscoveryCard
              event={item}
              onRsvp={() => {
                if (rsvpBusyRef.current === item.id) return;
                rsvpBusyRef.current = item.id;
                toggleRsvp(
                  { eventId: item.id, isRsvped: !!item.isRsvped },
                  {
                    onSettled: () => {
                      if (rsvpBusyRef.current === item.id) rsvpBusyRef.current = null;
                    },
                    onError: (err) => {
                      Alert.alert(
                        'Could not update RSVP',
                        err instanceof Error ? err.message : 'Try again',
                      );
                    },
                  },
                );
              }}
            />
          )}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching && !isFetchingNextPage}
              onRefresh={() => void refetch()}
              tintColor={colors.lime}
            />
          }
          contentContainerStyle={{ paddingBottom: SCROLL_BOTTOM_PADDING }}
          showsVerticalScrollIndicator={false}
        />

        <TabBarBottomFade />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  // ── Screen header ──
  screenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  screenTitle: {
    fontFamily: fonts.heading,
    fontSize: 24,
    color: colors.text1,
    letterSpacing: -1,
  },
  headerCreateBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: colors.lime,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 14,
      },
      android: { elevation: 6 },
    }),
  },

  // ── Filter bar ──
  filterBarWrapper: {
    marginBottom: 8,
  },
  filterBar: {
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 4,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 3, height: 3 },
        shadowOpacity: 0.35,
        shadowRadius: 6,
      },
      android: { elevation: 3 },
    }),
  },
  filterChipActive: {
    backgroundColor: colors.lime,
    borderColor: colors.lime,
    ...Platform.select({
      ios: {
        shadowColor: colors.lime,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.25,
        shadowRadius: 14,
      },
      android: { elevation: 4 },
    }),
  },
  filterChipText: {
    fontFamily: fonts.label,
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: 1,
  },
  filterChipTextActive: {
    color: colors.onTeal,
  },

  // ── Event Card ──
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    marginHorizontal: 16,
    marginBottom: 12,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 5, height: 5 },
        shadowOpacity: 0.5,
        shadowRadius: 14,
      },
      android: { elevation: 8 },
    }),
  },
  coverArea: {
    height: 160,
    position: 'relative',
  },
  coverPlaceholder: {
    flex: 1,
    backgroundColor: colors.surface2,
  },
  liveBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.live,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
  liveBadgeText: {
    fontFamily: fonts.label,
    fontSize: 9,
    color: '#fff',
    letterSpacing: 1.5,
  },
  priceBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: colors.surface3,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  freeBadge: {
    backgroundColor: 'rgba(0,229,195,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(0,229,195,0.3)',
  },
  priceBadgeText: {
    fontFamily: fonts.label,
    fontSize: 10,
    color: colors.textPrimary,
    letterSpacing: 1,
  },
  freeBadgeText: {
    color: colors.tealPrimary,
  },
  cardContent: {
    padding: 16,
  },
  categoryPill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface3,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 8,
  },
  categoryPillText: {
    fontFamily: fonts.label,
    fontSize: 9,
    color: colors.textMuted,
    letterSpacing: 1.5,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 16,
    color: colors.text1,
    letterSpacing: -0.3,
    lineHeight: 20,
    marginBottom: 10,
  },
  organiserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  organiserAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surface3,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.lime,
  },
  organiserAvatarClub: {
    borderRadius: 6,
    borderColor: colors.sage,
  },
  organiserAvatarText: {
    fontFamily: fonts.heading,
    fontSize: 10,
    color: colors.text2,
  },
  organiserName: {
    fontFamily: fonts.heading,
    fontSize: 11,
    color: colors.text2,
    letterSpacing: 0.5,
    flex: 1,
  },
  verifiedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.purpleHero,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1,
  },
  metaSep: {
    width: 1,
    height: 12,
    backgroundColor: colors.border,
  },
  metaText: {
    fontFamily: fonts.caption,
    fontSize: 12,
    color: colors.textMuted,
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  goingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  goingText: {
    fontFamily: fonts.caption,
    fontSize: 12,
    color: colors.purpleSoft,
  },
  rsvpBtn: {
    backgroundColor: colors.tealPrimary,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: radius.sm,
    ...Platform.select({
      ios: {
        shadowColor: colors.tealPrimary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
      },
      android: { elevation: 4 },
    }),
  },
  rsvpBtnJoined: {
    backgroundColor: colors.surface3,
    shadowOpacity: 0,
    elevation: 0,
  },
  rsvpText: {
    fontFamily: fonts.button,
    fontSize: 11,
    color: colors.onTeal,
    letterSpacing: 1,
  },
  rsvpTextJoined: {
    color: colors.tealPrimary,
  },

  // ── Empty state ──
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.text1,
    marginTop: 16,
    textTransform: 'uppercase',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  emptyBody: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.text3,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 22,
  },
  retryBtn: {
    marginTop: 20,
    backgroundColor: colors.lime,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
  },
  retryText: {
    fontFamily: fonts.heading,
    fontSize: 12,
    color: colors.textInverse,
    letterSpacing: 1.5,
  },
  createBtn: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.lime,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
    ...Platform.select({
      ios: {
        shadowColor: colors.lime,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
      },
      android: { elevation: 6 },
    }),
  },
  createBtnText: {
    fontFamily: fonts.heading,
    fontSize: 12,
    color: colors.textInverse,
    letterSpacing: 1.5,
  },
});
