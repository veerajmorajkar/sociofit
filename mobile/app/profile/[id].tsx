import { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useUserProfile } from '@/hooks/useProfile';
import { followUser, unfollowUser } from '@/services/users.service';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useStartDm } from '@/hooks/useMessages';
import ProfileView from '@/components/profile/ProfileView';
import { colors, fonts } from '@/constants/theme';

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data: profile, isLoading, isError, refetch } = useUserProfile(id ?? '');
  const { mutate: toggleFollow, isPending: followLoading } = useMutation({
    mutationFn: async (isFollowing: boolean) => {
      if (!id) throw new Error('No user');
      if (isFollowing) return unfollowUser(id);
      return followUser(id);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['profile', id] });
    },
    onError: (err) => {
      Alert.alert('Error', err instanceof Error ? err.message : 'Could not update follow');
    },
  });

  const { mutate: openChat, isPending: chatLoading } = useStartDm();

  useEffect(() => {
    if (profile?.isOwnProfile) {
      router.replace('/(tabs)/profile' as never);
    }
  }, [profile?.isOwnProfile]);

  if (isLoading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator size="large" color={colors.tealPrimary} />
      </View>
    );
  }

  if (isError || !profile) {
    return (
      <View style={s.centered}>
        <Text style={s.errTitle}>PROFILE NOT FOUND</Text>
        <TouchableOpacity onPress={() => void refetch()} style={s.retryBtn} activeOpacity={0.85}>
          <Text style={s.retryText}>RETRY</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (profile.isOwnProfile) {
    return (
      <View style={s.centered}>
        <ActivityIndicator size="large" color={colors.tealPrimary} />
      </View>
    );
  }

  const onMessage = () => {
    if (!id) return;
    openChat(id, {
      onSuccess: (conversationId) => {
        router.push(`/chat/${conversationId}` as never);
      },
      onError: (err) => {
        Alert.alert('Message failed', err instanceof Error ? err.message : 'Try again');
      },
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ProfileView
        userId={profile.id}
        displayName={profile.displayName}
        username={profile.username}
        bio={profile.bio}
        avatarUrl={profile.avatarUrl}
        activities={profile.activities ?? []}
        websiteUrl={profile.websiteUrl}
        followerCount={profile.followerCount}
        followingCount={profile.followingCount}
        postCount={profile.postCount}
        variant="visitor"
        isFollowing={profile.isFollowing}
        followLoading={followLoading}
        onToggleFollow={() => toggleFollow(profile.isFollowing)}
        onMessage={onMessage}
        messageLoading={chatLoading}
        contentPaddingBottom={40}
      />
    </View>
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
  errTitle: { fontFamily: fonts.h2, color: colors.textPrimary, marginBottom: 16 },
  retryBtn: {
    backgroundColor: colors.tealPrimary,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  retryText: { fontFamily: fonts.button, fontSize: 14, color: colors.onTeal },
});
