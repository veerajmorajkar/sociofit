import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Settings, Link as LinkIcon, ChevronLeft, ArrowLeftRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useJoinedEvents, useHostedEvents } from '@/hooks/useEvents';
import UserPostsGrid from '@/components/profile/UserPostsGrid';
import ProfileEventsTab from '@/components/profile/ProfileEventsTab';
import { SCROLL_BOTTOM_PADDING } from '@/constants/layout';
import { colors, fonts } from '@/constants/theme';
import { activityLabel, activityIcon } from '@/constants/activities';
import UserAvatar from '@/components/ui/UserAvatar';

const TABS = ['POSTS', 'EVENTS'] as const;

export type ProfileViewVariant = 'own' | 'visitor';

export interface ProfileViewProps {
  userId: string;
  displayName: string;
  username: string;
  bio: string | null;
  avatarUrl: string | null;
  activities?: string[];
  websiteUrl?: string | null;
  followerCount: number;
  followingCount: number;
  postCount: number;
  isLoading?: boolean;
  variant: ProfileViewVariant;
  onSettingsPress?: () => void;
  isFollowing?: boolean;
  followLoading?: boolean;
  onToggleFollow?: () => void;
  onMessage?: () => void;
  messageLoading?: boolean;
  contentPaddingBottom?: number;
}

