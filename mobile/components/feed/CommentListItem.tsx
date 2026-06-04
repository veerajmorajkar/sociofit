import { View, Text, StyleSheet } from 'react-native';
import UserAvatar from '@/components/ui/UserAvatar';
import { colors, fonts, radius, shadows } from '@/constants/theme';
import { timeAgo } from '@/utils/formatDate';
import type { Comment } from '@/types/post';

export default function CommentListItem({ comment }: { comment: Comment }) {
  return (
    <View style={s.card}>
      <UserAvatar
        name={comment.author.displayName}
        avatarUrl={comment.author.avatarUrl}
        size={34}
        ring
      />
      <View style={s.body}>
        <View style={s.header}>
          <Text style={s.author}>{comment.author.displayName}</Text>
          <Text style={s.time}>{timeAgo(comment.createdAt)}</Text>
        </View>
        <Text style={s.text}>{comment.content}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.surface3,
    ...shadows.sm,
  },
  body: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 3,
  },
  author: {
    fontFamily: fonts.bodyStrong,
    fontSize: 13,
    color: colors.textPrimary,
  },
  time: {
    fontFamily: fonts.caption,
    fontSize: 11,
    color: colors.textMuted,
  },
  text: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
