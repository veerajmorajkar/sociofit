import { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus, UserCheck, Sparkles } from 'lucide-react-native';
import UserAvatar from '@/components/ui/UserAvatar';
import AccountTypeIcon from '@/components/auth/AccountTypeIcon';
import { followUser } from '@/services/users.service';
import { fonts, radius } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import type { FeedSuggestedUser } from '@/types/feed';
import type { AccountTypeValue } from '@/constants/accountType';

interface Props {
  title: string;
  subtitle: string;
  users: FeedSuggestedUser[];
}

const HORIZONTAL_PAD = 16;
const CARD_GAP = 6;
const VISIBLE_CARD_COUNT = 3.2;
const AVATAR_SIZE = 36;
const CARD_HEIGHT = 178;

function formatCount(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(count);
}

function useSuggestionCardMetrics() {
  const { width: screenWidth } = useWindowDimensions();
  return useMemo(() => {
    const cardWidth = Math.floor(
      (screenWidth - HORIZONTAL_PAD * 2 - CARD_GAP * 2) / VISIBLE_CARD_COUNT,
    );
    const resolved = Math.max(96, Math.min(cardWidth, 112));
    return {
      cardWidth: resolved,
      snapInterval: resolved + CARD_GAP,
    };
  }, [screenWidth]);
}

