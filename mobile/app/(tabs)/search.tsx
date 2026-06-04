/**
 * Search Screen — Production build required for the map.
 * react-native-maps does not run in Expo Go (SDK 54+).
 * Build with: npx expo run:ios  or  eas build --profile development
 */
import React, { Component, useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  FlatList,
  Pressable,
  Animated,
  Platform,
  ActivityIndicator,
  Dimensions,
  PanResponder,
  KeyboardAvoidingView,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import {
  Search as SearchIcon,
  X,
  Clock,
  ChevronDown,
  ChevronUp,
  Users,
  Building2,
  Calendar,
  MapPin,
  Dumbbell,
  SlidersHorizontal,
  UserPlus,
  UserCheck,
  ChevronRight,
  Check,
  Map as MapIcon,
} from 'lucide-react-native';
import UserAvatar from '@/components/ui/UserAvatar';
import TabBarBottomFade from '@/components/ui/TabBarBottomFade';
import { colors, fonts, radius, neumorph } from '@/constants/theme';
import {
  useUserSearch,
  usePeopleSearch,
  useClubSearch,
  useEventSearch,
  useMapEvents,
  type SearchFilter,
} from '@/hooks/useSearch';
import { useCategories } from '@/hooks/useEvents';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useSearchHistory } from '@/hooks/useSearchHistory';
import { followUser, unfollowUser } from '@/services/users.service';
import { useAuthStore } from '@/stores/authStore';
import type { UserSummary } from '@/types/user';
import type { Event } from '@/types/event';
import { formatEventDate } from '@/utils/formatDate';

const { height: SCREEN_H } = Dimensions.get('window');

/** City-wide view — easy to see pins without pinching */
const MUMBAI_REGION = {
  latitude: 19.076,
  longitude: 72.8777,
  latitudeDelta: 0.32,
  longitudeDelta: 0.32,
};

/** Greater Mumbai — ignore simulator / overseas GPS (e.g. SF default) */
function isInGreaterMumbai(lat: number, lng: number): boolean {
  return lat >= 18.85 && lat <= 19.35 && lng >= 72.72 && lng <= 73.05;
}

function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Default sheet — shows Events near you + a peek of Recent searches */
const SHEET_PEEK = 348;
const MAX_RECENT_VISIBLE = 8;
const SHEET_MID = 440;
const SHEET_PREVIEW = Math.min(SCREEN_H * 0.58, 520);
const SHEET_FULL = SCREEN_H * 0.78;
const NEARBY_RADIUS_KM = 12;

const ACTIVITY_FILTERS = [
  { slug: 'running', label: 'Running' },
  { slug: 'cycling', label: 'Cycling' },
  { slug: 'yoga_zumba', label: 'Yoga / Zumba' },
  { slug: 'sports_games', label: 'Sports' },
  { slug: 'treks', label: 'Treks' },
  { slug: 'fun_events', label: 'Fun Events' },
  { slug: 'gym', label: 'Gym' },
];

// ── Error boundary — catches native module unavailability in Expo Go ──
interface BoundaryState {
  crashed: boolean;
}
class MapBoundary extends Component<{ children: React.ReactNode }, BoundaryState> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { crashed: false };
  }
  static getDerivedStateFromError(): BoundaryState {
    return { crashed: true };
  }
  render() {
    if (!this.state.crashed) return this.props.children;
    return (
      <LinearGradient colors={['#0E0E14', '#17172A', '#1a1030']} style={StyleSheet.absoluteFill}>
        <View style={fb.center}>
          <MapIcon size={40} strokeWidth={1.25} color={colors.surface3} />
          <Text style={fb.title}>MAP UNAVAILABLE</Text>
          <Text style={fb.sub}>Requires a development or production build</Text>
          <Text style={fb.hint}>Use: npx expo run:ios</Text>
        </View>
      </LinearGradient>
    );
  }
}

// ── Event map pin ─────────────────────────────────────────────
function EventPin({ event, size, selected }: { event: Event; size: number; selected: boolean }) {
  const ringColor = selected ? colors.purpleSoft : colors.purpleHero;
  return (
    <View style={mp.wrap}>
      <View
        style={[
          mp.ring,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: ringColor,
            borderWidth: selected ? 3 : 2.5,
            shadowColor: colors.purpleBrand,
          },
        ]}
      >
        {event.coverImageUrl ? (
          <Image
            source={{ uri: event.coverImageUrl }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
          />
        ) : (
          <View style={mp.fallback}>
            <Calendar size={Math.round(size * 0.38)} strokeWidth={2} color={colors.purpleSoft} />
          </View>
        )}
      </View>
      <View style={[mp.tail, { backgroundColor: ringColor }]} />
    </View>
  );
}

