import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MapPin, CalendarDays, Users } from 'lucide-react-native';
import { useEventDetail, useEventParticipants, useRsvpEvent } from '@/hooks/useEvents';
import { colors, fonts, radius, shadows, eventGradient } from '@/constants/theme';
import { formatEventDate, formatPrice } from '@/utils/formatDate';

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: event, isLoading, isError, refetch } = useEventDetail(id ?? '');
  const { data: participants } = useEventParticipants(id ?? '');
  const { mutate: toggleRsvp, isPending: rsvpLoading } = useRsvpEvent();

  if (isLoading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator size="large" color={colors.tealPrimary} />
      </View>
    );
  }

  if (isError || !event) {
    return (
      <View style={s.centered}>
        <Text style={s.errorTitle}>EVENT NOT FOUND</Text>
        <TouchableOpacity onPress={() => void refetch()} style={s.retryBtn}>
          <Text style={s.retryText}>RETRY</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isFree = !event.priceInr || event.priceInr === 0;
  const grad = eventGradient(event.category?.slug ?? event.category?.name);

  const onRsvp = () => {
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
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bgPrimary }}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <LinearGradient colors={grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.cover}>
        {event.category && (
          <View style={s.categoryBadge}>
            <Text style={s.categoryText}>{event.category.name.toUpperCase()}</Text>
          </View>
        )}
      </LinearGradient>

      <View style={s.body}>
        <Text style={s.title}>{event.title}</Text>

        <TouchableOpacity
          onPress={() => router.push(`/profile/${event.organiser.id}` as never)}
          style={s.organiserRow}
          activeOpacity={0.8}
        >
          <View style={s.organiserAvatar}>
            <Text style={s.organiserInitial}>
              {event.organiser.displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.organiserName}>{event.organiser.displayName}</Text>
            <Text style={s.organiserHandle}>@{event.organiser.username}</Text>
          </View>
        </TouchableOpacity>

        <View style={s.metaBlock}>
          <View style={s.metaRow}>
            <CalendarDays size={16} color={colors.textMuted} />
            <Text style={s.metaText}>{formatEventDate(event.startTime)}</Text>
          </View>
          <View style={s.metaRow}>
            <MapPin size={16} color={colors.textMuted} />
            <Text style={s.metaText}>{event.locationName}</Text>
          </View>
          {event.locationAddress ? <Text style={s.address}>{event.locationAddress}</Text> : null}
          <View style={s.metaRow}>
            <Users size={16} color={colors.purpleSoft} />
            <Text style={s.goingText}>
              {event.participantCount ?? 0} going
              {event.maxCapacity ? ` · ${event.maxCapacity} max` : ''}
            </Text>
          </View>
        </View>

        {(participants?.length ?? 0) > 0 && (
          <View style={s.participantsBlock}>
            <Text style={s.participantsLabel}>WHO'S GOING</Text>
            <View style={s.avatarRow}>
              {participants!.slice(0, 12).map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={s.participantChip}
                  onPress={() => router.push(`/profile/${p.id}` as never)}
                  activeOpacity={0.8}
                >
                  <View style={s.participantAvatar}>
                    <Text style={s.participantInitial}>
                      {p.displayName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={s.participantName} numberOfLines={1}>
                    {p.displayName.split(' ')[0]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {!isFree && <Text style={s.price}>{formatPrice(event.priceInr)}</Text>}

        {event.description ? <Text style={s.description}>{event.description}</Text> : null}

        <TouchableOpacity
          style={[s.rsvpBtn, !!event.isRsvped && s.rsvpBtnJoined]}
          onPress={onRsvp}
          disabled={rsvpLoading}
          activeOpacity={0.85}
        >
          {rsvpLoading ? (
            <ActivityIndicator color={event.isRsvped ? colors.tealPrimary : colors.onTeal} />
          ) : (
            <Text style={[s.rsvpText, event.isRsvped && s.rsvpTextJoined]}>
              {event.isRsvped ? 'JOINED ✓ · TAP TO LEAVE' : 'JOIN EVENT'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  centered: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  errorTitle: {
    fontFamily: fonts.h2,
    fontSize: 18,
    color: colors.textPrimary,
    marginBottom: 16,
  },
  retryBtn: {
    backgroundColor: colors.tealPrimary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: radius.md,
  },
  retryText: { fontFamily: fonts.button, color: colors.onTeal, letterSpacing: 1 },
  cover: { height: 200, padding: 16, justifyContent: 'flex-end' },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.xs,
  },
  categoryText: {
    fontFamily: fonts.label,
    fontSize: 10,
    color: colors.textPrimary,
    letterSpacing: 1,
  },
  body: { padding: 16 },
  title: {
    fontFamily: fonts.h1,
    fontSize: 24,
    color: colors.textPrimary,
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  organiserRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  organiserAvatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.surface2,
    borderWidth: 2,
    borderColor: colors.purpleHero,
    alignItems: 'center',
    justifyContent: 'center',
  },
  organiserInitial: { fontFamily: fonts.h2, fontSize: 18, color: colors.purpleSoft },
  organiserName: { fontFamily: fonts.bodyStrong, fontSize: 15, color: colors.textPrimary },
  organiserHandle: {
    fontFamily: fonts.caption,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  metaBlock: { gap: 10, marginBottom: 20 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaText: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary, flex: 1 },
  address: { fontFamily: fonts.caption, fontSize: 12, color: colors.textMuted, marginLeft: 24 },
  goingText: { fontFamily: fonts.caption, fontSize: 14, color: colors.purpleSoft },
  participantsBlock: { marginBottom: 20 },
  participantsLabel: {
    fontFamily: fonts.label,
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  avatarRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  participantChip: { alignItems: 'center', width: 56 },
  participantAvatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.surface3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  participantInitial: { fontFamily: fonts.h2, fontSize: 16, color: colors.purpleSoft },
  participantName: {
    fontFamily: fonts.caption,
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 4,
    maxWidth: 56,
    textAlign: 'center',
  },
  price: { fontFamily: fonts.stat, fontSize: 16, color: colors.tealPrimary, marginBottom: 12 },
  description: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 24,
    marginBottom: 24,
  },
  rsvpBtn: {
    backgroundColor: colors.tealPrimary,
    borderRadius: radius.md,
    paddingVertical: 16,
    alignItems: 'center',
    ...shadows.teal,
  },
  rsvpBtnJoined: {
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.tealPrimary,
  },
  rsvpText: { fontFamily: fonts.button, fontSize: 15, color: colors.onTeal, letterSpacing: 0.5 },
  rsvpTextJoined: { color: colors.tealPrimary },
});