function SuggestionCard({ user, cardWidth }: { user: FeedSuggestedUser; cardWidth: number }) {
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  const [followed, setFollowed] = useState(false);
  const isClub = user.accountType === 'club';
  const accountType = (isClub ? 'club' : 'personal') as AccountTypeValue;
  const ringColor = isClub ? theme.gold : theme.purpleHero;
  const eventCount = isClub ? (user.eventsHosted ?? 0) : (user.eventsAttended ?? 0);
  const eventLabel = isClub ? 'hosted' : 'attended';
  const innerWidth = cardWidth - 16;

  const { mutate: follow, isPending } = useMutation({
    mutationFn: () => followUser(user.id),
    onSuccess: () => {
      setFollowed(true);
      void queryClient.invalidateQueries({ queryKey: ['feed'] });
      void queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: (err) => {
      Alert.alert('Follow failed', err instanceof Error ? err.message : 'Try again');
    },
  });

  const openProfile = useCallback(() => {
    router.push(`/profile/${user.id}` as never);
  }, [user.id]);

  return (
    <View style={[s.cardShell, { width: cardWidth, marginRight: CARD_GAP }]}>
      <Pressable
        onPress={openProfile}
        style={({ pressed }) => [
          s.card,
          {
            width: cardWidth,
            height: CARD_HEIGHT,
            backgroundColor: theme.surface2,
            borderColor: theme.surface3,
            opacity: pressed ? 0.92 : 1,
          },
        ]}
      >
        <LinearGradient
          colors={isClub ? [theme.gold, theme.goldLight] : [theme.purpleHero, theme.tealPrimary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={s.cardAccent}
        />

        <View style={s.cardBody}>
          <View
            style={[s.avatarRing, { borderColor: ringColor, backgroundColor: theme.insetWell }]}
          >
            <UserAvatar name={user.displayName} avatarUrl={user.avatarUrl} size={AVATAR_SIZE} />
          </View>

          <View style={[s.meta, { width: innerWidth }]}>
            <View style={s.nameRow}>
              <Text style={[s.name, { color: theme.textPrimary }]} numberOfLines={1}>
                {user.displayName}
              </Text>
              <AccountTypeIcon type={accountType} size={10} selected />
            </View>

            <Text style={[s.stat, { color: theme.textSecondary }]} numberOfLines={1}>
              {formatCount(user.followerCount ?? 0)} followers
            </Text>

            <Text style={[s.stat, { color: theme.textMuted }]} numberOfLines={1}>
              {formatCount(eventCount)} events {eventLabel}
            </Text>
          </View>

          <TouchableOpacity
            style={[
              s.followBtn,
              { width: innerWidth },
              followed
                ? { backgroundColor: 'transparent', borderWidth: 1, borderColor: theme.tealPrimary }
                : { backgroundColor: theme.tealPrimary },
            ]}
            onPress={(e) => {
              e.stopPropagation?.();
              if (followed) {
                openProfile();
                return;
              }
              follow();
            }}
            disabled={isPending}
            activeOpacity={0.85}
          >
            {isPending ? (
              <ActivityIndicator size="small" color={followed ? theme.tealPrimary : theme.onTeal} />
            ) : followed ? (
              <UserCheck size={13} strokeWidth={2.5} color={theme.tealPrimary} />
            ) : (
              <>
                <UserPlus size={11} strokeWidth={2.5} color={theme.onTeal} />
                <Text style={[s.followBtnText, { color: theme.onTeal }]}>Follow</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </Pressable>
    </View>
  );
}

export default function FeedFollowSuggestions({ title, subtitle, users }: Props) {
  const { theme } = useTheme();
  const { cardWidth, snapInterval } = useSuggestionCardMetrics();
  const rows = useMemo(() => users.slice(0, 6), [users]);

  if (rows.length === 0) return null;

  return (
    <View style={s.section}>
      <View style={s.banner}>
        <Sparkles size={12} strokeWidth={2} color={theme.tealPrimary} />
        <Text style={[s.bannerText, { color: theme.tealPrimary }]} numberOfLines={1}>
          {title.toUpperCase()}
        </Text>
      </View>

      <Text style={[s.subtitle, { color: theme.textMuted }]} numberOfLines={1}>
        {subtitle}
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={snapInterval}
        snapToAlignment="start"
        nestedScrollEnabled
        style={s.scroll}
        contentContainerStyle={[s.scrollContent, { paddingHorizontal: HORIZONTAL_PAD }]}
      >
        {rows.map((user) => (
          <SuggestionCard key={user.id} user={user} cardWidth={cardWidth} />
        ))}
      </ScrollView>

      <View style={[s.separator, { backgroundColor: theme.surface3 }]} />
    </View>
  );
}

const s = StyleSheet.create({
  section: {
    paddingTop: 10,
    paddingBottom: 2,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: HORIZONTAL_PAD,
    paddingBottom: 2,
  },
  bannerText: {
    fontFamily: fonts.label,
    fontSize: 10,
    letterSpacing: 0.5,
    flex: 1,
  },
  subtitle: {
    fontFamily: fonts.caption,
    fontSize: 11,
    lineHeight: 15,
    paddingHorizontal: HORIZONTAL_PAD,
    marginBottom: 10,
  },
  scroll: {
    height: CARD_HEIGHT,
  },
  scrollContent: {
    alignItems: 'flex-start',
    paddingRight: HORIZONTAL_PAD,
  },
  cardShell: {
    flexGrow: 0,
    flexShrink: 0,
  },
  card: {
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardAccent: {
    height: 2,
    width: '100%',
  },
  cardBody: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 8,
    gap: 6,
  },
  avatarRing: {
    width: AVATAR_SIZE + 4,
    height: AVATAR_SIZE + 4,
    borderRadius: (AVATAR_SIZE + 4) / 2,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meta: {
    alignItems: 'center',
    gap: 2,
    minHeight: 44,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    width: '100%',
  },
  name: {
    fontFamily: fonts.bodyStrong,
    fontSize: 11,
    flexShrink: 1,
    textAlign: 'center',
  },
  stat: {
    fontFamily: fonts.caption,
    fontSize: 9,
    lineHeight: 12,
    textAlign: 'center',
    width: '100%',
  },
  followBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    height: 26,
    borderRadius: radius.full,
    marginTop: 'auto',
  },
  followBtnText: {
    fontFamily: fonts.button,
    fontSize: 9,
    letterSpacing: 0.2,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: HORIZONTAL_PAD,
    marginTop: 12,
    opacity: 0.6,
  },
});
