import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  Animated,
  PanResponder,
  Share,
  Alert,
} from 'react-native';
import { Pen, Share2, LogOut, Moon, Sun } from 'lucide-react-native';
import { router } from 'expo-router';
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus';
import { useAuthStore } from '@/stores/authStore';
import { logout as logoutApi } from '@/services/auth.service';
import { useMyProfile } from '@/hooks/useProfile';
import ProfileView from '@/components/profile/ProfileView';
import { fonts } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { selectHaptic } from '@/utils/haptics';
import TabBarBottomFade from '@/components/ui/TabBarBottomFade';

export default function ProfileScreen() {
  const { theme, mode, pageBg, toggleTheme } = useTheme();
  const authUser = useAuthStore((state) => state.user);
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const logout = useAuthStore((state) => state.logout);

  const { data: profile, isLoading, refetch: refetchProfile } = useMyProfile();

  useRefreshOnFocus(() => {
    void refetchProfile();
  });

  const [showSettings, setShowSettings] = useState(false);
  const panelY = useRef(new Animated.Value(0)).current;

  // Theme toggle knob slides with a spring instead of snapping.
  const knobX = useRef(new Animated.Value(mode === 'dark' ? 2 : 22)).current;
  useEffect(() => {
    Animated.spring(knobX, {
      toValue: mode === 'dark' ? 2 : 22,
      useNativeDriver: true,
      damping: 15,
      stiffness: 260,
      mass: 0.7,
    }).start();
  }, [mode, knobX]);

  const handleToggleTheme = useCallback(() => {
    selectHaptic();
    toggleTheme();
  }, [toggleTheme]);
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
      router.replace('/(auth)');
    }, 230);
  };

  const handleShareProfile = async () => {
    const username = profile?.username ?? authUser?.username;
    if (!username) return;
    closePanel();
    try {
      await Share.share({
        message: `Follow @${username} on Mumbai Fitness Mafia`,
        url: `https://mumbaifitnessmafia.com/@${username}`,
      });
    } catch {
      Alert.alert('Could not share', 'Please try again.');
    }
  };

  const myUserId = profile?.id ?? authUser?.id ?? '';

  return (
    <View style={{ flex: 1, backgroundColor: pageBg }}>
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
            style={[
              s.settingsPanel,
              {
                backgroundColor: theme.surface1,
                borderTopColor: 'rgba(91, 46, 204, 0.3)',
              },
              { transform: [{ translateY: panelY }] },
            ]}
            {...panResponder.panHandlers}
          >
            <View style={[s.settingsHandle, { backgroundColor: theme.surface3 }]} />
            <Text style={[s.settingsPanelTitle, { color: theme.textMuted }]}>SETTINGS</Text>

            {/* ── Appearance: Theme toggle ── */}
            <TouchableOpacity
              onPress={handleToggleTheme}
              style={[s.settingsItem, s.themeToggleRow, { backgroundColor: theme.surface1 }]}
              activeOpacity={0.7}
              accessibilityRole="switch"
              accessibilityState={{ checked: mode === 'dark' }}
              accessibilityLabel="Toggle dark mode"
            >
              <View
                style={[
                  s.settingsIconWrap,
                  { backgroundColor: theme.surface2, borderColor: theme.surface3 },
                ]}
              >
                {mode === 'dark' ? (
                  <Moon size={16} strokeWidth={1.75} color={theme.purpleHero} />
                ) : (
                  <Sun size={16} strokeWidth={1.75} color={theme.tealPrimary} />
                )}
              </View>
              <View style={s.settingsItemBody}>
                <Text style={[s.settingsItemText, { color: theme.textPrimary }]}>
                  {mode === 'dark' ? 'Dark Mode' : 'Light Mode'}
                </Text>
                <Text style={[s.settingsItemSub, { color: theme.textMuted }]}>
                  {mode === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
                </Text>
              </View>
              {/* Custom pill toggle */}
              <View
                style={[
                  s.togglePill,
                  {
                    backgroundColor: mode === 'dark' ? theme.purpleBrand : theme.tealPrimary,
                  },
                ]}
              >
                <Animated.View
                  style={[
                    s.toggleKnob,
                    { backgroundColor: theme.surface1, transform: [{ translateX: knobX }] },
                  ]}
                />
              </View>
            </TouchableOpacity>

            <View style={[s.settingsDivider, { backgroundColor: theme.surface3 }]} />

            <TouchableOpacity
              style={s.settingsItem}
              activeOpacity={0.7}
              onPress={() => {
                closePanel();
                setTimeout(() => router.push('/profile/edit' as never), 230);
              }}
            >
              <View
                style={[
                  s.settingsIconWrap,
                  { backgroundColor: theme.surface2, borderColor: theme.surface3 },
                ]}
              >
                <Pen size={16} strokeWidth={1.75} color={theme.tealPrimary} />
              </View>
              <View style={s.settingsItemBody}>
                <Text style={[s.settingsItemText, { color: theme.textPrimary }]}>Edit Profile</Text>
                <Text style={[s.settingsItemSub, { color: theme.textMuted }]}>
                  Name, bio, activities, photo
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={s.settingsItem}
              activeOpacity={0.7}
              onPress={() => void handleShareProfile()}
            >
              <View
                style={[
                  s.settingsIconWrap,
                  { backgroundColor: theme.surface2, borderColor: theme.surface3 },
                ]}
              >
                <Share2 size={16} strokeWidth={1.75} color={theme.purpleSoft} />
              </View>
              <View style={s.settingsItemBody}>
                <Text style={[s.settingsItemText, { color: theme.textPrimary }]}>
                  Share Profile
                </Text>
                <Text style={[s.settingsItemSub, { color: theme.textMuted }]}>
                  Invite others to follow you
                </Text>
              </View>
            </TouchableOpacity>

            <View style={[s.settingsDivider, { backgroundColor: theme.surface3 }]} />

            <TouchableOpacity
              style={s.settingsItem}
              activeOpacity={0.7}
              onPress={() => void handleLogout()}
            >
              <View
                style={[
                  s.settingsIconWrap,
                  {
                    borderColor: 'rgba(255,77,109,0.2)',
                    backgroundColor: 'rgba(255,77,109,0.08)',
                  },
                ]}
              >
                <LogOut size={16} strokeWidth={1.75} color={theme.error} />
              </View>
              <View style={s.settingsItemBody}>
                <Text style={[s.settingsItemText, { color: theme.error }]}>Sign Out</Text>
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  settingsHandle: {
    width: 36,
    height: 4,
    borderRadius: 9999,
    alignSelf: 'center',
    marginBottom: 20,
  },
  settingsPanelTitle: {
    fontFamily: fonts.label,
    fontSize: 11,
    letterSpacing: 2,
    marginBottom: 16,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
  },
  themeToggleRow: {
    paddingBottom: 2,
  },
  settingsIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  settingsItemBody: { flex: 1 },
  settingsItemText: {
    fontFamily: fonts.bodyStrong,
    fontSize: 15,
  },
  settingsItemSub: {
    fontFamily: fonts.caption,
    fontSize: 12,
    marginTop: 1,
  },
  settingsDivider: {
    height: 1,
    marginVertical: 6,
  },
  // Theme toggle pill
  togglePill: {
    width: 48,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleKnob: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
});
