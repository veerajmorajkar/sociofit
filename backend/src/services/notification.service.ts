import { db } from '../config/database.js';
import { notifications, users, postMedia } from '../db/schema.js';
import { eq, and, desc, asc, inArray, sql } from 'drizzle-orm';
import { env } from '../config/env.js';

const POST_ACTION_TYPES = new Set(['like', 'comment', 'repost']);

type NotificationRow = typeof notifications.$inferSelect;

async function enrichPostActionNotifications(rows: NotificationRow[]) {
  const postIds = [
    ...new Set(
      rows
        .filter((n) => POST_ACTION_TYPES.has(n.type))
        .map((n) => (n.data as { postId?: string } | null)?.postId)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  if (postIds.length === 0) return rows;

  const mediaRows = await db
    .select({
      postId: postMedia.postId,
      url: postMedia.url,
      thumbnailUrl: postMedia.thumbnailUrl,
    })
    .from(postMedia)
    .where(inArray(postMedia.postId, postIds))
    .orderBy(asc(postMedia.sortOrder));

  const thumbByPost = new Map<string, string>();
  for (const m of mediaRows) {
    if (!thumbByPost.has(m.postId)) {
      thumbByPost.set(m.postId, m.thumbnailUrl ?? m.url);
    }
  }

  return rows.map((n) => {
    if (!POST_ACTION_TYPES.has(n.type)) return n;
    const data = (n.data ?? {}) as Record<string, unknown>;
    const postId = data.postId as string | undefined;
    if (!postId) return n;

    const postImageUrl = (data.postImageUrl as string | undefined) ?? thumbByPost.get(postId);
    const commentPreview =
      n.type === 'comment'
        ? ((data.commentPreview as string | undefined) ?? n.body ?? undefined)
        : undefined;

    if (!postImageUrl && !commentPreview) return n;

    return {
      ...n,
      body: n.type === 'comment' && commentPreview ? commentPreview : n.body,
      data: {
        ...data,
        ...(postImageUrl ? { postImageUrl } : {}),
        ...(commentPreview ? { commentPreview } : {}),
      },
    };
  });
}

// ── Expo Push ─────────────────────────────────────────────────

interface ExpoPushMessage {
  to: string | string[];
  title?: string;
  body?: string;
  data?: Record<string, unknown>;
  sound?: 'default' | null;
  badge?: number;
  priority?: 'default' | 'normal' | 'high';
}

async function sendExpoPush(messages: ExpoPushMessage[]): Promise<void> {
  if (messages.length === 0) return;
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (env.EXPO_ACCESS_TOKEN) {
      headers['Authorization'] = `Bearer ${env.EXPO_ACCESS_TOKEN}`;
    }
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers,
      body: JSON.stringify(messages.length === 1 ? messages[0] : messages),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error('[push] Expo push failed:', res.status, text);
    }
  } catch (err) {
    console.error('[push] Failed to send Expo push notification:', err);
  }
}

// ── Core helpers ──────────────────────────────────────────────

/** Fire-and-forget — must not block request handlers */
export function notifyUser(input: {
  userId: string;
  type: string;
  title: string;
  body?: string;
  data?: Record<string, unknown>;
}) {
  void createNotification(input).catch(() => undefined);
}

export async function createNotification(input: {
  userId: string;
  type: string;
  title: string;
  body?: string;
  data?: Record<string, unknown>;
}) {
  await db.insert(notifications).values({
    userId: input.userId,
    type: input.type,
    title: input.title,
    body: input.body,
    data: input.data,
  });

  // Send real push notification if user has a registered token
  const [user] = await db
    .select({ expoPushToken: users.expoPushToken })
    .from(users)
    .where(eq(users.id, input.userId))
    .limit(1);

  if (user?.expoPushToken) {
    await sendExpoPush([
      {
        to: user.expoPushToken,
        title: input.title,
        body: input.body,
        data: input.data,
        sound: 'default',
        priority: 'high',
      },
    ]);
  }
}

/**
 * Notify multiple users at once (used by event reminder scheduler).
 * Batches push tokens for a single Expo API call.
 */
export async function notifyUsers(
  inputs: Array<{
    userId: string;
    type: string;
    title: string;
    body?: string;
    data?: Record<string, unknown>;
  }>,
) {
  if (inputs.length === 0) return;

  // Bulk insert DB notifications
  await db.insert(notifications).values(
    inputs.map((i) => ({
      userId: i.userId,
      type: i.type,
      title: i.title,
      body: i.body,
      data: i.data,
    })),
  );

  // Fetch tokens for all users
  const userIds = [...new Set(inputs.map((i) => i.userId))];
  const tokenRows = await db
    .select({ id: users.id, expoPushToken: users.expoPushToken })
    .from(users)
    .where(sql`${users.id} = ANY(${userIds})`);

  const tokenMap = new Map(tokenRows.map((r) => [r.id, r.expoPushToken]));

  const messages: ExpoPushMessage[] = inputs.reduce<ExpoPushMessage[]>((acc, i) => {
    const token = tokenMap.get(i.userId);
    if (!token) return acc;
    acc.push({
      to: token,
      title: i.title,
      body: i.body,
      data: i.data,
      sound: 'default',
      priority: 'high',
    });
    return acc;
  }, []);

  await sendExpoPush(messages);
}

// ── Query helpers ─────────────────────────────────────────────

export async function getNotifications(userId: string, cursor?: string, limit = 30) {
  const rows = await db
    .select()
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, userId),
        cursor
          ? sql`${notifications.createdAt} < (SELECT created_at FROM notifications WHERE id = ${cursor})`
          : undefined,
      ),
    )
    .orderBy(desc(notifications.createdAt))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  if (hasMore) rows.pop();

  const enriched = await enrichPostActionNotifications(rows);

  return {
    notifications: enriched,
    cursor: hasMore ? (rows[rows.length - 1]?.id ?? null) : null,
    hasMore,
  };
}

export async function markNotificationRead(userId: string, notificationId: string) {
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));
  return { read: true };
}

export async function markAllNotificationsRead(userId: string) {
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
  return { read: true };
}
