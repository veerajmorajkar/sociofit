import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { Heart, MessageSquare } from 'lucide-react-native';
import { colors, fonts, radius } from '@/constants/theme';

interface PostCardProps {
  username: string;
  activity: string;
  timestamp: string;
  caption?: string;
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
  avatarInitial: string;
  onLike?: () => void;
  onPress?: () => void;
}

export default function PostCard({
  username,
  activity,
  timestamp,
  caption,
  likeCount,
  commentCount,
  isLiked,
  avatarInitial,
  onLike,
  onPress,
}: PostCardProps) {
  return (
    <Pressable onPress={onPress} style={styles.card}>
      {/* Header: avatar + info — no badge, clean */}
      <View style={styles.header}>
        {/* Avatar — circle with cream ring (personal = cream) */}
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{avatarInitial}</Text>
        </View>

        <View style={styles.headerInfo}>
          <Text style={styles.username}>{username.toUpperCase()}</Text>
          <Text style={styles.meta}>
            {activity} · {timestamp}
          </Text>
        </View>
      </View>

      {/* Media well — carved neumorphic */}
      <View style={styles.mediaWell} />

      {/* Caption */}
      {caption ? (
        <Text style={styles.caption} numberOfLines={3}>{caption}</Text>
      ) : null}

      {/* Footer: stats left, no action button on personal posts */}
      <View style={styles.footer}>
        <View style={styles.stats}>
          <Pressable onPress={onLike} style={styles.statItem} hitSlop={8}>
            <Heart
              size={18}
              strokeWidth={isLiked ? 0 : 1.5}
              fill={isLiked ? colors.error : 'none'}
              color={isLiked ? colors.error : colors.text3}
            />
            <Text style={[styles.statText, isLiked && { color: colors.error }]}>
              {likeCount}
            </Text>
          </Pressable>

          <View style={styles.statDot} />

          <View style={styles.statItem}>
            <MessageSquare size={16} strokeWidth={1.5} color={colors.text3} />
            <Text style={styles.statText}>{commentCount}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 5, height: 5 },
        shadowOpacity: 0.5,
        shadowRadius: 14,
      },
      android: { elevation: 8 },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surface3,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.cream,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 3, height: 3 },
        shadowOpacity: 0.4,
        shadowRadius: 6,
      },
      android: { elevation: 4 },
    }),
  },
  avatarText: {
    fontFamily: fonts.heading,
    fontSize: 16,
    color: colors.cream,
  },
  headerInfo: {
    flex: 1,
  },
  username: {
    fontFamily: fonts.heading,
    fontSize: 14,
    color: colors.cream,
    letterSpacing: 0.5,
  },
  meta: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.text3,
    marginTop: 2,
  },
  mediaWell: {
    height: 180,
    borderRadius: 12,
    backgroundColor: colors.surface2,
    marginBottom: 14,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 4, height: 4 },
        shadowOpacity: 0.45,
        shadowRadius: 10,
      },
      android: { elevation: 2 },
    }),
  },
  caption: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.text2,
    lineHeight: 20,
    marginBottom: 14,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.text4,
  },
  statText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.text3,
  },
});
