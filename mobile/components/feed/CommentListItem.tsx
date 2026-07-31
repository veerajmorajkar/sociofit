import { View, Text, StyleSheet } from 'react-native';
import UserAvatar from '@/components/ui/UserAvatar';
import { fonts, radius } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { timeAgo } from '@/utils/formatDate';
import type { Comment } from '@/types/post';

export default function CommentListItem({ comment }: { comment: Comment }) {
  const { theme } = useTheme();

  return (
    <View
      style={[
        s.bubble,
        {
          backgroundColor: theme.surface2,
          borderColor: theme.surface3,
          ...theme.shadows.sm,
        },
      ]}
    >
      <View style={s.topRow}>
        <View style={s.avatarSlot}>
          <UserAvatar
            name={comment.author.displayName}
            avatarUrl={comment.author.avatarUrl}
            size={30}
            ring
          />
        </View>
        <View style={s.header}>
          <Text style={[s.author, { color: theme.textPrimary }]} numberOfLines={1}>
            {comment.author.displayName}
          </Text>
          <Text style={[s.time, { color: theme.textMuted }]}>{timeAgo(comment.createdAt)}</Text>
        </View>
      </View>
      <Text style={[s.text, { color: theme.textSecondary }]}>{comment.content}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  bubble: {
    padding: 12,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  avatarSlot: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  author: {
    fontFamily: fonts.bodyStrong,
    fontSize: 13,
    flex: 1,
    minWidth: 0,
  },
  time: {
    fontFamily: fonts.caption,
    fontSize: 11,
  },
  text: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
  },
});
