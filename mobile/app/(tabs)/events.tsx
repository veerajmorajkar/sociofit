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
  TextInput,
  Animated,
  Easing,
} from 'react-native';
import { useState, useCallback, useRef, type RefObject } from 'react';
import { router } from 'expo-router';
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapPin, CalendarDays, Users, Plus, Search, X } from 'lucide-react-native';
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

const SEARCH_BAR_HEIGHT = 44;
const SEARCH_GAP = 10; // matches navBar paddingBottom — equal above bar & below bar → filters
const SEARCH_PANEL_HEIGHT = SEARCH_GAP + SEARCH_BAR_HEIGHT + SEARCH_GAP;

type FilterTab = { slug: string; name: string };

function EventsTopChrome({
  searchExpanded,
  searchQuery,
  onSearchQueryChange,
  onToggleSearch,
  onCloseSearch,
  searchProgress,
  searchInputRef,
  filterTabs,
  activeCategory,
  onCategoryChange,
}: {
  searchExpanded: boolean;
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  onToggleSearch: () => void;
  onCloseSearch: () => void;
  searchProgress: Animated.Value;
  searchInputRef: RefObject<TextInput | null>;
  filterTabs: FilterTab[];
  activeCategory: string;
  onCategoryChange: (slug: string) => void;
}) {
  const searchHeight = searchProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, SEARCH_PANEL_HEIGHT],
  });
  const searchOpacity = searchProgress.interpolate({
    inputRange: [0, 0.35, 1],
    outputRange: [0, 0, 1],
  });
  const isInteractive = searchExpanded;

  return (
    <SafeAreaView edges={['top']} style={s.navSafe}>
      <View style={s.navBar}>
        <Pressable
          onPress={onToggleSearch}
          hitSlop={12}
          style={s.navHit}
          accessibilityLabel={searchExpanded ? 'Close event search' : 'Search events'}
          accessibilityRole="button"
        >
          <Search
            size={22}
            strokeWidth={1.75}
            color={searchExpanded ? colors.tealPrimary : colors.textPrimary}
          />
        </Pressable>

        <View style={s.navTitleWrap}>
          <Text style={s.navTitle}>EVENTS</Text>
        </View>

        <View style={s.navSide}>
          <TouchableOpacity
            onPress={() => router.push('/event/create' as never)}
            style={s.headerCreateBtn}
            activeOpacity={0.8}
            accessibilityLabel="Create event"
          >
            <Plus size={18} strokeWidth={2.5} color={colors.onTeal} />
          </TouchableOpacity>
        </View>
      </View>

      <Animated.View
        pointerEvents={isInteractive ? 'auto' : 'none'}
        style={[s.searchPanel, { height: searchHeight }]}
        collapsable={false}
      >
        <Animated.View style={[s.searchPanelInner, { opacity: searchOpacity }]}>
          <View style={s.searchBar}>
            <Search size={18} strokeWidth={1.75} color={colors.textMuted} />
            <TextInput
              ref={searchInputRef}
              style={s.searchInput}
              placeholder="Search events…"
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={onSearchQueryChange}
              returnKeyType="search"
              autoCorrect={false}
              autoCapitalize="none"
              clearButtonMode="never"
              editable={isInteractive}
            />
            {searchQuery.length > 0 ? (
              <Pressable
                onPress={() => onSearchQueryChange('')}
                hitSlop={8}
                accessibilityLabel="Clear search"
              >
                <X size={18} strokeWidth={2} color={colors.textMuted} />
              </Pressable>
            ) : null}
            <Pressable
              onPress={onCloseSearch}
              hitSlop={8}
              style={s.searchCloseBtn}
              accessibilityLabel="Close search"
            >
              <X size={20} strokeWidth={2} color={colors.textSecondary} />
            </Pressable>
          </View>
        </Animated.View>
      </Animated.View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.filterBar}
        style={s.filterBarWrapper}
      >
        {filterTabs.map((tab) => (
          <TouchableOpacity
            key={tab.slug}
            onPress={() => onCategoryChange(tab.slug)}
            style={[s.filterChip, activeCategory === tab.slug && s.filterChipActive]}
            activeOpacity={0.75}
          >
            <Text style={[s.filterChipText, activeCategory === tab.slug && s.filterChipTextActive]}>
              {tab.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

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
      <View style={s.cardBadgeRow} pointerEvents="none">
        <View
          style={[
            s.organiserTypeBadge,
            isClubOrganiser ? s.organiserTypeClub : s.organiserTypePerson,
          ]}
        >
          <Text
            style={[
              s.organiserTypeText,
              isClubOrganiser ? s.organiserTypeTextClub : s.organiserTypeTextPerson,
            ]}
          >
            {isClubOrganiser ? 'CLUB' : 'PERSON'}
          </Text>
        </View>
        {isLive ? (
          <View style={s.liveBadge}>
            <View style={s.liveDot} />
            <Text style={s.liveBadgeText}>LIVE</Text>
          </View>
        ) : null}
      </View>

      {/* Cover image area — category gradient */}
      <View style={s.coverArea}>
        <LinearGradient
          colors={eventGradient(event.category?.slug ?? event.category?.name)}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.coverPlaceholder}
        />
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
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebouncedValue(searchQuery.trim(), 300);
  const searchProgress = useRef(new Animated.Value(0)).current;
  const searchAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  const searchInputRef = useRef<TextInput>(null);

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
    isFetching,
  } = useEvents({
    category: activeCategory === 'all' ? undefined : activeCategory,
    search: debouncedSearch || undefined,
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

  const runSearchAnimation = useCallback(
    (toValue: number, onEnd?: () => void) => {
      searchAnimRef.current?.stop();
      searchAnimRef.current =
        toValue === 0
          ? Animated.timing(searchProgress, {
              toValue: 0,
              duration: 240,
              easing: Easing.inOut(Easing.cubic),
              useNativeDriver: false,
            })
          : Animated.spring(searchProgress, {
              toValue: 1,
              useNativeDriver: false,
              tension: 88,
              friction: 11,
              overshootClamping: true,
            });
      searchAnimRef.current.start(({ finished }) => {
        if (finished) onEnd?.();
      });
    },
    [searchProgress],
  );

  const openSearch = useCallback(() => {
    setSearchExpanded(true);
    searchProgress.setValue(0);
    runSearchAnimation(1, () => {
      searchInputRef.current?.focus();
    });
  }, [searchProgress, runSearchAnimation]);

  const closeSearch = useCallback(() => {
    searchInputRef.current?.blur();
    runSearchAnimation(0, () => {
      setSearchExpanded(false);
      setSearchQuery('');
    });
  }, [runSearchAnimation]);

  const toggleSearch = useCallback(() => {
    if (searchExpanded) closeSearch();
    else openSearch();
  }, [searchExpanded, openSearch, closeSearch]);

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
    const isSearchActive = debouncedSearch.length > 0;
    return (
      <View style={s.emptyState}>
        <MapPin size={40} strokeWidth={1.5} color={colors.text4} />
        <Text style={s.emptyTitle}>{isSearchActive ? 'NO MATCHING EVENTS' : 'NO EVENTS YET'}</Text>
        <Text style={s.emptyBody}>
          {isSearchActive
            ? 'Try a different keyword or category'
            : 'Be the first — host an event for others to join'}
        </Text>
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
    <View style={s.root}>
      <EventsTopChrome
        searchExpanded={searchExpanded}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        onToggleSearch={toggleSearch}
        onCloseSearch={closeSearch}
        searchProgress={searchProgress}
        searchInputRef={searchInputRef}
        filterTabs={filterTabs}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
      />

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
  root: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },

  // ── Top chrome (matches notifications nav) ──
  navSafe: {
    backgroundColor: colors.bgPrimary,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.surface3,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 10,
    minHeight: 44,
  },
  navHit: {
    width: 44,
    height: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  navTitleWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    fontFamily: fonts.h2,
    fontSize: 16,
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
  navSide: {
    width: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  headerCreateBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.tealPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: colors.tealPrimary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.28,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
    }),
  },

  searchPanel: {
    overflow: 'hidden',
    paddingHorizontal: 12,
  },
  searchPanelInner: {
    height: SEARCH_PANEL_HEIGHT,
    paddingTop: SEARCH_GAP,
    paddingBottom: SEARCH_GAP,
    justifyContent: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: SEARCH_BAR_HEIGHT,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: colors.surface1,
    borderWidth: 1,
    borderColor: colors.surface3,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.textPrimary,
    paddingVertical: 0,
    includeFontPadding: false,
  },
  searchCloseBtn: {
    marginLeft: 2,
    paddingLeft: 6,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: colors.surface3,
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
    position: 'relative',
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
  cardBadgeRow: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  organiserTypeBadge: {
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  organiserTypeClub: {
    backgroundColor: 'rgba(0, 229, 195, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 195, 0.45)',
  },
  organiserTypePerson: {
    backgroundColor: 'rgba(123, 77, 255, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(168, 130, 255, 0.5)',
  },
  organiserTypeText: {
    fontFamily: fonts.label,
    fontSize: 9,
    letterSpacing: 1.2,
  },
  organiserTypeTextClub: {
    color: colors.tealPrimary,
  },
  organiserTypeTextPerson: {
    color: colors.purpleSoft,
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
