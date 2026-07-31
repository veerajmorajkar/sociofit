import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useInfiniteQuery } from '@tanstack/react-query';
import { ChevronLeft, UserPlus, Users } from 'lucide-react-native';
import UserAvatar from '@/components/ui/UserAvatar';
import { getFollowers, getFollowing } from '@/services/users.service';
import { useTealRefresh } from '@/hooks/useTealRefresh';
import { fonts, radius } from '@/constants/theme';
import { accountTypeBadgeLabel } from '@/constants/accountType';
import { useTheme } from '@/contexts/ThemeContext';
import type { UserSummary } from '@/types/user';

const AVATAR_SIZE = 42;
const WELL_SIZE = AVATAR_SIZE + 6;

function ConnectionRow({ item }: { item: UserSummary }) {
  const { theme } = useTheme();
  const isClub = item.accountType === 'club';

  return (
    <TouchableOpacity
      style={[
        s.card,
        {
          backgroundColor: theme.chatCard,
          borderWidth: 1,
          borderColor: theme.surface3,
          ...theme.shadows.sm,
        },
      ]}
      onPress={() => router.push(`/profile/${item.id}` as never)}
      activeOpacity={0.9}
    >
      <LinearGradient
        colors={
          isClub
            ? ['rgba(201, 168, 76, 0.06)', 'rgba(201, 168, 76, 0.015)', 'transparent']
            : ['rgba(168, 130, 255, 0.06)', 'rgba(168, 130, 255, 0.015)', 'transparent']
        }
        locations={[0, 0.35, 1]}
        style={s.cardShine}
        pointerEvents="none"
      />

      <View
        style={[
          s.avatarWell,
          { backgroundColor: theme.insetWell, borderWidth: 1, borderColor: theme.surface3 },
        ]}
      >
        <UserAvatar name={item.displayName} avatarUrl={item.avatarUrl} size={AVATAR_SIZE} />
      </View>

      <View style={s.body}>
        <Text style={[s.name, { color: theme.textPrimary }]} numberOfLines={1}>
          {item.displayName}
        </Text>
        <Text style={[s.handle, { color: theme.textMuted }]} numberOfLines={1}>
          @{item.username}
        </Text>
      </View>

      <View
        style={[
          s.badge,
          isClub
            ? {
                backgroundColor: 'rgba(201, 168, 76, 0.14)',
                borderColor: 'rgba(201, 168, 76, 0.32)',
              }
            : {
                backgroundColor: 'rgba(123, 77, 255, 0.12)',
                borderColor: 'rgba(123, 77, 255, 0.28)',
              },
        ]}
      >
        <Text style={[s.badgeText, { color: isClub ? theme.goldLight : theme.purpleSoft }]}>
          {accountTypeBadgeLabel(isClub ? 'club' : 'personal')}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function ConnectionsScreen() {
  const { theme } = useTheme();
  const { userId, mode, name } = useLocalSearchParams<{
    userId: string;
    mode: 'followers' | 'following';
    name?: string;
  }>();
  const isFollowers = mode !== 'following';
  const title = isFollowers ? 'FOLLOWERS' : 'FOLLOWING';
  const profileName = name?.trim();

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError, refetch } =
    useInfiniteQuery({
      queryKey: ['connections', userId, mode],
      queryFn: ({ pageParam }) =>
        isFollowers
          ? getFollowers(userId ?? '', pageParam as string | undefined)
          : getFollowing(userId ?? '', pageParam as string | undefined),
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (last) => (last.meta.hasMore ? (last.meta.cursor ?? undefined) : undefined),
      enabled: !!userId,
    });

  const { refreshListProps } = useTealRefresh(refetch);
  const users = data?.pages.flatMap((p) => p.data) ?? [];
  const count = users.length;

  const emptyTitle = isFollowers ? 'NO FOLLOWERS YET' : 'NOT FOLLOWING ANYONE';
  const emptyBody = isFollowers
    ? profileName
      ? `${profileName} hasn't picked up followers yet.`
      : 'When people follow this profile, they show up here.'
    : profileName
      ? `${profileName} isn't following anyone yet.`
      : 'Accounts this profile follows will show up here.';

  return (
    <View style={[s.root, { backgroundColor: theme.bgPrimary }]}>
      <LinearGradient
        colors={[theme.surface1, theme.bgPrimary, theme.bgPrimary] as [string, string, string]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <SafeAreaView edges={['top']} style={s.headerWrap}>
        <View style={s.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={s.backBtn}
            hitSlop={10}
            activeOpacity={0.75}
            accessibilityLabel="Go back"
          >
            <ChevronLeft size={24} strokeWidth={1.75} color={theme.textPrimary} />
          </TouchableOpacity>

          <View style={s.headerCenter} pointerEvents="none">
            <Text style={[s.headerTitle, { color: theme.textPrimary }]}>{title}</Text>
            {!isLoading && !isError ? (
              <Text style={[s.headerSubtitle, { color: theme.textMuted }]}>
                {count} {count === 1 ? 'account' : 'accounts'}
                {profileName ? ` · ${profileName}` : ''}
              </Text>
            ) : null}
          </View>

          <View style={s.headerSpacer} />
        </View>

        <View style={s.headerDivider}>
          <LinearGradient
            colors={['transparent', 'rgba(168, 130, 255, 0.22)', 'transparent']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={s.headerDividerLine}
          />
        </View>
      </SafeAreaView>

      {isLoading ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color={theme.tealPrimary} />
        </View>
      ) : isError ? (
        <View style={s.centered}>
          <Text style={[s.emptyTitle, { color: theme.textPrimary }]}>COULDN'T LOAD LIST</Text>
          <TouchableOpacity
            onPress={() => void refetch()}
            style={[
              s.retryBtn,
              { backgroundColor: theme.surface1, borderColor: theme.surface3, borderWidth: 1 },
            ]}
          >
            <Text style={[s.retryText, { color: theme.tealPrimary }]}>RETRY</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ConnectionRow item={item} />}
          {...refreshListProps}
          contentContainerStyle={[s.listContent, users.length === 0 && s.listContentEmpty]}
          showsVerticalScrollIndicator={false}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
          }}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            isFetchingNextPage ? (
              <ActivityIndicator color={theme.tealPrimary} style={s.footerLoader} />
            ) : null
          }
          ListEmptyComponent={
            <View style={s.emptyWrap}>
              <View
                style={[
                  s.emptyIconWrap,
                  { backgroundColor: theme.insetWell, borderWidth: 1, borderColor: theme.surface3 },
                ]}
              >
                {isFollowers ? (
                  <Users size={34} strokeWidth={1.5} color={theme.purpleSoft} />
                ) : (
                  <UserPlus size={34} strokeWidth={1.5} color={theme.purpleSoft} />
                )}
              </View>
              <Text style={[s.emptyTitle, { color: theme.textPrimary }]}>{emptyTitle}</Text>
              <Text style={[s.emptyBody, { color: theme.textMuted }]}>{emptyBody}</Text>
              <TouchableOpacity
                onPress={() => router.push('/(tabs)/search' as never)}
                style={[
                  s.secondaryBtn,
                  { backgroundColor: theme.surface1, borderColor: theme.surface3, borderWidth: 1 },
                ]}
              >
                <Text style={[s.secondaryBtnText, { color: theme.purpleSoft }]}>FIND PEOPLE</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  headerWrap: { backgroundColor: 'transparent' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
    minHeight: 44,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -8,
    zIndex: 1,
  },
  headerCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  headerSpacer: { width: 32, height: 40 },
  headerTitle: { fontFamily: fonts.h1, fontSize: 18, letterSpacing: 0.4 },
  headerSubtitle: {
    fontFamily: fonts.caption,
    fontSize: 12,
    marginTop: 3,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  headerDivider: { paddingHorizontal: 28, paddingBottom: 4 },
  headerDividerLine: { height: 1, borderRadius: radius.full },
  listContent: { paddingTop: 10, paddingBottom: 32 },
  listContentEmpty: { flexGrow: 1 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    marginHorizontal: 18,
    marginBottom: 10,
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  cardShine: { ...StyleSheet.absoluteFillObject, height: '55%' },
  avatarWell: {
    width: WELL_SIZE,
    height: WELL_SIZE,
    borderRadius: WELL_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  body: { flex: 1, minWidth: 0, gap: 2 },
  name: { fontFamily: fonts.bodyStrong, fontSize: 15, letterSpacing: 0.1 },
  handle: { fontFamily: fonts.caption, fontSize: 12 },
  badge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: radius.full, borderWidth: 1 },
  badgeText: { fontFamily: fonts.label, fontSize: 8, letterSpacing: 0.4 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 48,
  },
  emptyIconWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  emptyTitle: {
    fontFamily: fonts.h2,
    fontSize: 16,
    marginTop: 16,
    letterSpacing: 0.5,
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
    marginTop: 22,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: radius.full,
  },
  retryText: { fontFamily: fonts.button, letterSpacing: 0.5 },
  secondaryBtn: {
    marginTop: 20,
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: radius.full,
  },
  secondaryBtnText: { fontFamily: fonts.button, letterSpacing: 0.5 },
  footerLoader: { paddingVertical: 16 },
});
