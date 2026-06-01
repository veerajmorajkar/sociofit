import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Settings, MessageCircle, Link as LinkIcon, Footprints, CalendarCheck, Flag } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { logout as logoutApi } from '@/services/auth.service';
import { SCROLL_BOTTOM_PADDING } from '@/constants/layout';

const LIME = '#D4EA4D';
const BG = '#0E0E0E';
const SURFACE = '#161616';
const SURFACE2 = '#1E1E1E';
const TEXT1 = '#E8E0D0';
const TEXT2 = '#B0A898';
const TEXT3 = '#706860';
const TEXT4 = '#4A4440';
const TEXT_ON_LIME = '#0E0E0E';

const TABS = ['POSTS', 'EVENTS', 'ACTIVITY'] as const;

export default function ProfileScreen() {
  const user = useAuthStore((state) => state.user);
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const logout = useAuthStore((state) => state.logout);
  const [activeTab, setActiveTab] = useState(0);
  const { width } = useWindowDimensions();
  const gridItemWidth = (width - 16 * 2 - 12) / 2;

  const handleLogout = async () => {
    try { if (refreshToken) await logoutApi(refreshToken); } catch { /* ok */ }
    await logout();
    router.replace('/(auth)/login');
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <View style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: SCROLL_BOTTOM_PADDING }}
        >
          {/* ═══ LIME HEADER BLOCK — full bleed to top ═══ */}
          <View style={s.limeBlock}>
            <SafeAreaView edges={['top']}>
              {/* Top row: spacer + settings */}
              <View style={s.topRow}>
                <View style={{ width: 40 }} />
                <TouchableOpacity onPress={handleLogout} style={s.settingsBtn} activeOpacity={0.7} accessibilityLabel="Settings">
                  <Settings size={20} strokeWidth={1.75} color={TEXT_ON_LIME} />
                </TouchableOpacity>
              </View>

              {/* Avatar + name + handle */}
              <View style={s.profileRow}>
                <View style={s.avatar}>
                  <Text style={s.avatarText}>{user?.displayName?.charAt(0)?.toUpperCase() ?? '?'}</Text>
                </View>
                <View style={s.profileInfo}>
                  <Text style={s.displayName} numberOfLines={1}>{user?.displayName ?? 'Unknown'}</Text>
                  <Text style={s.handle} numberOfLines={1}>@{user?.username ?? 'unknown'}</Text>

                  {/* Action pills */}
                  <View style={s.actionRow}>
                    <TouchableOpacity style={s.actionPill} activeOpacity={0.7}>
                      <Text style={s.actionPillText}>EDIT PROFILE</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.actionPill} activeOpacity={0.7}>
                      <MessageCircle size={13} strokeWidth={2} color={TEXT_ON_LIME} />
                      <Text style={s.actionPillText}>SHARE</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Bio / description */}
              {user?.bio ? (
                <Text style={s.bio} numberOfLines={3}>{user.bio}</Text>
              ) : (
                <Text style={s.bioPlaceholder}>No bio yet — tell people about yourself</Text>
              )}

              {/* Link (optional) */}
              <TouchableOpacity style={s.linkRow} activeOpacity={0.7}>
                <LinkIcon size={13} strokeWidth={2} color={TEXT_ON_LIME} />
                <Text style={s.linkText} numberOfLines={1}>fitsocial.app/{user?.username ?? 'profile'}</Text>
              </TouchableOpacity>

              {/* Fitness stats — Steps, Events Attended, Events Organised */}
              <View style={s.fitnessStats}>
                <View style={s.fitStatItem}>
                  <Footprints size={16} strokeWidth={1.75} color={TEXT_ON_LIME} />
                  <Text style={s.fitStatNumber}>0</Text>
                  <Text style={s.fitStatLabel}>STEPS</Text>
                </View>
                <View style={s.fitStatDivider} />
                <View style={s.fitStatItem}>
                  <CalendarCheck size={16} strokeWidth={1.75} color={TEXT_ON_LIME} />
                  <Text style={s.fitStatNumber}>0</Text>
                  <Text style={s.fitStatLabel}>ATTENDED</Text>
                </View>
                <View style={s.fitStatDivider} />
                <View style={s.fitStatItem}>
                  <Flag size={16} strokeWidth={1.75} color={TEXT_ON_LIME} />
                  <Text style={s.fitStatNumber}>0</Text>
                  <Text style={s.fitStatLabel}>ORGANISED</Text>
                </View>
              </View>
            </SafeAreaView>
          </View>

          {/* ═══ SECONDARY STATS — Posts / Followers / Following ═══ */}
          <View style={s.secondaryStats}>
            {[
              { value: '0', label: 'POSTS' },
              { value: '0', label: 'FOLLOWERS' },
              { value: '0', label: 'FOLLOWING' },
            ].map((stat, i) => (
              <TouchableOpacity key={stat.label} style={s.secondaryStat} activeOpacity={0.7}>
                <Text style={s.secondaryStatNumber}>{stat.value}</Text>
                <Text style={s.secondaryStatLabel}>{stat.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ═══ CONTENT TABS ═══ */}
          <View style={s.tabBar}>
            {TABS.map((tab, i) => (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(i)}
                style={[s.tab, activeTab === i && s.tabActive]}
                activeOpacity={0.7}
              >
                <Text style={[s.tabText, activeTab === i && s.tabTextActive]}>{tab}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ═══ CONTENT GRID ═══ */}
          <View style={s.grid}>
            {[1, 2, 3, 4].map((item) => (
              <View key={item} style={[s.gridItem, { width: gridItemWidth, height: gridItemWidth * 1.25 }]}>
                <View style={s.gridItemInner} />
              </View>
            ))}
          </View>
        </ScrollView>

        {/* Gradient fade */}
        <LinearGradient
          colors={['rgba(14,14,14,0)', 'rgba(14,14,14,0.85)', '#0E0E0E']}
          locations={[0, 0.5, 1]}
          style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, pointerEvents: 'none' }}
        />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  // ── Lime block ──
  limeBlock: {
    backgroundColor: LIME,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(14,14,14,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Profile info ──
  profileRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    marginBottom: 14,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: SURFACE,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
      android: { elevation: 6 },
    }),
  },
  avatarText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 28,
    color: LIME,
  },
  profileInfo: { flex: 1, paddingTop: 2 },
  displayName: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 22,
    color: TEXT_ON_LIME,
    letterSpacing: -0.5,
    lineHeight: 26,
  },
  handle: {
    fontFamily: 'DMSans-Regular',
    fontSize: 13,
    color: 'rgba(14,14,14,0.5)',
    marginTop: 2,
    marginBottom: 10,
  },
  actionRow: { flexDirection: 'row', gap: 8 },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(14,14,14,0.10)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1.5,
    borderColor: 'rgba(14,14,14,0.15)',
  },
  actionPillText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 10,
    color: TEXT_ON_LIME,
    letterSpacing: 0.5,
  },

  // ── Bio + link ──
  bio: {
    fontFamily: 'DMSans-Regular',
    fontSize: 13,
    color: 'rgba(14,14,14,0.7)',
    lineHeight: 18,
    marginBottom: 8,
  },
  bioPlaceholder: {
    fontFamily: 'DMSans-Regular',
    fontSize: 13,
    color: 'rgba(14,14,14,0.35)',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 20,
  },
  linkText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 12,
    color: TEXT_ON_LIME,
    textDecorationLine: 'underline',
  },

  // ── Fitness stats (inside lime) ──
  fitnessStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(14,14,14,0.06)',
    borderRadius: 16,
    paddingVertical: 14,
  },
  fitStatItem: {
    alignItems: 'center',
    gap: 4,
  },
  fitStatNumber: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 20,
    color: TEXT_ON_LIME,
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
  fitStatLabel: {
    fontFamily: 'DMSans-Bold',
    fontSize: 8,
    color: 'rgba(14,14,14,0.4)',
    letterSpacing: 1.5,
  },
  fitStatDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(14,14,14,0.1)',
  },

  // ── Secondary stats (dark surface) ──
  secondaryStats: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    gap: 10,
  },
  secondaryStat: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: SURFACE,
    borderRadius: 14,
    paddingVertical: 14,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 0.45, shadowRadius: 10 },
      android: { elevation: 4 },
    }),
  },
  secondaryStatNumber: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 18,
    color: TEXT1,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
  },
  secondaryStatLabel: {
    fontFamily: 'DMSans-Bold',
    fontSize: 8,
    color: TEXT3,
    letterSpacing: 1.5,
    marginTop: 2,
  },

  // ── Tabs ──
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
    backgroundColor: SURFACE,
    borderRadius: 14,
    padding: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
  tabActive: {
    backgroundColor: SURFACE2,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 3, height: 3 }, shadowOpacity: 0.4, shadowRadius: 6 },
      android: { elevation: 4 },
    }),
  },
  tabText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 11,
    color: TEXT3,
    letterSpacing: 1.5,
  },
  tabTextActive: { color: TEXT1 },

  // ── Grid ──
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
  },
  gridItem: { borderRadius: 16, overflow: 'hidden' },
  gridItemInner: {
    flex: 1,
    backgroundColor: SURFACE2,
    borderRadius: 16,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 0.45, shadowRadius: 10 },
      android: { elevation: 4 },
    }),
  },
});
