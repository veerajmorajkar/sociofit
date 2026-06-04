export interface AppNotification {
  id: string;
  userId: string;
  type: string;
  title: string | null;
  body: string | null;
  data: {
    postId?: string;
    postImageUrl?: string;
    commentPreview?: string;
    eventId?: string;
    userId?: string;
  } | null;
  isRead: boolean | null;
  createdAt: string;
}

export const POST_ACTION_NOTIFICATION_TYPES = ['like', 'comment', 'repost'] as const;

export function isPostActionNotification(type: string): boolean {
  return (POST_ACTION_NOTIFICATION_TYPES as readonly string[]).includes(type);
}
