import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  Animated,
  PanResponder,
} from 'react-native';
import { Pen, Share2, LogOut } from 'lucide-react-native';
import { router } from 'expo-router';
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus';
import { useAuthStore } from '@/stores/authStore';
import { logout as logoutApi } from '@/services/auth.service';
import { useMyProfile } from '@/hooks/useProfile';
import ProfileView from '@/components/profile/ProfileView';
import { colors, fonts } from '@/constants/theme';
import TabBarBottomFade from '@/components/ui/TabBarBottomFade';

export default function ProfileScreen() {
  const authUser = useAuthStore((state) => state.user);
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const logout = useAuthStore((state) => state.logout);

  const { data: profile, isLoading, refetch: refetchProfile } = useMyProfile();

  useRefreshOnFocus(() => {
    void refetchProfile();
  });

  const [showSettings, setShowSettings] = useState(false);
  const panelY = useRef(new Animated.Value(0)).current;
  const closePanel = useCallback(() => {
    Animated.timing(panelY, { toValue: 500, useNativeDriver: true, duration: 220 }).start(() => {
      setShowSettings(false);
      panelY.setValue(0);
    });
  }, [panelY]);
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) => gs.dy > 8,
      onPanResponderMove: (_, gs) => {
        if (gs.dy > 0) panelY.setValue(gs.dy);
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 90 || gs.vy > 1.2) {
          Animated.timing(panelY, { toValue: 500, useNativeDriver: true, duration: 180 }).start(
            () => {
              setShowSettings(false);
              panelY.setValue(0);
            },
          );
        } else {
          Animated.spring(panelY, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
        }
      },
    }),
  ).current;

  const handleLogout = async () => {
    closePanel();
    setTimeout(async () => {
      try {
        if (refreshToken) await logoutApi(refreshToken);
      } catch {
        /* silent */
      }
      await logout();
      router.replace('/(auth)/login');
    }, 230);
  };

  const myUserId = profile?.id ?? authUser?.id ?? '';

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flex: 1 }}>
        <ProfileView
          userId={myUserId}
          displayName={profile?.displayName ?? authUser?.displayName ?? ''}
          username={profile?.username ?? authUser?.username ?? ''}
          bio={profile?.bio ?? authUser?.bio ?? null}
          avatarUrl={profile?.avatarUrl ?? authUser?.avatarUrl ?? null}
          activities={profile?.activities ?? []}
          websiteUrl={profile?.websiteUrl}
          followerCount={profile?.followerCount ?? 0}
          followingCount={profile?.followingCount ?? 0}
          postCount={profile?.postCount ?? 0}
          isLoading={isLoading}
          variant="own"
          onSettingsPress={() => setShowSettings(true)}
        />
        <TabBarBottomFade />
      </View>

      <Modal visible={showSettings} transparent animationType="fade" onRequestClose={closePanel}>
        <Pressable style={s.modalBackdrop} onPress={closePanel}>
          <Animated.View
            style={[s.settingsPanel, { transform: [{ translateY: panelY }] }]}
            {...panResponder.panHandlers}
          >
            <View style={s.settingsHandle} />
            <Text style={s.settingsPanelTitle}>SETTINGS</Text>

            <TouchableOpacity
              style={s.settingsItem}
              activeOpacity={0.7}
              onPress={() => {
                closePanel();
                setTimeout(() => router.push('/profile/edit' as never), 230);
              }}
            >
              <View style={s.settingsIconWrap}>
                <Pen size={16} strokeWidth={1.75} color={colors.tealPrimary} />
              </View>
              <View style={s.settingsItemBody}>
                <Text style={s.settingsItemText}>Edit Profile</Text>
                <Text style={s.settingsItemSub}>Name, bio, activities, photo</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={s.settingsItem} activeOpacity={0.7}>
              <View style={s.settingsIconWrap}>
                <Share2 size={16} strokeWidth={1.75} color={colors.purpleSoft} />
              </View>
              <View style={s.settingsItemBody}>
                <Text style={s.settingsItemText}>Share Profile</Text>
                <Text style={s.settingsItemSub}>Invite others to follow you</Text>
              </View>
            </TouchableOpacity>

            <View style={s.settingsDivider} />

            <TouchableOpacity
              style={s.settingsItem}
              activeOpacity={0.7}
              onPress={() => void handleLogout()}
            >
              <View style={[s.settingsIconWrap, s.settingsIconRed]}>
                <LogOut size={16} strokeWidth={1.75} color={colors.error} />
              </View>
              <View style={s.settingsItemBody}>
                <Text style={[s.settingsItemText, s.settingsItemRed]}>Sign Out</Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        </Pressable>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  settingsPanel: {
    backgroundColor: colors.surface1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(91, 46, 204, 0.3)',
  },
  settingsHandle: {
    width: 36,
    height: 4,
    borderRadius: 9999,
    backgroundColor: colors.surface3,
    alignSelf: 'center',
    marginBottom: 20,
  },
  settingsPanelTitle: {
    fontFamily: fonts.label,
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: 2,
    marginBottom: 16,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
  },
  settingsIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.surface3,
  },
  settingsIconRed: {
    borderColor: 'rgba(255,77,109,0.2)',
    backgroundColor: 'rgba(255,77,109,0.08)',
  },
  settingsItemBody: { flex: 1 },
  settingsItemText: {
    fontFamily: fonts.bodyStrong,
    fontSize: 15,
    color: colors.textPrimary,
  },
  settingsItemSub: {
    fontFamily: fonts.caption,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 1,
  },
  settingsItemRed: { color: colors.error },
  settingsDivider: {
    height: 1,
    backgroundColor: colors.surface3,
    marginVertical: 6,
  },
});