// ── Filter pill ───────────────────────────────────────────────
function FilterPill({
  label,
  active,
  onPress,
  icon,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  icon: React.ReactNode;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[fp.pill, neumorph.glassPill, active && fp.pillActive]}
    >
      {icon}
      <Text style={[fp.label, active && fp.labelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ── User row ──────────────────────────────────────────────────
function UserRow({ item }: { item: UserSummary }) {
  return (
    <TouchableOpacity
      style={sr.row}
      onPress={() => router.push(`/profile/${item.id}` as never)}
      activeOpacity={0.82}
    >
      <UserAvatar name={item.displayName} avatarUrl={item.avatarUrl} size={42} />
      <View style={{ flex: 1 }}>
        <Text style={sr.name}>{item.displayName}</Text>
        <Text style={sr.sub}>@{item.username}</Text>
      </View>
      <View style={sr.badge}>
        <Text style={sr.badgeText}>{item.accountType === 'club' ? 'CLUB' : 'PERSON'}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ── Event row ─────────────────────────────────────────────────
function EventRow({ item }: { item: Event }) {
  return (
    <TouchableOpacity
      style={sr.row}
      onPress={() => router.push(`/event/${item.id}` as never)}
      activeOpacity={0.82}
    >
      <View style={sr.thumb}>
        {item.coverImageUrl ? (
          <Image
            source={{ uri: item.coverImageUrl }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
          />
        ) : (
          <Calendar size={20} strokeWidth={1.5} color={colors.tealPrimary} />
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={sr.name} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={sr.sub}>{formatEventDate(item.startTime)}</Text>
        <Text style={sr.sub} numberOfLines={1}>
          {item.locationName}
        </Text>
      </View>
      <View style={[sr.badge, sr.eventBadge]}>
        <Text style={sr.badgeText}>EVENT</Text>
      </View>
    </TouchableOpacity>
  );
}

// ── Event preview card ────────────────────────────────────────
function EventPreviewCard({ event, onDismiss }: { event: Event; onDismiss: () => void }) {
  const myId = useAuthStore((s) => s.user?.id);
  const isOwn = myId === event.organiser.id;
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  const handleFollow = async () => {
    if (followLoading || isOwn) return;
    setFollowLoading(true);
    try {
      if (following) {
        await unfollowUser(event.organiser.id);
        setFollowing(false);
      } else {
        await followUser(event.organiser.id);
        setFollowing(true);
      }
    } catch {
      /* silent */
    } finally {
      setFollowLoading(false);
    }
  };

  const isFree = !event.priceInr || event.priceInr === 0;

  return (
    <View style={pc.card}>
      {/* Banner */}
      <TouchableOpacity
        onPress={() => router.push(`/event/${event.id}` as never)}
        activeOpacity={0.92}
      >
        {event.coverImageUrl ? (
          <Image source={{ uri: event.coverImageUrl }} style={pc.banner} contentFit="cover" />
        ) : (
          <LinearGradient colors={['#1a1030', '#2a1860']} style={pc.banner}>
            <Calendar size={36} strokeWidth={1.5} color={colors.tealPrimary} />
          </LinearGradient>
        )}

        {event.status === 'live' && (
          <View style={pc.liveBadge}>
            <View style={pc.liveDot} />
            <Text style={pc.liveBadgeText}>LIVE</Text>
          </View>
        )}
        <View style={[pc.pricePill, isFree && pc.freePill]}>
          <Text style={[pc.priceText, isFree && pc.freeText]}>
            {isFree ? 'FREE' : `₹${Math.round((event.priceInr ?? 0) / 100)}`}
          </Text>
        </View>
        <Pressable onPress={onDismiss} hitSlop={8} style={pc.closeBtn}>
          <X size={15} strokeWidth={2.5} color="#fff" />
        </Pressable>
      </TouchableOpacity>

      {/* Organiser */}
      <View style={pc.orgRow}>
        <View style={pc.avatarRing}>
          <UserAvatar
            name={event.organiser.displayName}
            avatarUrl={event.organiser.avatarUrl}
            size={44}
            ring
          />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={pc.orgName} numberOfLines={1}>
            {event.organiser.displayName}
          </Text>
          <Text style={pc.orgType}>
            {event.organiser.accountType === 'club' ? 'CLUB' : 'ATHLETE'}
          </Text>
        </View>
        {!isOwn && (
          <TouchableOpacity
            onPress={() => void handleFollow()}
            style={[pc.followBtn, following && pc.followingBtn]}
            disabled={followLoading}
            activeOpacity={0.8}
          >
            {followLoading ? (
              <ActivityIndicator
                size="small"
                color={following ? colors.tealPrimary : colors.onTeal}
              />
            ) : following ? (
              <>
                <UserCheck size={13} strokeWidth={2.5} color={colors.tealPrimary} />
                <Text style={[pc.followText, { color: colors.tealPrimary }]}>Following</Text>
              </>
            ) : (
              <>
                <UserPlus size={13} strokeWidth={2.5} color={colors.onTeal} />
                <Text style={pc.followText}>Follow</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Title */}
      <Text style={pc.title} numberOfLines={2}>
        {event.title}
      </Text>

      {/* Meta */}
      <View style={pc.metaRow}>
        <View style={pc.metaItem}>
          <MapPin size={13} strokeWidth={2} color={colors.tealPrimary} />
          <Text style={pc.metaText} numberOfLines={1}>
            {event.locationName}
          </Text>
        </View>
        <View style={pc.metaItem}>
          <Calendar size={13} strokeWidth={2} color={colors.purpleSoft} />
          <Text style={pc.metaText}>{formatEventDate(event.startTime)}</Text>
        </View>
      </View>

      {/* Footer */}
      <View style={pc.footer}>
        {event.category && (
          <View style={pc.catTag}>
            <Text style={pc.catText}>{event.category.name.toUpperCase()}</Text>
          </View>
        )}
        {event.participantCount !== null && (
          <View style={pc.partTag}>
            <Users size={11} strokeWidth={2} color={colors.textMuted} />
            <Text style={pc.partText}>{event.participantCount} joined</Text>
          </View>
        )}
        <TouchableOpacity
          onPress={() => router.push(`/event/${event.id}` as never)}
          style={pc.openBtn}
          activeOpacity={0.8}
        >
          <Text style={pc.openText}>View Event</Text>
          <ChevronRight size={13} strokeWidth={2.5} color={colors.onTeal} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────
export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const hasFittedEventsRef = useRef(false);

  const [region, setRegion] = useState(MUMBAI_REGION);
  const [locationGranted, setLocationGranted] = useState(false);
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(
    null,
  );
  const [latDelta, setLatDelta] = useState(MUMBAI_REGION.latitudeDelta);

  const centerOnMumbai = useCallback(() => {
    setRegion(MUMBAI_REGION);
    setLatDelta(MUMBAI_REGION.latitudeDelta);
    mapRef.current?.animateToRegion(MUMBAI_REGION, 500);
  }, []);

  const centerOnUser = useCallback((latitude: number, longitude: number) => {
    const r = { latitude, longitude, latitudeDelta: 0.09, longitudeDelta: 0.09 };
    setRegion(r);
    setLatDelta(0.09);
    mapRef.current?.animateToRegion(r, 600);
  }, []);

  // Open on Mumbai; only auto-follow GPS when in Greater Mumbai (not simulator SF)
  useEffect(() => {
    const t = setTimeout(() => mapRef.current?.animateToRegion(MUMBAI_REGION, 0), 100);
    void (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        setLocationGranted(true);
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const { latitude, longitude } = loc.coords;
        setUserCoords({ latitude, longitude });
        if (!isInGreaterMumbai(latitude, longitude)) return;
        centerOnUser(latitude, longitude);
      } catch {
        /* permission denied */
      }
    })();
    return () => clearTimeout(t);
  }, [centerOnUser]);

  // Search
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<SearchFilter>('all');
  const [activitySlugs, setActivitySlugs] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [focused, setFocused] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  const dQ = useDebouncedValue(query, 320);
  const { history, addToHistory, removeFromHistory, clearHistory } = useSearchHistory();
  const isSearching = dQ.trim().length > 0;

  // Data hooks
  const { data: userRes = [], isFetching: fU } = useUserSearch(
    filter === 'all' || filter === 'people' ? dQ : '',
  );
  const { data: clubRes = [], isFetching: fC } = useClubSearch(filter === 'clubs' ? dQ : '');
  const { data: peopleRes = [], isFetching: fP } = usePeopleSearch(filter === 'people' ? dQ : '');
  const activityFilter = activitySlugs.length > 0 ? activitySlugs : undefined;
  const { data: evPage, isFetching: fE } = useEventSearch(
    filter === 'all' || filter === 'events' ? dQ : '',
    activityFilter,
  );
  const evRes: Event[] = evPage?.data ?? [];
  const { data: mapPage } = useMapEvents(activityFilter);
  const mapEvents: Event[] = mapPage?.data ?? [];

  const mapEventsWithCoords = useMemo(
    () =>
      mapEvents.filter((ev) => {
        const lat = parseFloat(ev.latitude);
        const lng = parseFloat(ev.longitude);
        return !Number.isNaN(lat) && !Number.isNaN(lng);
      }),
    [mapEvents],
  );

  const eventsNearYou = useMemo(() => {
    if (!userCoords) return mapEventsWithCoords;
    return mapEventsWithCoords
      .map((ev) => {
        const lat = parseFloat(ev.latitude);
        const lng = parseFloat(ev.longitude);
        return { ev, km: distanceKm(userCoords.latitude, userCoords.longitude, lat, lng) };
      })
      .filter(({ km }) => km <= NEARBY_RADIUS_KM)
      .sort((a, b) => a.km - b.km)
      .map(({ ev }) => ev);
  }, [mapEventsWithCoords, userCoords]);

  const mapPins: Event[] = filter === 'location' ? eventsNearYou : mapEventsWithCoords;
  const sheetEvents: Event[] = eventsNearYou.length > 0 ? eventsNearYou : mapEventsWithCoords;

  useEffect(() => {
    hasFittedEventsRef.current = false;
  }, [activitySlugs, filter]);

  // Frame event pins once when they load (keeps map on Mumbai, not simulator SF)
  useEffect(() => {
    if (hasFittedEventsRef.current || mapPins.length === 0) return;
    const coords = mapPins
      .map((ev) => ({
        latitude: parseFloat(ev.latitude),
        longitude: parseFloat(ev.longitude),
      }))
      .filter(
        (c) =>
          !Number.isNaN(c.latitude) &&
          !Number.isNaN(c.longitude) &&
          isInGreaterMumbai(c.latitude, c.longitude),
      );
    if (coords.length === 0) return;
    hasFittedEventsRef.current = true;
    const id = setTimeout(() => {
      mapRef.current?.fitToCoordinates(coords, {
        edgePadding: { top: insets.top + 100, right: 48, bottom: SHEET_PEEK + 48, left: 48 },
        animated: true,
      });
    }, 400);
    return () => clearTimeout(id);
  }, [mapPins, insets.top]);

  const pinSize = useMemo(() => {
    const t = 1 - (Math.max(0.02, Math.min(0.5, latDelta)) - 0.02) / 0.48;
    return Math.round(28 + t * 24);
  }, [latDelta]);

  const displayResults = useMemo(() => {
    if (filter === 'people') return { users: peopleRes, events: [] as Event[] };
    if (filter === 'clubs') return { users: clubRes, events: [] as Event[] };
    if (filter === 'events') return { users: [], events: evRes };
    if (filter === 'location') {
      const q = dQ.trim().toLowerCase();
      const nearby = q
        ? eventsNearYou.filter(
            (e) => e.title.toLowerCase().includes(q) || e.locationName.toLowerCase().includes(q),
          )
        : eventsNearYou;
      return { users: [], events: nearby };
    }
    return { users: userRes, events: evRes };
  }, [filter, peopleRes, clubRes, evRes, userRes, eventsNearYou, dQ]);

  const fetching = fU || fC || fP || fE;
  const hasResults = displayResults.users.length > 0 || displayResults.events.length > 0;

  // Bottom sheet
  const sheetAnim = useRef(new Animated.Value(SHEET_PEEK)).current;
  const lastH = useRef(SHEET_PEEK);

  const snap = useCallback(
    (h: number) => {
      lastH.current = h;
      Animated.spring(sheetAnim, { toValue: h, useNativeDriver: false, bounciness: 2 }).start();
    },
    [sheetAnim],
  );

  const snapRef = useRef(snap);
  useEffect(() => {
    snapRef.current = snap;
  }, [snap]);

  const applyFilter = useCallback(
    (next: SearchFilter) => {
      Keyboard.dismiss();
      setShowDropdown(false);
      setSelectedEvent(null);
      setFilter(next);
      if (next === 'location') {
        if (userCoords && isInGreaterMumbai(userCoords.latitude, userCoords.longitude)) {
          centerOnUser(userCoords.latitude, userCoords.longitude);
        } else {
          centerOnMumbai();
        }
        snapRef.current(SHEET_PEEK);
      }
    },
    [userCoords, centerOnUser, centerOnMumbai],
  );

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 4,
      onPanResponderMove: (_, g) => {
        sheetAnim.setValue(Math.max(SHEET_PEEK, Math.min(SHEET_FULL, lastH.current - g.dy)));
      },
      onPanResponderRelease: (_, g) => {
        const h = lastH.current - g.dy;
        const v = -g.vy;
        if (v > 0.5 || h > SHEET_MID + 80) snapRef.current(SHEET_FULL);
        else if (h > SHEET_PEEK + 80 || (v > 0.2 && h > SHEET_PEEK)) snapRef.current(SHEET_MID);
        else snapRef.current(SHEET_PEEK);
      },
    }),
  ).current;

  useEffect(() => {
    if (focused || isSearching) {
      setSelectedEvent(null);
      snap(SHEET_MID);
    }
  }, [focused, isSearching, snap]);

  useEffect(() => {
    if (hasResults && isSearching) snap(SHEET_FULL);
  }, [hasResults, isSearching, snap]);

  const openEventPreview = useCallback(
    (ev: Event) => {
      Keyboard.dismiss();
      setFocused(false);
      setShowDropdown(false);
      setSelectedEvent(ev);
      setQuery('');
      snap(SHEET_PREVIEW);
      const lat = parseFloat(ev.latitude);
      const lng = parseFloat(ev.longitude);
      if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
        mapRef.current?.animateToRegion(
          { latitude: lat, longitude: lng, latitudeDelta: 0.06, longitudeDelta: 0.06 },
          400,
        );
      }
    },
    [snap],
  );

  const dismissPreview = useCallback(() => {
    setSelectedEvent(null);
    snap(SHEET_PEEK);
  }, [snap]);

  const { data: categories = [] } = useCategories();
  const activityOpts = useMemo(
    () =>
      categories.length > 0
        ? categories.map((c) => ({ slug: c.slug, label: c.name }))
        : ACTIVITY_FILTERS,
    [categories],
  );
  const activityLabel = useMemo(() => {
    if (activitySlugs.length === 0) return 'Activity';
    if (activitySlugs.length === 1) {
      return activityOpts.find((a) => a.slug === activitySlugs[0])?.label ?? 'Activity';
    }
    const first = activityOpts.find((a) => a.slug === activitySlugs[0])?.label ?? 'Activity';
    return `${first} +${activitySlugs.length - 1}`;
  }, [activitySlugs, activityOpts]);

  const toggleActivitySlug = useCallback((slug: string) => {
    setActivitySlugs((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug],
    );
    hasFittedEventsRef.current = false;
  }, []);

  const clearActivitySlugs = useCallback(() => {
    setActivitySlugs([]);
    hasFittedEventsRef.current = false;
  }, []);

  return (
    <View style={s.root}>
      {/* ── Map ───────────────────────────────────────────── */}
      <MapBoundary>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          initialRegion={MUMBAI_REGION}
          showsUserLocation={locationGranted}
          showsMyLocationButton={false}
          showsCompass={false}
          zoomEnabled
          scrollEnabled
          rotateEnabled={false}
          pitchEnabled={false}
          customMapStyle={Platform.OS === 'android' ? DARK_MAP : []}
          onRegionChangeComplete={(r) => {
            setLatDelta(r.latitudeDelta);
            setRegion(r);
          }}
          onPress={() => {
            Keyboard.dismiss();
            setShowDropdown(false);
            setSelectedEvent(null);
            snap(SHEET_PEEK);
          }}
        >
          {mapPins.map((ev) => {
            const lat = parseFloat(ev.latitude);
            const lng = parseFloat(ev.longitude);
            const selected = selectedEvent?.id === ev.id;
            const touchW = pinSize + 16;
            const touchH = pinSize + 20;
            return (
              <Marker
                key={ev.id}
                coordinate={{ latitude: lat, longitude: lng }}
                tracksViewChanges={selected}
                anchor={{ x: 0.5, y: 1 }}
                onPress={(e) => {
                  e.stopPropagation();
                  openEventPreview(ev);
                }}
              >
                <View
                  style={{
                    width: touchW,
                    height: touchH,
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                  }}
                >
                  <EventPin event={ev} size={pinSize} selected={selected} />
                </View>
              </Marker>
            );
          })}
        </MapView>
      </MapBoundary>

      {/* ── Overlay: search bar + filters ─────────────────── */}
      <View style={s.overlay}>
        <LinearGradient
          pointerEvents="none"
          colors={[
            colors.bgPrimary,
            'rgba(14,14,20,0.7)',
            'rgba(14,14,20,0.34)',
            'rgba(14,14,20,0)',
          ]}
          locations={[0, 0.38, 0.72, 1]}
          style={s.overlayScrim}
        />
        <View style={[s.overlayContent, { paddingTop: insets.top + 10 }]}>
          {/* Search bar */}
          <View style={[s.searchBar, neumorph.glass, focused && neumorph.glassFocus]}>
            <SearchIcon
              size={18}
              strokeWidth={1.75}
              color={focused ? colors.tealPrimary : colors.textMuted}
            />
            <TextInput
              style={s.input}
              placeholder="Search people, events, clubs..."
              placeholderTextColor={colors.textMuted}
              value={query}
              onChangeText={(t) => {
                setQuery(t);
                setSelectedEvent(null);
              }}
              onFocus={() => setFocused(true)}
              onBlur={() => {
                setFocused(false);
                const trimmed = query.trim();
                if (trimmed.length >= 1) addToHistory(trimmed);
              }}
              onSubmitEditing={() => {
                const trimmed = query.trim();
                if (trimmed.length >= 1) addToHistory(trimmed);
                Keyboard.dismiss();
              }}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />
            {fetching ? (
              <ActivityIndicator size="small" color={colors.tealPrimary} />
            ) : query.length > 0 ? (
              <Pressable
                onPress={() => {
                  setQuery('');
                  Keyboard.dismiss();
                  snap(SHEET_PEEK);
                }}
                hitSlop={10}
              >
                <View style={s.clearBtn}>
                  <X size={12} strokeWidth={2.5} color={colors.textPrimary} />
                </View>
              </Pressable>
            ) : null}
          </View>

          {/* Filter pills — All, then Activity */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.pills}
            keyboardShouldPersistTaps="handled"
          >
            <FilterPill
              label="All"
              active={filter === 'all'}
              onPress={() => applyFilter('all')}
              icon={
                <SlidersHorizontal
                  size={12}
                  strokeWidth={2}
                  color={filter === 'all' ? colors.onTeal : colors.textMuted}
                />
              }
            />

            <TouchableOpacity
              onPress={() => {
                setShowDropdown((v) => !v);
                Keyboard.dismiss();
              }}
              activeOpacity={0.8}
              style={[fp.pill, neumorph.glassPill, activitySlugs.length > 0 && fp.pillActive]}
            >
              <Dumbbell
                size={12}
                strokeWidth={2}
                color={activitySlugs.length > 0 ? colors.onTeal : colors.textMuted}
              />
              <Text
                style={[
                  fp.label,
                  activitySlugs.length > 0 && fp.labelActive,
                  { marginLeft: 5, maxWidth: 120 },
                ]}
                numberOfLines={1}
              >
                {activityLabel}
              </Text>
              {showDropdown ? (
                <ChevronUp
                  size={12}
                  strokeWidth={2.5}
                  color={activitySlugs.length > 0 ? colors.onTeal : colors.textMuted}
                  style={{ marginLeft: 2 }}
                />
              ) : (
                <ChevronDown
                  size={12}
                  strokeWidth={2.5}
                  color={activitySlugs.length > 0 ? colors.onTeal : colors.textMuted}
                  style={{ marginLeft: 2 }}
                />
              )}
            </TouchableOpacity>
            <FilterPill
              label="People"
              active={filter === 'people'}
              onPress={() => applyFilter('people')}
              icon={
                <Users
                  size={12}
                  strokeWidth={2}
                  color={filter === 'people' ? colors.onTeal : colors.textMuted}
                />
              }
            />
            <FilterPill
              label="Clubs"
              active={filter === 'clubs'}
              onPress={() => applyFilter('clubs')}
              icon={
                <Building2
                  size={12}
                  strokeWidth={2}
                  color={filter === 'clubs' ? colors.onTeal : colors.textMuted}
                />
              }
            />
            <FilterPill
              label="Events"
              active={filter === 'events'}
              onPress={() => applyFilter('events')}
              icon={
                <Calendar
                  size={12}
                  strokeWidth={2}
                  color={filter === 'events' ? colors.onTeal : colors.textMuted}
                />
              }
            />
            <FilterPill
              label="Near me"
              active={filter === 'location'}
              onPress={() => applyFilter('location')}
              icon={
                <MapPin
                  size={12}
                  strokeWidth={2}
                  color={filter === 'location' ? colors.onTeal : colors.textMuted}
                />
              }
            />
          </ScrollView>

          {showDropdown && (
            <View style={[s.dropdown, neumorph.glassPanel]}>
              <View style={s.dropHeader}>
                <Text style={s.dropHeaderText}>Select activities</Text>
                {activitySlugs.length > 0 && (
                  <Pressable onPress={clearActivitySlugs} hitSlop={8}>
                    <Text style={s.histClear}>Clear</Text>
                  </Pressable>
                )}
              </View>
              {activityOpts.map((a) => {
                const selected = activitySlugs.includes(a.slug);
                return (
                  <TouchableOpacity
                    key={a.slug}
                    style={[s.dropItem, s.dropItemRow, selected && s.dropItemOn]}
                    onPress={() => toggleActivitySlug(a.slug)}
                    activeOpacity={0.8}
                  >
                    <Text style={[s.dropText, selected && s.dropTextOn, { flex: 1 }]}>
                      {a.label}
                    </Text>
                    {selected ? (
                      <Check size={16} strokeWidth={2.5} color={colors.tealPrimary} />
                    ) : (
                      <View style={s.dropCheckEmpty} />
                    )}
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity
                style={s.dropDone}
                onPress={() => setShowDropdown(false)}
                activeOpacity={0.85}
              >
                <Text style={s.dropDoneText}>Done</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* ── Bottom sheet ──────────────────────────────────── */}
      <Animated.View style={[s.sheet, { height: sheetAnim }]}>
        <View {...pan.panHandlers} style={s.handleArea}>
          <View style={s.handleBar} />
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {selectedEvent ? (
            <ScrollView
              contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: insets.bottom + 20 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={s.previewLabel}>EVENT PREVIEW</Text>
              <EventPreviewCard event={selectedEvent} onDismiss={dismissPreview} />
            </ScrollView>
          ) : !isSearching ? (
            <ScrollView
              style={s.histScroll}
              contentContainerStyle={s.histScrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
            >
              {sheetEvents.length > 0 && (
                <View style={s.nearbySection}>
                  <Text style={s.nearbyTitle}>EVENTS NEAR YOU</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={s.nearbyScroll}
                    keyboardShouldPersistTaps="handled"
                    nestedScrollEnabled
                  >
                    {sheetEvents.slice(0, 12).map((ev: Event) => (
                      <TouchableOpacity
                        key={ev.id}
                        style={s.nearbyChip}
                        onPress={() => openEventPreview(ev)}
                        activeOpacity={0.85}
                      >
                        {ev.coverImageUrl ? (
                          <Image
                            source={{ uri: ev.coverImageUrl }}
                            style={s.nearbyChipImg}
                            contentFit="cover"
                          />
                        ) : (
                          <View style={[s.nearbyChipImg, s.nearbyChipFallback]}>
                            <Calendar size={18} strokeWidth={1.5} color={colors.goldLight} />
                          </View>
                        )}
                        <Text style={s.nearbyChipTitle} numberOfLines={2}>
                          {ev.title}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              <View style={s.histHeader}>
                <Text style={s.histTitle}>RECENT SEARCHES</Text>
                {history.length > 0 && (
                  <Pressable onPress={clearHistory} hitSlop={8}>
                    <Text style={s.histClear}>Clear all</Text>
                  </Pressable>
                )}
              </View>
              {history.length === 0 ? (
                <View style={s.emptyHist}>
                  <Clock
                    size={26}
                    strokeWidth={1.5}
                    color={colors.textMuted}
                    style={{ opacity: 0.4 }}
                  />
                  <Text style={s.emptyHistText}>
                    Search for people, clubs, or events — they’ll show up here
                  </Text>
                </View>
              ) : (
                history.slice(0, MAX_RECENT_VISIBLE).map((term) => (
                  <TouchableOpacity
                    key={term}
                    style={s.histRow}
                    onPress={() => {
                      setQuery(term);
                      setSelectedEvent(null);
                      addToHistory(term);
                      snap(SHEET_MID);
                    }}
                    activeOpacity={0.8}
                  >
                    <Clock size={15} strokeWidth={1.75} color={colors.textMuted} />
                    <Text style={s.histRowText}>{term}</Text>
                    <TouchableOpacity
                      onPress={() => removeFromHistory(term)}
                      hitSlop={12}
                      activeOpacity={0.7}
                    >
                      <X size={14} strokeWidth={2} color={colors.textMuted} />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          ) : (
            /* Search results */
            <FlatList
              data={[
                ...(displayResults.users as Array<UserSummary | Event>),
                ...displayResults.events,
              ]}
              keyExtractor={(item) => ('username' in item ? `u-${item.id}` : `e-${item.id}`)}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={s.results}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                fetching ? (
                  <ActivityIndicator color={colors.tealPrimary} style={{ marginTop: 32 }} />
                ) : (
                  <View style={s.emptyRes}>
                    <SearchIcon
                      size={30}
                      strokeWidth={1.5}
                      color={colors.textMuted}
                      style={{ opacity: 0.4 }}
                    />
                    <Text style={s.emptyResText}>No results for "{dQ}"</Text>
                  </View>
                )
              }
              renderItem={({ item }) =>
                'username' in item ? <UserRow item={item} /> : <EventRow item={item as Event} />
              }
            />
          )}
        </KeyboardAvoidingView>
      </Animated.View>

      <TabBarBottomFade />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0e0e14' },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  overlayScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 188,
  },
  overlayContent: { paddingHorizontal: 14 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.full,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 13 : 10,
    gap: 10,
    marginBottom: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: fonts.body,
    color: colors.textPrimary,
    includeFontPadding: false,
    padding: 0,
  },
  clearBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(31, 31, 56, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(100, 92, 150, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pills: { flexDirection: 'row', gap: 8, paddingRight: 16, paddingBottom: 4 },
  dropdown: {
    marginTop: 8,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  dropHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.surface3,
  },
  dropHeaderText: {
    fontFamily: fonts.label,
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: 0.8,
  },
  dropItem: {
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.surface3,
  },
  dropItemRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dropItemOn: { backgroundColor: 'rgba(0,229,195,0.1)' },
  dropCheckEmpty: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.surface3,
  },
  dropText: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary },
  dropTextOn: { color: colors.tealPrimary, fontFamily: fonts.bodyStrong },
  dropDone: {
    marginHorizontal: 14,
    marginVertical: 12,
    paddingVertical: 11,
    borderRadius: radius.full,
    backgroundColor: colors.tealPrimary,
    alignItems: 'center',
  },
  dropDoneText: { fontFamily: fonts.bodyStrong, fontSize: 13, color: colors.onTeal },

  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 8,
    backgroundColor: 'rgba(17,17,26,0.97)',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: 1,
    borderColor: 'rgba(0,229,195,0.08)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 24,
  },
  handleArea: { alignItems: 'center', paddingTop: 12, paddingBottom: 8 },
  handleBar: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.surface3 },

  histScroll: { flex: 1 },
  histScrollContent: { paddingHorizontal: 16, paddingBottom: 12 },
  histHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingTop: 4,
  },
  histTitle: { fontFamily: fonts.label, fontSize: 11, color: colors.textMuted, letterSpacing: 1 },
  histClear: { fontFamily: fonts.bodyStrong, fontSize: 12, color: colors.purpleSoft },
  histRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.surface3,
  },
  histRowText: { flex: 1, fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary },
  previewLabel: {
    fontFamily: fonts.label,
    fontSize: 11,
    color: colors.tealPrimary,
    letterSpacing: 1,
    marginBottom: 10,
    marginTop: 4,
  },
  nearbyTitle: {
    fontFamily: fonts.label,
    fontSize: 11,
    color: colors.goldLight,
    letterSpacing: 1,
    marginBottom: 4,
  },
  nearbySection: { marginBottom: 12 },
  nearbyScroll: { gap: 10, paddingRight: 8, paddingTop: 6 },
  nearbyChip: {
    width: 120,
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.gold,
    overflow: 'hidden',
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  nearbyChipSelected: {
    borderColor: colors.goldLight,
    shadowColor: colors.gold,
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 6,
  },
  nearbyChipImg: { width: '100%', height: 72 },
  nearbyChipFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface1,
  },
  nearbyChipTitle: {
    fontFamily: fonts.bodyStrong,
    fontSize: 11,
    color: colors.textSecondary,
    paddingHorizontal: 8,
    paddingVertical: 8,
    lineHeight: 14,
  },
  emptyHist: { alignItems: 'center', paddingTop: 28, gap: 10 },
  emptyHistText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
  },

  results: { paddingHorizontal: 16, paddingBottom: 40 },
  emptyRes: { alignItems: 'center', paddingTop: 40, gap: 12 },
  emptyResText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
});

const fp = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
    gap: 5,
  },
  pillActive: {
    backgroundColor: colors.tealPrimary,
    borderColor: colors.tealPrimary,
    opacity: 1,
    ...Platform.select({
      ios: {
        shadowColor: colors.tealPrimary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.16,
        shadowRadius: 4,
      },
      android: { elevation: 0 },
    }),
  },
  label: {
    fontFamily: fonts.bodyStrong,
    fontSize: 12,
    color: colors.textMuted,
    letterSpacing: 0.2,
  },
  labelActive: { color: colors.onTeal },
});

const sr = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.surface3,
  },
  name: { fontFamily: fonts.bodyStrong, fontSize: 14, color: colors.textPrimary },
  sub: { fontFamily: fonts.caption, fontSize: 12, color: colors.textMuted, marginTop: 2 },
  badge: {
    backgroundColor: colors.surface3,
    borderRadius: radius.xs,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  eventBadge: { backgroundColor: 'rgba(0,229,195,0.1)' },
  badgeText: { fontFamily: fonts.label, fontSize: 9, color: colors.textMuted, letterSpacing: 0.5 },
  thumb: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});

const mp = StyleSheet.create({
  wrap: { alignItems: 'center' },
  ring: {
    overflow: 'hidden',
    backgroundColor: colors.surface2,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.55,
    shadowRadius: 8,
    elevation: 8,
  },
  fallback: {
    flex: 1,
    backgroundColor: colors.surface1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tail: { width: 2.5, height: 8, borderRadius: 2, marginTop: -1 },
});

const pc = StyleSheet.create({
  card: {
    backgroundColor: colors.surface1,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(0,229,195,0.12)',
    overflow: 'hidden',
  },
  banner: { width: '100%', height: 160, alignItems: 'center', justifyContent: 'center' },
  liveBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,77,109,0.9)',
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' },
  liveBadgeText: { fontFamily: fonts.label, fontSize: 10, color: '#fff', letterSpacing: 1 },
  pricePill: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: radius.xs,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  freePill: {
    backgroundColor: 'rgba(0,229,195,0.18)',
    borderWidth: 1,
    borderColor: colors.tealPrimary,
  },
  priceText: {
    fontFamily: fonts.label,
    fontSize: 11,
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
  freeText: { color: colors.tealPrimary },
  closeBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orgRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 6,
    gap: 10,
  },
  avatarRing: {
    borderRadius: 24,
    borderWidth: 2,
    borderColor: colors.tealPrimary,
    overflow: 'hidden',
  },
  orgName: { fontFamily: fonts.bodyStrong, fontSize: 14, color: colors.textPrimary },
  orgType: {
    fontFamily: fonts.label,
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: 0.8,
    marginTop: 2,
  },
  followBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.tealPrimary,
    borderRadius: radius.full,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  followingBtn: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.tealPrimary },
  followText: { fontFamily: fonts.bodyStrong, fontSize: 12, color: colors.onTeal },
  title: {
    fontFamily: fonts.h2,
    fontSize: 16,
    color: colors.textPrimary,
    paddingHorizontal: 14,
    paddingBottom: 10,
    lineHeight: 22,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 14,
    paddingBottom: 10,
    flexWrap: 'wrap',
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1, minWidth: 120 },
  metaText: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, flex: 1 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingBottom: 14,
    flexWrap: 'wrap',
  },
  catTag: {
    backgroundColor: colors.surface3,
    borderRadius: radius.xs,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  catText: { fontFamily: fonts.label, fontSize: 10, color: colors.purpleSoft, letterSpacing: 0.5 },
  partTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface2,
    borderRadius: radius.xs,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  partText: { fontFamily: fonts.caption, fontSize: 11, color: colors.textMuted },
  openBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 'auto',
    backgroundColor: colors.tealPrimary,
    borderRadius: radius.full,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  openText: { fontFamily: fonts.bodyStrong, fontSize: 12, color: colors.onTeal },
});

const fb = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  title: { fontFamily: fonts.h2, fontSize: 14, color: colors.surface3, letterSpacing: 2 },
  sub: { fontFamily: fonts.body, fontSize: 13, color: colors.surface3 },
  hint: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted },
});

// Dark map JSON (Android / Google Maps only)
const DARK_MAP = [
  { elementType: 'geometry', stylers: [{ color: '#0e0e14' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#7a74a8' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0e0e14' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#1a1a2e' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1f1f38' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#2a2a48' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#a882ff' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0a0a14' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#3d3d5c' }] },
];
