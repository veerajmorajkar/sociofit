import { type ReactNode } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  MapPin,
  Clock,
  CalendarDays,
  Users,
  MessageCircle,
  MessagesSquare,
} from 'lucide-react-native';
import { useEventDetail, useEventParticipants, useRsvpEvent } from '@/hooks/useEvents';
import { useStartDm } from '@/hooks/useMessages';
import { useHeroNavTone } from '@/hooks/useHeroNavTone';
import { useAuthStore } from '@/stores/authStore';
import UserAvatar from '@/components/ui/UserAvatar';
import { darkTheme, fonts, radius, shadows, eventGradient } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import {
  formatEventDateTimePill,
  formatEventDetailDate,
  formatEventTime,
  formatPrice,
} from '@/utils/formatDate';
import { navInkForTone, type HeroNavTone } from '@/utils/heroTone';
import { categoryPillTheme } from '@/utils/categoryStyle';
import type { EventParticipant } from '@/services/events.service';
import ContentActionsMenu from '@/components/moderation/ContentActionsMenu';
import { accountTypeBadgeLabel } from '@/constants/accountType';
import AccountTypeIcon from '@/components/auth/AccountTypeIcon';

const HERO_HEIGHT = Math.min(Dimensions.get('window').height * 0.54, 440);
/** Outer glass pill wraps the join button with equal inset on every side. */
const JOIN_BTN_HEIGHT = 46;
const FOOTER_PILL_INSET = 9;
const FOOTER_PILL_HEIGHT = JOIN_BTN_HEIGHT + FOOTER_PILL_INSET * 2;
const MEMBER_AVATAR_SIZE = 32;
const FOOTER_HEIGHT = FOOTER_PILL_HEIGHT + 28;

const FADE_LOCATIONS = [0, 0.22, 0.42, 0.52, 0.62, 0.72, 0.82, 0.9, 0.96, 1] as const;
const FADE_OPACITIES = [0, 0, 0, 0.03, 0.12, 0.28, 0.52, 0.78, 0.94] as const;
const ACCENT_LOCATIONS = [0, 0.55, 0.78, 1] as const;
const FEATHER_LOCATIONS = [0.88, 0.96, 1] as const;

/** Convert a #RRGGBB hex to "R,G,B" for rgba() strings. */
function hexToRgb(hex: string): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return '0,0,0';
  return `${parseInt(m[1]!, 16)},${parseInt(m[2]!, 16)},${parseInt(m[3]!, 16)}`;
}

function fadeStops(rgb: string, floor: string) {
  return [...FADE_OPACITIES.map((a) => `rgba(${rgb},${a})`), floor] as [
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
  ];
}

