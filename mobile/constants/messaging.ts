import { colors } from '@/constants/theme';
import type { Conversation, ConversationType } from '@/types/message';

export const CONVERSATION_TYPE_LABELS: Record<ConversationType, string> = {
  dm: 'DM',
  group: 'GROUP',
  event_chat: 'DISCUSSION',
  club_announcement: 'ANNOUNCEMENTS',
};

export const CONVERSATION_TYPE_COLORS: Record<
  ConversationType,
  { bg: string; text: string; border: string }
> = {
  dm: {
    bg: 'rgba(123, 77, 255, 0.14)',
    text: colors.purpleSoft,
    border: 'rgba(123, 77, 255, 0.28)',
  },
  group: {
    bg: 'rgba(0, 229, 195, 0.12)',
    text: colors.tealPrimary,
    border: 'rgba(0, 229, 195, 0.28)',
  },
  event_chat: {
    bg: 'rgba(91, 46, 204, 0.18)',
    text: colors.purpleSoft,
    border: 'rgba(91, 46, 204, 0.32)',
  },
  club_announcement: {
    bg: 'rgba(201, 168, 76, 0.14)',
    text: colors.goldLight,
    border: 'rgba(201, 168, 76, 0.32)',
  },
};

export function getConversationPresentation(conv: Conversation): {
  title: string;
  subtitle: string | null;
  avatarName: string;
  avatarUrl: string | null;
} {
  const other = conv.participants[0];

  switch (conv.type) {
    case 'dm':
      return {
        title: other?.displayName ?? 'Direct message',
        subtitle: other ? `@${other.username}` : null,
        avatarName: other?.displayName ?? '?',
        avatarUrl: other?.avatarUrl ?? null,
      };
    case 'group':
      return {
        title: conv.title ?? 'Group',
        subtitle: conv.memberCount > 0 ? `${conv.memberCount} members` : 'Group chat',
        avatarName: conv.title ?? 'G',
        avatarUrl: null,
      };
    case 'event_chat':
      return {
        title: conv.title ?? 'Event discussion',
        subtitle:
          conv.permissions?.discussionPhase === 'organiser_only'
            ? 'Organiser updates only'
            : conv.memberCount > 0
              ? `${conv.memberCount} in discussion`
              : 'Event discussion',
        avatarName: conv.title ?? 'E',
        avatarUrl: null,
      };
    case 'club_announcement':
      return {
        title: conv.title ?? 'Announcements',
        subtitle: conv.permissions?.isReadOnly ? 'Club broadcasts' : 'Your announcement channel',
        avatarName: conv.title ?? 'A',
        avatarUrl: other?.avatarUrl ?? null,
      };
    default:
      return {
        title: conv.title ?? other?.displayName ?? 'Chat',
        subtitle: null,
        avatarName: other?.displayName ?? '?',
        avatarUrl: other?.avatarUrl ?? null,
      };
  }
}

export function getReadOnlyBannerText(
  type: ConversationType,
  discussionPhase?: 'open' | 'organiser_only' | null,
): string | null {
  if (type === 'event_chat' && discussionPhase === 'organiser_only') {
    return 'Discussion closed — only the organiser can post. History stays visible.';
  }
  if (type === 'club_announcement') {
    return 'Announcement channel — only the club can post here.';
  }
  return null;
}
