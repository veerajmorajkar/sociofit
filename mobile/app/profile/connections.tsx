import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { getFollowers, getFollowing } from '@/services/users.service';
import { colors, fonts, radius } from '@/constants/theme';
import type { UserSummary } from '@/types/user';

export default function ConnectionsScreen() {
  const { userId, mode } = useLocalSearchParams<{
    userId: string;
    mode: 'followers' | 'following';
  }>();
  const isFollowers = mode !== 'following';
  const title = isFollowers ? 'FOLLOWERS' : 'FOLLOWING';

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

  const users = data?.pages.flatMap((p) => p.data) ?? [];

  const renderRow = ({ item }: { item: UserSummary }) => (
    <TouchableOpacity
      style={s.row}
      onPress={() => router.push(`/profile/${item.id}` as never)}
      activeOpacity={0.85}
    >
      <View style={s.avatar}>
        <Text style={s.avatarText}>{item.displayName.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.name}>{item.displayName}</Text>
        <Text style={s.handle}>@{item.username}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgPrimary }}>
      <View style={s.header}>
        <Text style={s.headerTitle}>{title}</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.tealPrimary} style={{ marginTop: 40 }} />
      ) : isError ? (
        <View style={s.centered}>
          <Text style={s.empty}>Couldn't load list</Text>
          <TouchableOpacity onPress={() => void refetch()} style={s.retryBtn}>
            <Text style={s.retryText}>RETRY</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          renderItem={renderRow}
          ListEmptyComponent={
            <Text style={s.empty}>
              {isFollowers ? 'No followers yet' : 'Not following anyone yet'}
            </Text>
          }
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
          }}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            isFetchingNextPage ? (
              <ActivityIndicator color={colors.tealPrimary} style={{ padding: 16 }} />
            ) : null
          }
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface3,
  },
  headerTitle: {
    fontFamily: fonts.h2,
    fontSize: 14,
    color: colors.textPrimary,
    letterSpacing: 1.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface3,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.purpleHero,
  },
  avatarText: { fontFamily: fonts.h2, fontSize: 18, color: colors.purpleSoft },
  name: { fontFamily: fonts.bodyStrong, fontSize: 15, color: colors.textPrimary },
  handle: { fontFamily: fonts.caption, fontSize: 12, color: colors.textMuted, marginTop: 2 },
  centered: { alignItems: 'center', paddingTop: 40 },
  empty: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    padding: 32,
  },
  retryBtn: {
    backgroundColor: colors.tealPrimary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: radius.md,
  },
  retryText: { fontFamily: fonts.button, color: colors.onTeal },
});
