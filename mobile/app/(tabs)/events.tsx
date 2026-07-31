import {
  View,
  Text,
  FlatList,
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
import { useTealRefresh } from '@/hooks/useTealRefresh';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapPin, CalendarDays, Users, Plus, Search, X } from 'lucide-react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import TabBarBottomFade from '@/components/ui/TabBarBottomFade';
import { useEvents, useCategories, useRsvpEvent } from '@/hooks/useEvents';
import { fonts, radius, eventGradient } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { SCROLL_BOTTOM_PADDING } from '@/constants/layout';
import AccountTypeIcon from '@/components/auth/AccountTypeIcon';
import { accountTypeBadgeLabel } from '@/constants/accountType';
import { formatEventDate, formatPrice } from '@/utils/formatDate';
import type { Event } from '@/types/event';

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
const SEARCH_GAP = 10;
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
  const { theme, mode, pageBg } = useTheme();
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
    <SafeAreaView edges={['top']} style={{ backgroundColor: pageBg }}>
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
            color={searchExpanded ? theme.tealPrimary : theme.textPrimary}
          />
        </Pressable>

        <View style={s.navTitleWrap}>
          <Text style={[s.navTitle, { color: theme.textPrimary }]}>Events</Text>
        </View>

        <View style={s.navSide}>
          <TouchableOpacity
            onPress={() => router.push('/event/create' as never)}
            style={[
              s.headerCreateBtn,
              {
                backgroundColor: theme.tealPrimary,
                ...Platform.select({
                  ios: {
                    shadowColor: theme.tealPrimary,
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.28,
                    shadowRadius: 8,
                  },
                  android: { elevation: 4 },
                }),
              },
            ]}
            activeOpacity={0.8}
            accessibilityLabel="Create event"
          >
            <Plus size={18} strokeWidth={2.5} color={theme.onTeal} />
          </TouchableOpacity>
        </View>
      </View>

      <Animated.View
        pointerEvents={isInteractive ? 'auto' : 'none'}
        style={[s.searchPanel, { height: searchHeight }]}
        collapsable={false}
      >
        <Animated.View style={[s.searchPanelInner, { opacity: searchOpacity }]}>
          <View
            style={[s.searchBar, { backgroundColor: theme.surface1, borderColor: theme.surface3 }]}
          >
            <Search size={18} strokeWidth={1.75} color={theme.textMuted} />
            <TextInput
              ref={searchInputRef}
              style={[s.searchInput, { color: theme.textPrimary }]}
              placeholder="Search events…"
              placeholderTextColor={theme.textMuted}
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
                <X size={18} strokeWidth={2} color={theme.textMuted} />
              </Pressable>
            ) : null}
            <Pressable
              onPress={onCloseSearch}
              hitSlop={8}
              style={[s.searchCloseBtn, { borderLeftColor: theme.surface3 }]}
              accessibilityLabel="Close search"
            >
              <X size={20} strokeWidth={2} color={theme.textSecondary} />
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
        {filterTabs.map((tab) => {
          const isActive = activeCategory === tab.slug;
          return (
            <TouchableOpacity
              key={tab.slug}
              onPress={() => onCategoryChange(tab.slug)}
              style={[
                s.filterChip,
                {
                  backgroundColor: isActive
                    ? theme.tealPrimary
                    : mode === 'light'
                      ? theme.surface2
                      : theme.surface,
                  borderColor: isActive ? theme.tealPrimary : theme.border,
                  ...(Platform.OS === 'ios'
                    ? isActive
                      ? {
                          shadowColor: theme.tealPrimary,
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.28,
                          shadowRadius: 8,
                        }
                      : {
                          shadowColor: theme.shadows.sm.shadowColor,
                          shadowOffset: theme.shadows.sm.shadowOffset,
                          shadowOpacity: theme.shadows.sm.shadowOpacity,
                          shadowRadius: theme.shadows.sm.shadowRadius,
                        }
                    : { elevation: isActive ? 4 : theme.shadows.sm.elevation }),
                },
              ]}
              activeOpacity={0.75}
            >
              <Text
                style={[s.filterChipText, { color: isActive ? theme.onTeal : theme.textMuted }]}
              >
                {tab.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

function EventDiscoveryCard({ event, onRsvp }: { event: Event; onRsvp: () => void }) {
  const { theme, mode } = useTheme();
  const cardBg = mode === 'light' ? theme.surface2 : theme.surface1;
  const isFree = !event.priceInr || event.priceInr === 0;
  const isClubOrganiser = event.organiser.accountType === 'club';
  const isLive = event.status === 'live';

  return (
    <TouchableOpacity
      onPress={() => router.push(`/event/${event.id}` as never)}
      activeOpacity={0.9}
      style={[
        s.card,
        {
          backgroundColor: cardBg,
          ...(mode === 'light' && { borderWidth: 1, borderColor: theme.border }),
          ...Platform.select({
            ios: {
              shadowColor: theme.shadows.md.shadowColor,
              shadowOffset: theme.shadows.md.shadowOffset,
              shadowOpacity: theme.shadows.md.shadowOpacity,
              shadowRadius: theme.shadows.md.shadowRadius,
            },
            android: { elevation: theme.shadows.md.elevation },
          }),
        },
      ]}
      accessibilityLabel={event.title}
    >
      <View style={s.cardBadgeRow} pointerEvents="none">
        <View
          style={[
            s.organiserTypeBadge,
            isClubOrganiser
              ? {
                  backgroundColor: 'rgba(91,46,204,0.12)',
                  borderWidth: 1,
                  borderColor: 'rgba(91,46,204,0.35)',
                }
              : {
                  backgroundColor: 'rgba(0,200,172,0.12)',
                  borderWidth: 1,
                  borderColor: 'rgba(0,200,172,0.35)',
                },
          ]}
        >
          <Text
            style={[
              s.organiserTypeText,
              { color: isClubOrganiser ? theme.purpleBrand : theme.tealPrimary },
            ]}
          >
            {accountTypeBadgeLabel(isClubOrganiser ? 'club' : 'personal')}
          </Text>
        </View>
        {isLive ? (
          <View style={[s.liveBadge, { backgroundColor: theme.live }]}>
            <View style={s.liveDot} />
            <Text style={s.liveBadgeText}>LIVE</Text>
          </View>
        ) : null}
      </View>

      <View style={s.coverArea}>
        {event.coverImageUrl ? (
          <Image
            source={{ uri: event.coverImageUrl }}
            style={s.coverImage}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={150}
          />
        ) : (
          <LinearGradient
            colors={eventGradient(event.category?.slug ?? event.category?.name)}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.coverPlaceholder}
          />
        )}
        {!isFree && (
          <View
            style={[
              s.priceBadge,
              { backgroundColor: mode === 'light' ? theme.surface1 : theme.surface2 },
            ]}
          >
            <Text style={[s.priceBadgeText, { color: theme.textSecondary }]}>
              {formatPrice(event.priceInr)}
            </Text>
          </View>
        )}
        {isFree && (
          <View style={[s.priceBadge, { backgroundColor: theme.tealPrimary }]}>
            <Text style={[s.priceBadgeText, { color: theme.onTeal }]}>FREE</Text>
          </View>
        )}
      </View>

      <View style={s.cardContent}>
        {event.category && (
          <View style={[s.categoryPill, { backgroundColor: theme.surface3 }]}>
            <Text style={[s.categoryPillText, { color: theme.textMuted }]}>
              {event.category.name.toUpperCase()}
            </Text>
          </View>
        )}

        <Text style={[s.title, { color: theme.text1 }]} numberOfLines={2}>
          {event.title.toUpperCase()}
        </Text>

        <View style={s.organiserRow}>
          <View
            style={[
              s.organiserAvatar,
              { backgroundColor: theme.surface3, borderColor: theme.tealPrimary },
              isClubOrganiser && { borderRadius: 6, borderColor: theme.purpleHero },
            ]}
          >
            <Text style={[s.organiserAvatarText, { color: theme.text2 }]}>
              {event.organiser.displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={[s.organiserName, { color: theme.text2 }]} numberOfLines={1}>
            {event.organiser.displayName.toUpperCase()}
          </Text>
          <AccountTypeIcon
            type={event.organiser.accountType === 'club' ? 'club' : 'personal'}
            size={14}
            selected
          />
        </View>

        <View style={s.metaRow}>
          <View style={s.metaItem}>
            <CalendarDays size={13} strokeWidth={1.75} color={theme.text3} />
            <Text style={[s.metaText, { color: theme.textMuted }]}>
              {formatEventDate(event.startTime)}
            </Text>
          </View>
          <View style={[s.metaSep, { backgroundColor: theme.border }]} />
          <View style={s.metaItem}>
            <MapPin size={13} strokeWidth={1.75} color={theme.text3} />
            <Text style={[s.metaText, { color: theme.textMuted }]} numberOfLines={1}>
              {event.locationName}
            </Text>
          </View>
        </View>

        <View style={s.cardFooter}>
          <View style={s.goingRow}>
            <Users size={13} strokeWidth={1.75} color={theme.purpleSoft} />
            <Text style={[s.goingText, { color: theme.purpleSoft }]}>
              {Math.max(event.participantCount ?? 0, 1)} going
              {event.maxCapacity ? ` · ${event.maxCapacity} cap` : ''}
            </Text>
          </View>

          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              onRsvp();
            }}
            style={[
              s.rsvpBtn,
              event.isRsvped
                ? { backgroundColor: theme.surface3 }
                : {
                    backgroundColor: theme.tealPrimary,
                    ...Platform.select({
                      ios: {
                        shadowColor: theme.tealPrimary,
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.25,
                        shadowRadius: 12,
                      },
                      android: { elevation: 4 },
                    }),
                  },
            ]}
            accessibilityLabel={event.isRsvped ? 'Leave event' : 'Join event'}
          >
            {event.isRsvped ? (
              <Text style={[s.rsvpText, { color: theme.tealPrimary }]}>JOINED</Text>
            ) : (
              <Text style={[s.rsvpText, { color: theme.onTeal }]}>JOIN →</Text>
            )}
          </Pressable>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function EventsScreen() {
  const { theme, mode, pageBg } = useTheme();
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

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError, refetch } =
    useEvents({
      category: activeCategory === 'all' ? undefined : activeCategory,
      search: debouncedSearch || undefined,
    });

  const { refreshListProps } = useTealRefresh(refetch);
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
          <ActivityIndicator size="large" color={theme.tealPrimary} />
        </View>
      );
    }
    if (isError) {
      return (
        <View style={s.emptyState}>
          <MapPin size={40} strokeWidth={1.5} color={theme.text4} />
          <Text style={[s.emptyTitle, { color: theme.text1 }]}>Couldn't load events</Text>
          <Text style={[s.emptyBody, { color: theme.text3 }]}>
            Check your connection and try again
          </Text>
          <TouchableOpacity
            onPress={() => void refetch()}
            style={[s.retryBtn, { backgroundColor: theme.tealPrimary }]}
            activeOpacity={0.8}
          >
            <Text style={[s.retryText, { color: theme.onTeal }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }
    const isSearchActive = debouncedSearch.length > 0;
    return (
      <View style={s.emptyState}>
        <MapPin size={40} strokeWidth={1.5} color={theme.text4} />
        <Text style={[s.emptyTitle, { color: theme.text1 }]}>
          {isSearchActive ? 'No matching events' : 'No events yet'}
        </Text>
        <Text style={[s.emptyBody, { color: theme.text3 }]}>
          {isSearchActive
            ? 'Try a different keyword or category'
            : 'Be the first — host an event for others to join'}
        </Text>
        <TouchableOpacity
          onPress={() => router.push('/event/create' as never)}
          style={[
            s.createBtn,
            {
              backgroundColor: theme.tealPrimary,
              ...Platform.select({
                ios: {
                  shadowColor: theme.tealPrimary,
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.25,
                  shadowRadius: 16,
                },
                android: { elevation: 6 },
              }),
            },
          ]}
          activeOpacity={0.8}
        >
          <Plus size={16} strokeWidth={2.5} color={theme.onTeal} />
          <Text style={[s.createBtnText, { color: theme.onTeal }]}>Host an event</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderFooter = () =>
    isFetchingNextPage ? (
      <View style={{ paddingVertical: 20, alignItems: 'center' }}>
        <ActivityIndicator size="small" color={theme.tealPrimary} />
      </View>
    ) : null;

  return (
    <View style={[s.root, { backgroundColor: pageBg }]}>
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
          style={{ flex: 1, backgroundColor: pageBg }}
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
          {...refreshListProps}
          contentContainerStyle={{ paddingBottom: SCROLL_BOTTOM_PADDING }}
          showsVerticalScrollIndicator={false}
        />

        <TabBarBottomFade floorColor={pageBg} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },

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
    alignItems: 'center',
    justifyContent: 'center',
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
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 15,
    paddingVertical: 0,
    includeFontPadding: false,
  },
  searchCloseBtn: {
    marginLeft: 2,
    paddingLeft: 6,
    borderLeftWidth: StyleSheet.hairlineWidth,
  },

  filterBarWrapper: { marginBottom: 4 },
  filterBar: {
    paddingHorizontal: 16,
    gap: 8,
    paddingTop: 6,
    paddingBottom: 10,
    alignItems: 'center',
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: radius.card,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipText: {
    fontFamily: fonts.label,
    fontSize: 10,
    letterSpacing: 1,
  },

  card: {
    position: 'relative',
    borderRadius: 20,
    marginHorizontal: 16,
    marginBottom: 12,
    overflow: 'hidden',
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
  organiserTypeText: {
    fontFamily: fonts.label,
    fontSize: 9,
    letterSpacing: 1.2,
  },
  coverArea: {
    height: 160,
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverPlaceholder: {
    flex: 1,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
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
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  priceBadgeText: {
    fontFamily: fonts.label,
    fontSize: 10,
    letterSpacing: 1,
  },
  cardContent: { padding: 16 },
  categoryPill: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 8,
  },
  categoryPillText: {
    fontFamily: fonts.label,
    fontSize: 9,
    letterSpacing: 1.5,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 16,
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
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  organiserAvatarText: {
    fontFamily: fonts.heading,
    fontSize: 10,
  },
  organiserName: {
    fontFamily: fonts.heading,
    fontSize: 11,
    letterSpacing: 0.5,
    flex: 1,
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
  },
  metaText: {
    fontFamily: fonts.caption,
    fontSize: 12,
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
  },
  rsvpBtn: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: radius.sm,
  },
  rsvpText: {
    fontFamily: fonts.button,
    fontSize: 11,
    letterSpacing: 1,
  },

  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontFamily: fonts.h2,
    fontSize: 18,
    marginTop: 16,
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  emptyBody: {
    fontFamily: fonts.body,
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 22,
  },
  retryBtn: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
  },
  retryText: {
    fontFamily: fonts.heading,
    fontSize: 12,
    letterSpacing: 1.5,
  },
  createBtn: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
  },
  createBtnText: {
    fontFamily: fonts.heading,
    fontSize: 12,
    letterSpacing: 1.5,
  },
});
