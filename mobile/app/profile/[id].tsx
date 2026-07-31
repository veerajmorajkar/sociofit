import { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useUserProfile } from '@/hooks/useProfile';
import { followUser, unfollowUser } from '@/services/users.service';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useStartDm, useJoinClubAnnouncement } from '@/hooks/useMessages';
import ProfileView from '@/components/profile/ProfileView';
import { fonts } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';

export default function UserProfileScreen() {
  const { theme } = useTheme();
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
      void queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: (err) => {
      Alert.alert('Error', err instanceof Error ? err.message : 'Could not update follow');
    },
  });

  const { mutate: openChat, isPending: chatLoading } = useStartDm();
  const { mutate: joinAnnouncement, isPending: announcementLoading } = useJoinClubAnnouncement();

  useEffect(() => {
    if (profile?.isOwnProfile) {
      router.replace('/(tabs)/profile' as never);
    }
  }, [profile?.isOwnProfile]);

  if (isLoading) {
    return (
      <View style={[s.centered, { backgroundColor: theme.bgPrimary }]}>
        <ActivityIndicator size="large" color={theme.tealPrimary} />
      </View>
    );
  }

  if (isError || !profile) {
    return (
      <View style={[s.centered, { backgroundColor: theme.bgPrimary }]}>
        <Text style={[s.errTitle, { color: theme.textPrimary }]}>PROFILE NOT FOUND</Text>
        <TouchableOpacity
          onPress={() => void refetch()}
          style={[s.retryBtn, { backgroundColor: theme.tealPrimary }]}
          activeOpacity={0.85}
        >
          <Text style={[s.retryText, { color: theme.onTeal }]}>RETRY</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (profile.isOwnProfile) {
    return (
      <View style={[s.centered, { backgroundColor: theme.bgPrimary }]}>
        <ActivityIndicator size="large" color={theme.tealPrimary} />
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

  const openAnnouncementChat = (conversationId: string) => {
    router.push(`/chat/${conversationId}` as never);
  };

  const onAnnouncementPress = () => {
    const channel = profile.announcementChannel;
    if (!channel || !id || !profile.isFollowing) return;
    if (channel.conversationId && channel.canView !== false) {
      openAnnouncementChat(channel.conversationId);
      return;
    }
    joinAnnouncement(id, {
      onSuccess: ({ conversationId }) => openAnnouncementChat(conversationId),
      onError: (err) => {
        Alert.alert(
          'Could not open announcements',
          err instanceof Error ? err.message : 'Try again',
        );
      },
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
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
        accountType={profile.accountType}
        announcementChannel={profile.announcementChannel}
        onAnnouncementPress={onAnnouncementPress}
        announcementLoading={announcementLoading}
        contentPaddingBottom={40}
      />
    </View>
  );
}

const s = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  errTitle: { fontFamily: fonts.h2, marginBottom: 16 },
  retryBtn: { borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  retryText: { fontFamily: fonts.button, fontSize: 14 },
});