/** Hero fade — same multi-stop technique in both modes; ink matches page background colour. */
function HeroFadeOverlay() {
  const { mode, theme, pageBg } = useTheme();
  const floor = mode === 'light' ? pageBg : darkTheme.bgPrimary;
  const ink = hexToRgb(floor);

  return (
    <>
      <LinearGradient
        pointerEvents="none"
        colors={fadeStops(ink, floor)}
        locations={[...FADE_LOCATIONS]}
        style={StyleSheet.absoluteFill}
      />
      {mode === 'dark' ? (
        <LinearGradient
          pointerEvents="none"
          colors={
            ['transparent', 'transparent', 'rgba(91,46,204,0.05)', 'rgba(0,229,195,0.03)'] as [
              string,
              string,
              string,
              string,
            ]
          }
          locations={[...ACCENT_LOCATIONS]}
          start={{ x: 0, y: 1 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <LinearGradient
          pointerEvents="none"
          colors={
            ['transparent', 'transparent', 'rgba(91,46,204,0.06)', 'rgba(0,200,172,0.04)'] as [
              string,
              string,
              string,
              string,
            ]
          }
          locations={[...ACCENT_LOCATIONS]}
          start={{ x: 0, y: 1 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      )}
      {mode === 'dark' ? (
        <LinearGradient
          pointerEvents="none"
          colors={['transparent', `rgba(${ink},0.25)`, floor]}
          locations={[...FEATHER_LOCATIONS]}
          style={s.heroBottomFeather}
        />
      ) : null}
    </>
  );
}

function GlassIconButton({
  onPress,
  accessibilityLabel,
  tone,
  children,
}: {
  onPress: () => void;
  accessibilityLabel: string;
  tone: HeroNavTone;
  children: ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      style={({ pressed }) => [
        s.glassBtn,
        tone === 'light' ? s.glassBtnLight : s.glassBtnDark,
        pressed && (tone === 'light' ? s.glassBtnPressedLight : s.glassBtnPressedDark),
      ]}
    >
      {children}
    </Pressable>
  );
}

function MetaPill({ icon, label }: { icon: ReactNode; label: string }) {
  const { mode, theme, pageBg } = useTheme();
  const ink = hexToRgb(mode === 'light' ? pageBg : darkTheme.bgPrimary);

  return (
    <View
      style={[
        s.metaPill,
        mode === 'light'
          ? { borderColor: `rgba(${ink},0.42)`, backgroundColor: `rgba(${ink},0.35)` }
          : null,
      ]}
    >
      <LinearGradient
        colors={[`rgba(${ink},0.78)`, `rgba(${ink},0.58)`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View
        style={[
          s.metaPillHighlight,
          mode === 'light' ? { backgroundColor: 'rgba(255,255,255,0.38)' } : null,
        ]}
        pointerEvents="none"
      />
      <View style={s.metaPillContent}>
        {icon}
        <Text
          style={[
            s.metaPillText,
            { color: mode === 'light' ? theme.textPrimary : 'rgba(255,255,255,0.92)' },
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </View>
    </View>
  );
}

function EventDetailsCard({
  date,
  startTime,
  endTime,
  locationName,
  locationAddress,
  capacityLabel,
}: {
  date: string;
  startTime: string;
  endTime: string;
  locationName: string;
  locationAddress: string | null;
  capacityLabel: string;
}) {
  const { theme } = useTheme();
  return (
    <View style={[s.detailsCard, { backgroundColor: theme.surface1, borderColor: theme.surface3 }]}>
      <View style={s.detailBlock}>
        <View style={s.detailBlockLead}>
          <CalendarDays size={17} strokeWidth={1.75} color={theme.purpleSoft} />
          <View style={s.detailBlockBody}>
            <Text style={[s.detailPrimary, { color: theme.textPrimary }]}>{date}</Text>
            <Text style={[s.detailSecondary, { color: theme.textSecondary }]}>
              {startTime}
              <Text style={{ color: theme.textMuted }}> · </Text>
              {endTime}
            </Text>
          </View>
        </View>
      </View>

      <View style={s.detailBlock}>
        <View style={s.detailBlockLead}>
          <MapPin size={17} strokeWidth={1.75} color={theme.purpleSoft} />
          <View style={s.detailBlockBody}>
            <Text style={[s.detailPrimary, { color: theme.textPrimary }]}>{locationName}</Text>
            {locationAddress ? (
              <Text style={[s.detailSecondary, { color: theme.textSecondary }]}>
                {locationAddress}
              </Text>
            ) : null}
          </View>
        </View>
      </View>

      <View
        style={[
          s.detailCapacityChip,
          { backgroundColor: theme.surface2, borderColor: theme.surface3 },
        ]}
      >
        <Users size={15} strokeWidth={1.75} color={theme.purpleSoft} />
        <Text style={[s.detailCapacityText, { color: theme.textSecondary }]}>{capacityLabel}</Text>
      </View>
    </View>
  );
}

function FooterGlassPill({ children }: { children: ReactNode }) {
  const pillRadius = FOOTER_PILL_HEIGHT / 2;
  const pillWidth = Math.round(Dimensions.get('window').width * 0.9);

  return (
    <View
      style={[
        s.footerPill,
        {
          width: pillWidth,
          height: FOOTER_PILL_HEIGHT,
          borderRadius: pillRadius,
          alignSelf: 'center',
        },
      ]}
    >
      <BlurView
        intensity={Platform.OS === 'ios' ? 40 : 36}
        tint={Platform.OS === 'ios' ? 'systemThinMaterialDark' : 'dark'}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(14,14,20,0.06)', 'rgba(14,14,20,0.22)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[s.glassRim, { borderRadius: pillRadius }]} pointerEvents="none" />
      <View style={[s.footerPillInner, { padding: FOOTER_PILL_INSET }]}>{children}</View>
    </View>
  );
}

function ParticipantStack({
  participants,
  totalCount,
  avatarSize = MEMBER_AVATAR_SIZE,
}: {
  participants: EventParticipant[];
  totalCount: number;
  avatarSize?: number;
}) {
  const shown = participants.slice(0, 3);
  const remaining = Math.max(0, totalCount - shown.length);
  const overlap = Math.round(avatarSize * 0.34);

  return (
    <View style={s.memberStack}>
      {shown.map((p, index) => (
        <View key={p.id} style={[s.memberAvatarWrap, index > 0 && { marginLeft: -overlap }]}>
          <UserAvatar name={p.displayName} avatarUrl={p.avatarUrl} size={avatarSize} ring />
        </View>
      ))}
      {remaining > 0 ? (
        <View
          style={[
            s.memberMore,
            { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 },
            shown.length > 0 && { marginLeft: -overlap },
          ]}
        >
          <Text style={[s.memberMoreText, { color: darkTheme.textPrimary }]}>+{remaining}</Text>
        </View>
      ) : null}
    </View>
  );
}

export default function EventDetailScreen() {
  const { theme, mode, pageBg } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { data: event, isLoading, isError, refetch } = useEventDetail(id ?? '');
  const { data: participants = [] } = useEventParticipants(id ?? '');
  const { mutate: toggleRsvp, isPending: rsvpLoading } = useRsvpEvent();
  const { mutate: openChat, isPending: dmLoading } = useStartDm();
  const currentUserId = useAuthStore((state) => state.user?.id);

  const grad = eventGradient(event?.category?.slug ?? event?.category?.name);
  const heroNavTone = useHeroNavTone(event?.coverImageUrl, event?.coverNavTone, grad);
  const navInk = navInkForTone(heroNavTone);

  if (isLoading) {
    return (
      <View style={[s.centered, { backgroundColor: pageBg }]}>
        <ActivityIndicator size="large" color={theme.tealPrimary} />
      </View>
    );
  }

  if (isError || !event) {
    return (
      <View style={[s.centered, { backgroundColor: pageBg }]}>
        <Text style={[s.errorTitle, { color: theme.textPrimary }]}>EVENT NOT FOUND</Text>
        <TouchableOpacity
          onPress={() => void refetch()}
          style={[s.retryBtn, { backgroundColor: theme.tealPrimary }]}
        >
          <Text style={[s.retryText, { color: theme.onTeal }]}>RETRY</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isFree = !event.priceInr || event.priceInr === 0;
  const isLive = event.status === 'live';
  const isClubOrganiser = event.organiser.accountType === 'club';
  const hostedEventsCount = event.organiser.hostedEventsCount ?? 0;
  const hostedEventsLabel =
    hostedEventsCount === 1 ? '1 event hosted' : `${hostedEventsCount} events hosted`;
  const categoryTheme = categoryPillTheme(event.category?.slug);
  const participantTotal = Math.max(event.participantCount ?? 0, 1);
  const isOrganiser = currentUserId === event.organiserId;

  const organiserParticipant: EventParticipant = {
    id: event.organiser.id,
    displayName: event.organiser.displayName,
    username: event.organiser.username,
    avatarUrl: event.organiser.avatarUrl,
    joinedAt: event.createdAt,
  };
  const organiserInList = participants.find((p) => p.id === event.organiser.id);
  const displayParticipants = organiserInList
    ? [organiserInList, ...participants.filter((p) => p.id !== event.organiser.id)]
    : [organiserParticipant, ...participants];

  const onMessageOrganiser = () => {
    openChat(event.organiser.id, {
      onSuccess: (conversationId) => {
        router.push(`/chat/${conversationId}` as never);
      },
      onError: (err) => {
        Alert.alert('Message failed', err instanceof Error ? err.message : 'Try again');
      },
    });
  };

  const onRsvp = () => {
    if (isOrganiser && event.isRsvped) return;
    toggleRsvp(
      { eventId: event.id, isRsvped: !!event.isRsvped },
      {
        onError: (err) => {
          Alert.alert('RSVP failed', err instanceof Error ? err.message : 'Try again');
        },
      },
    );
  };

  return (
    <View style={[s.root, { backgroundColor: pageBg }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: FOOTER_HEIGHT + insets.bottom + 24 }}
      >
        {/* ── Hero banner ── */}
        <View style={[s.hero, { height: HERO_HEIGHT, backgroundColor: theme.surface2 }]}>
          {event.coverImageUrl ? (
            <Image
              source={{ uri: event.coverImageUrl }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <LinearGradient
              colors={grad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          )}

          <HeroFadeOverlay />

          <SafeAreaView edges={['top']} style={s.heroNav}>
            <View style={s.heroNavRow}>
              <GlassIconButton
                onPress={() => router.back()}
                accessibilityLabel="Go back"
                tone={heroNavTone}
              >
                <ChevronLeft size={22} strokeWidth={2} color={navInk} />
              </GlassIconButton>
              <View style={s.heroNavTitleWrap}>
                <Text style={[s.heroNavTitle, { color: navInk }]}>EVENT</Text>
              </View>
              <View style={s.heroNavSide}>
                <ContentActionsMenu
                  variant="nav"
                  iconColor={navInk}
                  targetType="event"
                  targetId={event.id}
                  targetTitle={event.title}
                  isOwnContent={isOrganiser}
                  onHidden={() => router.back()}
                />
              </View>
            </View>
          </SafeAreaView>

          <View style={s.heroContent}>
            {isLive ? (
              <View style={s.livePill}>
                <View style={[s.liveDot, { backgroundColor: theme.error }]} />
                <Text style={[s.livePillText, { color: theme.textPrimary }]}>LIVE</Text>
              </View>
            ) : null}

            <View
              style={[
                s.pricePill,
                { backgroundColor: theme.tealPrimary, ...theme.shadows.teal },
                isFree && s.pricePillFree,
              ]}
            >
              <Text
                style={[
                  s.pricePillText,
                  { color: theme.onTeal },
                  isFree && { color: theme.tealPrimary },
                ]}
              >
                {formatPrice(event.priceInr)}
              </Text>
            </View>

            <Text style={[s.heroTitle, { color: theme.textPrimary }]}>{event.title}</Text>

            <View style={s.heroPillsRow}>
              <MetaPill
                icon={
                  <Clock
                    size={14}
                    strokeWidth={1.75}
                    color={mode === 'light' ? theme.textSecondary : 'rgba(255,255,255,0.92)'}
                  />
                }
                label={formatEventDateTimePill(event.startTime)}
              />
              <MetaPill
                icon={
                  <MapPin
                    size={14}
                    strokeWidth={1.75}
                    color={mode === 'light' ? theme.textSecondary : 'rgba(255,255,255,0.92)'}
                  />
                }
                label={event.locationName}
              />
            </View>
          </View>
        </View>

        {/* ── Body ── */}
        <View style={s.body}>
          <View
            style={[
              s.organiserCard,
              { backgroundColor: theme.surface1, borderColor: theme.surface3 },
            ]}
          >
            <TouchableOpacity
              onPress={() => router.push(`/profile/${event.organiser.id}` as never)}
              style={s.organiserMain}
              activeOpacity={0.85}
            >
              <UserAvatar
                name={event.organiser.displayName}
                avatarUrl={event.organiser.avatarUrl}
                size={56}
              />
              <View style={s.organiserInfo}>
                <View style={s.organiserNameRow}>
                  <Text style={[s.organiserName, { color: theme.textPrimary }]} numberOfLines={1}>
                    {event.organiser.displayName}
                  </Text>
                  <AccountTypeIcon
                    type={event.organiser.accountType === 'club' ? 'club' : 'personal'}
                    size={18}
                    selected
                  />
                </View>
                <View style={s.organiserMetaRow}>
                  <View
                    style={[
                      s.organiserTypeBadge,
                      isClubOrganiser ? s.organiserTypeClub : s.organiserTypeAthlete,
                    ]}
                  >
                    <Text
                      style={[
                        s.organiserTypeText,
                        { color: isClubOrganiser ? theme.tealPrimary : theme.purpleSoft },
                      ]}
                    >
                      {accountTypeBadgeLabel(isClubOrganiser ? 'club' : 'personal')}
                    </Text>
                  </View>
                  <Text style={[s.organiserEventsText, { color: theme.textMuted }]}>
                    {hostedEventsLabel}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            {!isOrganiser ? (
              <TouchableOpacity
                onPress={onMessageOrganiser}
                disabled={dmLoading}
                style={s.organiserDmBtn}
                activeOpacity={0.85}
                accessibilityLabel="Message organiser"
                accessibilityRole="button"
              >
                {dmLoading ? (
                  <ActivityIndicator size="small" color={theme.tealPrimary} />
                ) : (
                  <>
                    <MessageCircle size={15} strokeWidth={2} color={theme.tealPrimary} />
                    <Text style={[s.organiserDmText, { color: theme.tealPrimary }]}>DM</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : null}
          </View>

          {event.category ? (
            <View style={s.categoryPillsRow}>
              <View
                style={[
                  s.categoryPill,
                  {
                    backgroundColor: categoryTheme.backgroundColor,
                    borderColor: categoryTheme.borderColor,
                  },
                ]}
              >
                <Text style={s.categoryPillIcon}>{categoryTheme.icon}</Text>
                <Text style={[s.categoryPillText, { color: categoryTheme.textColor }]}>
                  {event.category.name}
                </Text>
              </View>
              {isLive ? (
                <View style={s.liveCategoryPill}>
                  <View style={[s.liveCategoryDot, { backgroundColor: theme.error }]} />
                  <Text style={[s.liveCategoryText, { color: theme.error }]}>LIVE</Text>
                </View>
              ) : null}
            </View>
          ) : null}

          <Text style={[s.sectionLabel, { color: theme.purpleSoft }]}>ABOUT</Text>
          <Text style={[s.description, { color: theme.textSecondary }]}>
            {event.description?.trim() ||
              'No description yet. Check back later for more details about this event.'}
          </Text>

          <Text style={[s.sectionLabel, { color: theme.purpleSoft }]}>EVENT DETAILS</Text>
          <EventDetailsCard
            date={formatEventDetailDate(event.startTime)}
            startTime={formatEventTime(event.startTime)}
            endTime={formatEventTime(event.endTime)}
            locationName={event.locationName}
            locationAddress={event.locationAddress}
            capacityLabel={
              event.maxCapacity ? `Up to ${event.maxCapacity} people` : 'Open to everyone'
            }
          />

          <Text style={[s.sectionLabel, { color: theme.purpleSoft }]}>DISCUSSION</Text>
          {event.isRsvped && event.discussionId ? (
            <TouchableOpacity
              style={[
                s.discussionCard,
                {
                  backgroundColor: theme.surface1,
                  borderColor: theme.surface3,
                  ...theme.shadows.sm,
                },
              ]}
              onPress={() => router.push(`/chat/${event.discussionId}` as never)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Open event discussion"
            >
              <View style={s.discussionIconWrap}>
                <MessagesSquare size={18} strokeWidth={2} color={theme.purpleSoft} />
              </View>
              <View style={s.discussionBody}>
                <Text style={[s.discussionTitle, { color: theme.textPrimary }]}>
                  Event discussion
                </Text>
                <Text style={[s.discussionSub, { color: theme.textMuted }]} numberOfLines={2}>
                  {event.chatroomActive
                    ? 'Chat with attendees about this event'
                    : 'Closed — organiser updates only'}
                </Text>
              </View>
              <Text style={[s.discussionCta, { color: theme.tealPrimary }]}>OPEN</Text>
            </TouchableOpacity>
          ) : (
            <View
              style={[
                s.discussionCardMuted,
                { backgroundColor: theme.surface1, borderColor: theme.surface3 },
              ]}
            >
              <View
                style={[
                  s.discussionIconWrapMuted,
                  { backgroundColor: theme.surface2, borderColor: theme.surface3 },
                ]}
              >
                <MessagesSquare size={18} strokeWidth={2} color={theme.textMuted} />
              </View>
              <View style={s.discussionBody}>
                <Text style={[s.discussionTitleMuted, { color: theme.textSecondary }]}>
                  Event discussion
                </Text>
                <Text style={[s.discussionSubMuted, { color: theme.textMuted }]}>
                  Join the event to access the group discussion
                </Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* ── Sticky footer ── */}
      <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, 14) }]}>
        <LinearGradient
          pointerEvents="none"
          colors={['transparent', 'rgba(14,14,20,0.55)', 'rgba(14,14,20,0.92)']}
          locations={[0, 0.45, 1]}
          style={s.footerFade}
        />
        <FooterGlassPill>
          <View style={s.footerMembers}>
            <ParticipantStack participants={displayParticipants} totalCount={participantTotal} />
            <Text style={[s.footerGoingText, { color: darkTheme.purpleSoft }]} numberOfLines={1}>
              {participantTotal} going
              {event.maxCapacity ? ` · ${event.maxCapacity} max` : ''}
            </Text>
          </View>

          <TouchableOpacity
            style={[
              s.joinBtn,
              {
                height: JOIN_BTN_HEIGHT,
                borderRadius: JOIN_BTN_HEIGHT / 2,
                backgroundColor: theme.tealPrimary,
                ...theme.shadows.teal,
              },
              !!event.isRsvped && { ...s.joinBtnJoined, borderColor: theme.tealPrimary },
            ]}
            onPress={onRsvp}
            disabled={rsvpLoading || (isOrganiser && !!event.isRsvped)}
            activeOpacity={0.85}
          >
            {rsvpLoading ? (
              <ActivityIndicator color={event.isRsvped ? theme.tealPrimary : theme.onTeal} />
            ) : (
              <Text
                style={[
                  s.joinBtnText,
                  { color: theme.onTeal },
                  !!event.isRsvped && { color: theme.tealPrimary },
                ]}
              >
                {isOrganiser && event.isRsvped ? 'HOSTING' : event.isRsvped ? 'JOINED' : 'JOIN NOW'}
              </Text>
            )}
          </TouchableOpacity>
        </FooterGlassPill>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  errorTitle: {
    fontFamily: fonts.h2,
    fontSize: 18,
    marginBottom: 16,
  },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: radius.md,
  },
  retryText: { fontFamily: fonts.button, letterSpacing: 1 },

  hero: {
    position: 'relative',
    overflow: 'hidden',
  },
  heroBottomFeather: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -1,
    height: 36,
  },
  heroNav: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    elevation: 20,
  },
  heroNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    minHeight: 44,
  },
  heroNavTitleWrap: {
    flex: 1,
    alignItems: 'center',
  },
  heroNavSide: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroNavTitle: {
    fontFamily: fonts.h2,
    fontSize: 16,
    letterSpacing: 0.5,
  },
  glassBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glassBtnDark: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  glassBtnLight: {
    backgroundColor: 'rgba(14,14,20,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(14,14,20,0.14)',
  },
  glassBtnPressedDark: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  glassBtnPressedLight: {
    backgroundColor: 'rgba(14,14,20,0.14)',
  },
  heroContent: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingBottom: 22,
    zIndex: 1,
  },
  livePill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,77,109,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255,77,109,0.45)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
    marginBottom: 10,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  livePillText: {
    fontFamily: fonts.label,
    fontSize: 10,
    letterSpacing: 1,
  },
  pricePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.full,
    marginBottom: 12,
  },
  pricePillFree: {
    backgroundColor: 'rgba(0,229,195,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(0,229,195,0.45)',
  },
  pricePillText: {
    fontFamily: fonts.button,
    fontSize: 13,
    letterSpacing: 0.5,
  },
  pricePillTextFree: {},
  heroTitle: {
    fontFamily: fonts.h1,
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.5,
    marginBottom: 14,
  },
  heroPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaPill: {
    maxWidth: '100%',
    borderRadius: radius.full,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(14,14,20,0.45)',
    ...shadows.sm,
  },
  metaPillHighlight: {
    position: 'absolute',
    top: 0,
    left: 10,
    right: 10,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 1,
  },
  metaPillContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  metaPillText: {
    fontFamily: fonts.bodyStrong,
    fontSize: 12,
    color: 'rgba(255,255,255,0.92)',
    flexShrink: 1,
  },

  body: {
    paddingHorizontal: 20,
    paddingTop: 0,
    marginTop: -6,
  },
  organiserCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
  },
  organiserMain: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  organiserDmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    minWidth: 56,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: radius.full,
    backgroundColor: 'rgba(0, 229, 195, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 195, 0.35)',
  },
  organiserDmText: {
    fontFamily: fonts.label,
    fontSize: 10,
    letterSpacing: 0.8,
  },
  categoryPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 22,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: radius.full,
    borderWidth: 1.5,
  },
  categoryPillIcon: {
    fontSize: 14,
  },
  categoryPillText: {
    fontFamily: fonts.bodyStrong,
    fontSize: 13,
    letterSpacing: 0.2,
  },
  liveCategoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,77,109,0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,77,109,0.38)',
  },
  liveCategoryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  liveCategoryText: {
    fontFamily: fonts.label,
    fontSize: 10,
    letterSpacing: 1,
  },
  organiserInfo: { flex: 1, minWidth: 0 },
  organiserNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  organiserName: {
    fontFamily: fonts.h2,
    fontSize: 17,
    flexShrink: 1,
  },
  organiserMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  organiserTypeBadge: {
    borderRadius: radius.xs,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  organiserTypeClub: {
    backgroundColor: 'rgba(0, 229, 195, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 195, 0.45)',
  },
  organiserTypeAthlete: {
    backgroundColor: 'rgba(123, 77, 255, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(168, 130, 255, 0.5)',
  },
  organiserTypeText: {
    fontFamily: fonts.label,
    fontSize: 9,
    letterSpacing: 1.2,
  },
  organiserTypeTextClub: {},
  organiserTypeTextAthlete: {},
  organiserEventsText: {
    fontFamily: fonts.caption,
    fontSize: 12,
  },
  sectionLabel: {
    fontFamily: fonts.label,
    fontSize: 10,
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  discussionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: 8,
  },
  discussionCardMuted: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: 8,
    opacity: 0.85,
  },
  discussionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(91, 46, 204, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(123, 77, 255, 0.24)',
  },
  discussionIconWrapMuted: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  discussionBody: { flex: 1, minWidth: 0 },
  discussionTitle: {
    fontFamily: fonts.bodyStrong,
    fontSize: 14,
  },
  discussionTitleMuted: {
    fontFamily: fonts.bodyStrong,
    fontSize: 14,
  },
  discussionSub: {
    fontFamily: fonts.body,
    fontSize: 12,
    marginTop: 3,
    lineHeight: 17,
  },
  discussionSubMuted: {
    fontFamily: fonts.body,
    fontSize: 12,
    marginTop: 3,
    lineHeight: 17,
  },
  discussionCta: {
    fontFamily: fonts.label,
    fontSize: 10,
    letterSpacing: 0.8,
  },
  description: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 24,
  },
  detailsCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: 18,
    gap: 20,
    marginBottom: 8,
  },
  detailBlock: {},
  detailBlockLead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  detailBlockBody: {
    flex: 1,
    minWidth: 0,
    gap: 5,
  },
  detailPrimary: {
    fontFamily: fonts.bodyStrong,
    fontSize: 15,
    lineHeight: 22,
  },
  detailSecondary: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
  },
  detailTimeSep: {},
  detailCapacityChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: radius.full,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  detailCapacityText: {
    fontFamily: fonts.caption,
    fontSize: 13,
  },

  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 20,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  footerFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 120,
  },
  footerPill: {
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.28,
        shadowRadius: 28,
      },
      android: {
        elevation: 10,
        backgroundColor: 'rgba(14, 14, 20, 0.38)',
      },
      default: {},
    }),
  },
  glassRim: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(90, 82, 140, 0.28)',
  },
  footerPillInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  footerMembers: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  memberStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberAvatarWrap: {
    borderWidth: 2,
    borderColor: 'rgba(14,14,20,0.65)',
    borderRadius: 9999,
  },
  memberMore: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 2,
    borderColor: 'rgba(14,14,20,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberMoreText: {
    fontFamily: fonts.caption,
    fontSize: 10,
  },
  footerGoingText: {
    flex: 1,
    fontFamily: fonts.caption,
    fontSize: 12,
  },
  joinBtn: {
    minWidth: 116,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinBtnJoined: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1.5,
    shadowOpacity: 0,
  },
  joinBtnText: {
    fontFamily: fonts.button,
    fontSize: 14,
    letterSpacing: 0.5,
  },
  joinBtnTextJoined: {},
});
