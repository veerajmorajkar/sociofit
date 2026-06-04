import { memo, useState, useCallback, type ReactNode } from 'react';
import { View, Text, Pressable, StyleSheet, Share, Platform, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import {
  Heart,
  MessageCircle,
  Share2,
  Repeat2,
  MapPin,
  BadgeCheck,
  CalendarDays,
} from 'lucide-react-native';
import UserAvatar from '@/components/ui/UserAvatar';
import CommentsBottomSheet from '@/components/feed/CommentsBottomSheet';
import PostMediaCarousel from '@/components/feed/PostMediaCarousel';
import { colors, fonts, radius } from '@/constants/theme';
import { API_URL } from '@/constants/config';
import type { PostType } from '@/types/post';

interface TaggedUser {
  id: string;
  displayName: string;
  username: string;
}

export interface PostCardProps {
  postId: string;
  postType?: PostType;
  eventId?: string | null;
  username: string;
  timestamp: string;
  caption?: string;
  likeCount: number;
  commentCount: number;
  reshareCount?: number;
  isLiked: boolean;
  isReposted?: boolean;
  isVerified?: boolean;
  repostLabel?: string;
  avatarInitial: string;
  avatarUrl?: string | null;
  /** All image/video URLs in sort order (preferred) */
  mediaUrls?: string[];
  /** @deprecated Use mediaUrls — first image only */
  imageUrl?: string | null;
  locationName?: string | null;
  taggedUsers?: TaggedUser[];
  onLike?: () => void;
  onRepost?: () => void;
  onPress?: () => void;
  onAuthorPress?: () => void;
  /** feed = home; detail = post screen (no sheet, optional scroll-to-comments) */
  variant?: 'feed' | 'detail';
  onCommentPress?: () => void;
  headerTrailing?: ReactNode;
}

function buildPostUrl(postId: string) {
  return `${API_URL.replace('/api/v1', '')}/post/${postId}`;
}

function PostCard({
  postId,
  postType,
  eventId,
  username,
  timestamp,
  caption,
  likeCount,
  commentCount,
  reshareCount = 0,
  isLiked,
  isReposted = false,
  isVerified = false,
  repostLabel,
  avatarInitial,
  avatarUrl,
  mediaUrls,
  imageUrl,
  locationName,
  taggedUsers,
  onLike,
  onRepost,
  onPress,
  onAuthorPress,
  variant = 'feed',
  onCommentPress,
  headerTrailing,
}: PostCardProps) {
  const [commentsVisible, setCommentsVisible] = useState(false);
  const isDetail = variant === 'detail';

  const isEventPost = postType === 'event_invite' && !!eventId;

  const carouselUrls = mediaUrls && mediaUrls.length > 0 ? mediaUrls : imageUrl ? [imageUrl] : [];

  const metaLine = locationName ? `${locationName} · ${timestamp}` : timestamp;

  const handleShare = useCallback(async () => {
    const url = buildPostUrl(postId);
    try {
      await Share.share({
        message: caption
          ? `${caption}\n\nReposted from Mumbai Fitness Mafia\n${url}`
          : `Reposted from Mumbai Fitness Mafia\n${url}`,
        title: 'Share',
      });
    } catch {
      /* dismissed */
    }
  }, [postId, caption]);

  const handleRepost = useCallback(() => {
    onRepost?.();
  }, [onRepost]);

  const openEvent = () => {
    if (eventId) router.push(`/event/${eventId}` as never);
  };

  return (
    <>
      <View style={s.post}>
        {repostLabel ? (
          <View style={s.repostBanner}>
            <Repeat2 size={13} strokeWidth={2} color={colors.tealPrimary} />
            <Text style={s.repostBannerText}>{repostLabel}</Text>
          </View>
        ) : null}

        {/* Header */}
        <View style={s.header}>
          <Pressable style={s.authorArea} onPress={onAuthorPress} disabled={!onAuthorPress}>
            <UserAvatar name={username || avatarInitial} avatarUrl={avatarUrl} size={36} ring />
            <View style={s.authorText}>
              <View style={s.nameRow}>
                <Text style={s.displayName} numberOfLines={1}>
                  {username}
                </Text>
                {isVerified && <BadgeCheck size={14} strokeWidth={2} color={colors.tealPrimary} />}
              </View>
              <View style={s.metaRow}>
                {locationName ? (
                  <View style={s.metaIcon}>
                    <MapPin size={11} strokeWidth={1.75} color={colors.textMuted} />
                  </View>
                ) : null}
                <Text style={s.meta} numberOfLines={1}>
                  {metaLine}
                </Text>
              </View>
            </View>
          </Pressable>

          <View style={s.headerTrailing}>
            {isEventPost && (
              <TouchableOpacity style={s.eventTag} onPress={openEvent} activeOpacity={0.8}>
                <CalendarDays size={12} strokeWidth={2} color={colors.onTeal} />
                <Text style={s.eventTagText}>EVENT</Text>
              </TouchableOpacity>
            )}
            {headerTrailing}
          </View>
        </View>

        {caption ? <Text style={s.caption}>{caption}</Text> : null}

        {taggedUsers && taggedUsers.length > 0 && (
          <View style={s.tagRow}>
            <Text style={s.tagWith}>with </Text>
            {taggedUsers.map((u, i) => (
              <Text key={u.id} style={s.tagHandle}>
                @{u.username}
                {i < taggedUsers.length - 1 ? ', ' : ''}
              </Text>
            ))}
          </View>
        )}

        {carouselUrls.length > 0 ? (
          <View style={s.carouselWrap}>
            <PostMediaCarousel
              urls={carouselUrls}
              onPress={isDetail ? undefined : onPress}
              interactive
            />
          </View>
        ) : null}

        {/* Actions */}
        <View style={s.actions}>
          <TouchableOpacity
            style={s.actionItem}
            onPress={onLike}
            activeOpacity={0.65}
            hitSlop={8}
            accessibilityLabel="Like"
          >
            <Heart
              size={22}
              strokeWidth={isLiked ? 0 : 1.75}
              fill={isLiked ? colors.error : 'none'}
              color={isLiked ? colors.error : colors.textSecondary}
            />
            <Text style={[s.actionCount, isLiked && s.actionCountActive]}>
              {likeCount > 0
                ? likeCount >= 1000
                  ? `${(likeCount / 1000).toFixed(1)}k`
                  : likeCount
                : ''}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={s.actionItem}
            onPress={() => {
              if (onCommentPress) {
                onCommentPress();
                return;
              }
              setCommentsVisible(true);
            }}
            activeOpacity={0.65}
            hitSlop={8}
            accessibilityLabel="Comment"
          >
            <MessageCircle size={21} strokeWidth={1.75} color={colors.textSecondary} />
            <Text style={s.actionCount}>{commentCount > 0 ? commentCount : ''}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={s.actionItem}
            onPress={handleRepost}
            activeOpacity={0.65}
            hitSlop={8}
            accessibilityLabel="Repost"
          >
            <Repeat2
              size={21}
              strokeWidth={1.75}
              color={isReposted ? colors.tealPrimary : colors.textSecondary}
            />
            <Text style={[s.actionCount, isReposted && s.actionCountReposted]}>
              {reshareCount > 0 ? reshareCount : ''}
            </Text>
          </TouchableOpacity>

          <View style={s.actionSpacer} />

          <TouchableOpacity
            style={s.shareBtn}
            onPress={() => void handleShare()}
            activeOpacity={0.65}
            hitSlop={8}
            accessibilityLabel="Share"
          >
            <Share2 size={20} strokeWidth={1.75} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {!isDetail && <View style={s.separator} />}
      </View>

      {!isDetail && (
        <CommentsBottomSheet
          visible={commentsVisible}
          postId={postId}
          onClose={() => setCommentsVisible(false)}
        />
      )}
    </>
  );
}

const s = StyleSheet.create({
  post: {
    backgroundColor: 'transparent',
    marginBottom: 4,
  },
  repostBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 2,
  },
  repostBannerText: {
    fontFamily: fonts.label,
    fontSize: 11,
    color: colors.tealPrimary,
    letterSpacing: 0.4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    gap: 10,
  },
  authorArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  authorText: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  displayName: {
    fontFamily: fonts.bodyStrong,
    fontSize: 15,
    color: colors.textPrimary,
    flexShrink: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  metaIcon: {
    marginRight: 3,
  },
  meta: {
    fontFamily: fonts.caption,
    fontSize: 12,
    color: colors.textMuted,
    flexShrink: 1,
  },
  headerTrailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eventTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.tealPrimary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  eventTagText: {
    fontFamily: fonts.label,
    fontSize: 10,
    color: colors.onTeal,
    letterSpacing: 0.8,
  },
  caption: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 23,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  tagWith: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted },
  tagHandle: { fontFamily: fonts.bodyStrong, fontSize: 13, color: colors.purpleSoft },
  carouselWrap: {
    marginHorizontal: 16,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 4,
    gap: 4,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 52,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  actionSpacer: { flex: 1 },
  shareBtn: {
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  actionCount: {
    fontFamily: fonts.stat,
    fontSize: 13,
    color: colors.textMuted,
    minWidth: 12,
  },
  actionCountActive: {
    color: colors.error,
  },
  actionCountReposted: {
    color: colors.tealPrimary,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.surface3,
    marginHorizontal: 16,
    marginTop: 8,
    opacity: 0.6,
  },
});

export default memo(PostCard);