export default function ProfileView({
  userId,
  displayName,
  username,
  bio,
  avatarUrl,
  activities = [],
  websiteUrl,
  followerCount,
  followingCount,
  postCount,
  isLoading,
  variant,
  onSettingsPress,
  isFollowing,
  followLoading,
  onToggleFollow,
  onMessage,
  messageLoading,
  contentPaddingBottom = SCROLL_BOTTOM_PADDING,
}: ProfileViewProps) {
  const eventsUserId = variant === 'visitor' ? userId : undefined;
  const { data: joinedEvents } = useJoinedEvents(eventsUserId);
  const { data: hostedEvents } = useHostedEvents(eventsUserId);

  const [activeTab, setActiveTab] = useState(0);
  const [eventMode, setEventMode] = useState<'organised' | 'attended'>('organised');
  const [tabSlotWidth, setTabSlotWidth] = useState(0);
  const tabUnderlineX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (tabSlotWidth <= 0) return;
    Animated.spring(tabUnderlineX, {
      toValue: activeTab * tabSlotWidth,
      useNativeDriver: true,
      tension: 120,
      friction: 14,
    }).start();
  }, [activeTab, tabSlotWidth, tabUnderlineX]);

  const attendedCount = (joinedEvents?.upcoming.length ?? 0) + (joinedEvents?.past.length ?? 0);
  const organisedCount = (hostedEvents?.upcoming.length ?? 0) + (hostedEvents?.past.length ?? 0);

  const openConnections = (mode: 'followers' | 'following') => {
    router.push(`/profile/connections?userId=${userId}&mode=${mode}` as never);
  };

  const linkDisplay = websiteUrl?.trim() || `fitsocial.app/${username}`;

  const showVisitorActions = variant === 'visitor' && onToggleFollow && onMessage;

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: contentPaddingBottom }}
    >
      <LinearGradient
        colors={['#2A1570', '#5B2ECC', '#6D3AE8']}
        locations={[0, 0.65, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.headerCard}
      >
        <SafeAreaView edges={['top']}>
          <View style={s.topRow}>
            {variant === 'visitor' ? (
              <TouchableOpacity
                onPress={() => router.back()}
                style={s.backBtn}
                activeOpacity={0.65}
                accessibilityLabel="Go back"
                accessibilityRole="button"
              >
                <ChevronLeft size={24} strokeWidth={2} color={colors.textPrimary} />
              </TouchableOpacity>
            ) : (
              <View style={s.topRowSpacer} />
            )}
            {variant === 'own' && onSettingsPress ? (
              <TouchableOpacity
                onPress={onSettingsPress}
                style={s.settingsBtn}
                activeOpacity={0.65}
                accessibilityLabel="Settings"
                accessibilityRole="button"
              >
                <Settings size={20} strokeWidth={2} color={colors.textPrimary} />
              </TouchableOpacity>
            ) : (
              <View style={s.topRowSpacer} />
            )}
          </View>

          <View style={[s.identityRow, showVisitorActions && s.identityRowVisitor]}>
            <View style={s.avatar}>
              {isLoading && !avatarUrl ? (
                <ActivityIndicator size="small" color={colors.tealPrimary} />
              ) : (
                <UserAvatar name={displayName} avatarUrl={avatarUrl} size={76} />
              )}
            </View>

            <View style={s.identityInfo}>
              <Text style={s.displayName} numberOfLines={1}>
                {displayName}
              </Text>
              <View style={s.usernameRow}>
                <Text style={s.handle} numberOfLines={1}>
                  @{username}
                </Text>
                <View style={s.socialDot} />
                <TouchableOpacity onPress={() => openConnections('followers')} activeOpacity={0.7}>
                  <Text style={s.socialNum}>
                    <Text style={s.socialNumBold}>{followerCount}</Text>
                    <Text style={s.socialLabel}> followers</Text>
                  </Text>
                </TouchableOpacity>
                <View style={s.socialDot} />
                <TouchableOpacity onPress={() => openConnections('following')} activeOpacity={0.7}>
                  <Text style={s.socialNum}>
                    <Text style={s.socialNumBold}>{followingCount}</Text>
                    <Text style={s.socialLabel}> following</Text>
                  </Text>
                </TouchableOpacity>
              </View>

              {showVisitorActions && (
                <View style={s.visitorActionRow}>
                  <TouchableOpacity
                    style={[s.glassPill, !isFollowing && s.glassPillHighlight]}
                    onPress={onToggleFollow}
                    disabled={followLoading}
                    activeOpacity={0.75}
                    accessibilityRole="button"
                    accessibilityLabel={isFollowing ? 'Unfollow' : 'Follow'}
                  >
                    {followLoading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={[s.glassPillText, !isFollowing && s.glassPillTextHighlight]}>
                        {isFollowing ? 'Following' : 'Follow'}
                      </Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={onMessage}
                    disabled={messageLoading}
                    style={s.glassPill}
                    activeOpacity={0.75}
                    accessibilityRole="button"
                    accessibilityLabel="Send message"
                  >
                    {messageLoading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={s.glassPillText}>Message</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>

          <View style={s.detailsBlock}>
            {bio ? (
              <Text style={s.bio} numberOfLines={3}>
                {bio}
              </Text>
            ) : variant === 'own' ? (
              <Text style={s.bioPlaceholder}>Add a bio to tell people about yourself</Text>
            ) : null}

            <TouchableOpacity style={s.linkRow} activeOpacity={0.7}>
              <LinkIcon size={13} strokeWidth={2} color={colors.tealPrimary} />
              <Text style={s.linkText} numberOfLines={1}>
                {linkDisplay}
              </Text>
            </TouchableOpacity>

            {activities.length > 0 && (
              <View style={s.tagsRow}>
                {activities.map((id) => (
                  <View key={id} style={s.tag}>
                    <Text style={s.tagIcon}>{activityIcon(id)}</Text>
                    <Text style={s.tagLabel}>{activityLabel(id)}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          <View style={s.statPanel}>
            <View style={s.statItem}>
              <Text style={s.statNum}>{isLoading ? '—' : String(postCount)}</Text>
              <Text style={s.statLabel}>POSTS</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statItem}>
              <Text style={s.statNum}>{isLoading ? '—' : String(attendedCount)}</Text>
              <Text style={s.statLabel}>EVENTS{'\n'}ATTENDED</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statItem}>
              <Text style={s.statNum}>{isLoading ? '—' : String(organisedCount)}</Text>
              <Text style={s.statLabel}>EVENTS{'\n'}ORGANISED</Text>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <View style={s.contentSection}>
        <View
          style={s.profileTabsRow}
          onLayout={(e) => {
            const w = e.nativeEvent.layout.width;
            const slot = w / TABS.length;
            if (slot > 0) {
              setTabSlotWidth(slot);
              tabUnderlineX.setValue(activeTab * slot);
            }
          }}
        >
          {tabSlotWidth > 0 && (
            <Animated.View
              style={[
                s.profileTabUnderline,
                {
                  width: tabSlotWidth,
                  transform: [{ translateX: tabUnderlineX }],
                },
              ]}
            />
          )}
          {TABS.map((tab, i) => {
            const selected = activeTab === i;
            const isEventsTab = tab === 'EVENTS';
            return (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(i)}
                style={s.profileTab}
                activeOpacity={0.7}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
              >
                <View style={s.profileTabInner}>
                  <Text style={[s.profileTabLabel, selected && s.profileTabLabelActive]}>
                    {isEventsTab && selected
                      ? eventMode === 'organised'
                        ? 'ORGANISED EVENTS'
                        : 'ATTENDED EVENTS'
                      : tab}
                  </Text>
                  {isEventsTab && selected && (
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        setEventMode((m) => (m === 'organised' ? 'attended' : 'organised'));
                      }}
                      hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
                      activeOpacity={0.4}
                      accessibilityLabel="Switch events view"
                      accessibilityRole="button"
                    >
                      <ArrowLeftRight size={13} strokeWidth={2} color="rgba(255,255,255,0.5)" />
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {activeTab === 0 && <UserPostsGrid userId={variant === 'visitor' ? userId : undefined} />}
      {activeTab === 1 && (
        <ProfileEventsTab userId={variant === 'visitor' ? userId : undefined} mode={eventMode} />
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  headerCard: {
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    paddingHorizontal: 20,
    paddingBottom: 24,
    ...Platform.select({
      ios: {
        shadowColor: colors.purpleDeep,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
      },
      android: { elevation: 10 },
    }),
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 44,
    marginBottom: 12,
  },
  topRowSpacer: { width: 40, height: 40 },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -8,
  },
  settingsBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 14,
  },
  identityRowVisitor: {
    alignItems: 'flex-start',
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 9999,
    backgroundColor: 'rgba(20, 10, 55, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  identityInfo: { flex: 1, gap: 6 },
  displayName: {
    fontFamily: fonts.h1,
    fontSize: 24,
    color: '#FFFFFF',
    letterSpacing: -0.5,
    lineHeight: 28,
  },
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  handle: {
    fontFamily: fonts.caption,
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  socialDot: {
    width: 3,
    height: 3,
    borderRadius: 9999,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  socialNum: { flexDirection: 'row', alignItems: 'baseline' },
  socialNumBold: {
    fontFamily: fonts.stat,
    fontSize: 14,
    color: 'rgba(255,255,255,0.95)',
  },
  socialLabel: {
    fontFamily: fonts.caption,
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
  },

  visitorActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  glassPill: {
    flex: 1,
    minHeight: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.28)',
  },
  glassPillHighlight: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderColor: 'rgba(255, 255, 255, 0.42)',
  },
  glassPillText: {
    fontFamily: fonts.bodyStrong,
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.95)',
    letterSpacing: 0.15,
  },
  glassPillTextHighlight: {
    fontFamily: fonts.button,
    color: '#FFFFFF',
  },

  detailsBlock: { gap: 6, marginBottom: 16 },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
    backgroundColor: 'rgba(0, 0, 0, 0.42)',
    borderWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    borderLeftColor: 'rgba(255, 255, 255, 0.08)',
    borderRightColor: 'rgba(0, 0, 0, 0.55)',
    borderBottomColor: 'rgba(0, 0, 0, 0.55)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.35,
        shadowRadius: 4,
      },
      android: { elevation: 2 },
    }),
  },
  tagIcon: { fontSize: 12 },
  tagLabel: {
    fontFamily: fonts.caption,
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.88)',
    letterSpacing: 0.1,
  },
  bio: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 21,
  },
  bioPlaceholder: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: 'rgba(255,255,255,0.4)',
    fontStyle: 'italic',
    lineHeight: 21,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 2,
  },
  linkText: {
    fontFamily: fonts.caption,
    fontSize: 13,
    color: colors.tealPrimary,
  },
  statPanel: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: 'rgba(12, 5, 40, 0.72)',
    borderRadius: 20,
    overflow: 'hidden',
    borderTopWidth: 1.5,
    borderLeftWidth: 1.5,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    borderLeftColor: 'rgba(255, 255, 255, 0.06)',
    borderRightColor: 'rgba(0, 0, 0, 0.7)',
    borderBottomColor: 'rgba(0, 0, 0, 0.7)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.55,
        shadowRadius: 16,
      },
      android: { elevation: 6 },
    }),
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  statNum: {
    fontFamily: fonts.stat,
    fontSize: 20,
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  statLabel: {
    fontFamily: fonts.label,
    fontSize: 8,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 1.2,
    textAlign: 'center',
    lineHeight: 11,
  },

  contentSection: {
    backgroundColor: colors.bgPrimary,
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  profileTabsRow: {
    flexDirection: 'row',
    position: 'relative',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(42, 42, 72, 0.35)',
  },
  profileTabUnderline: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
  },
  profileTab: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 13,
    paddingBottom: 12,
    zIndex: 1,
  },
  profileTabInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  profileTabLabel: {
    fontFamily: fonts.caption,
    fontSize: 12,
    color: colors.textMuted,
    letterSpacing: 0.6,
  },
  profileTabLabelActive: {
    fontFamily: fonts.label,
    fontSize: 11,
    color: colors.textPrimary,
    letterSpacing: 1.3,
  },
});
