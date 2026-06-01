import { db } from '../config/database.js';
import {
  conversations,
  conversationParticipants,
  messages,
  users,
} from '../db/schema.js';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import type { SendMessageInput } from '../schemas/message.schema.js';

// ── Find or Create DM Conversation ──────────────────────────
export async function findOrCreateDm(userId: string, recipientId: string) {
  if (userId === recipientId) throw new Error('Cannot message yourself');

  // Check recipient exists
  const [recipient] = await db
    .select({ id: users.id, displayName: users.displayName })
    .from(users)
    .where(and(eq(users.id, recipientId), eq(users.isActive, true)))
    .limit(1);
  if (!recipient) throw new Error('User not found');

  // Check if DM already exists between these two users
  const existingConvs = await db
    .select({ conversationId: conversationParticipants.conversationId })
    .from(conversationParticipants)
    .where(eq(conversationParticipants.userId, userId));

  const convIds = existingConvs.map((c) => c.conversationId);

  if (convIds.length > 0) {
    // Find a DM conversation where the recipient is also a participant
    const recipientConvs = await db
      .select({ conversationId: conversationParticipants.conversationId })
      .from(conversationParticipants)
      .innerJoin(conversations, eq(conversations.id, conversationParticipants.conversationId))
      .where(
        and(
          inArray(conversationParticipants.conversationId, convIds),
          eq(conversationParticipants.userId, recipientId),
          eq(conversations.type, 'dm'),
        ),
      );

    if (recipientConvs.length > 0 && recipientConvs[0]) {
      return { conversationId: recipientConvs[0].conversationId, created: false };
    }
  }

  // Create new DM conversation
  const [conv] = await db
    .insert(conversations)
    .values({ type: 'dm' })
    .returning();

  if (!conv) throw new Error('Failed to create conversation');

  // Add both participants
  await db.insert(conversationParticipants).values([
    { conversationId: conv.id, userId, role: 'member' },
    { conversationId: conv.id, userId: recipientId, role: 'member' },
  ]);

  return { conversationId: conv.id, created: true };
}

// ── Send Message ─────────────────────────────────────────────
export async function sendMessage(
  userId: string,
  conversationId: string,
  input: SendMessageInput,
) {
  // Verify user is a participant
  const [participant] = await db
    .select({ id: conversationParticipants.id })
    .from(conversationParticipants)
    .where(
      and(
        eq(conversationParticipants.conversationId, conversationId),
        eq(conversationParticipants.userId, userId),
      ),
    )
    .limit(1);

  if (!participant) throw new Error('Not a participant in this conversation');

  // Insert message
  const [message] = await db
    .insert(messages)
    .values({
      conversationId,
      senderId: userId,
      content: input.content,
      messageType: input.messageType,
      mediaUrl: input.mediaUrl,
    })
    .returning();

  if (!message) throw new Error('Failed to send message');

  // Update conversation last message timestamp
  await db
    .update(conversations)
    .set({ lastMessageAt: new Date() })
    .where(eq(conversations.id, conversationId));

  // Return message with sender info
  const [sender] = await db
    .select({
      id: users.id,
      displayName: users.displayName,
      username: users.username,
      avatarUrl: users.avatarUrl,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return { ...message, sender };
}

// ── Get Messages in Conversation ─────────────────────────────
export async function getMessages(
  userId: string,
  conversationId: string,
  cursor?: string,
  limit = 30,
) {
  // Verify participant
  const [participant] = await db
    .select({ id: conversationParticipants.id })
    .from(conversationParticipants)
    .where(
      and(
        eq(conversationParticipants.conversationId, conversationId),
        eq(conversationParticipants.userId, userId),
      ),
    )
    .limit(1);

  if (!participant) throw new Error('Not a participant in this conversation');

  const result = await db
    .select({
      id: messages.id,
      conversationId: messages.conversationId,
      senderId: messages.senderId,
      content: messages.content,
      messageType: messages.messageType,
      mediaUrl: messages.mediaUrl,
      isDeleted: messages.isDeleted,
      createdAt: messages.createdAt,
      senderName: users.displayName,
      senderUsername: users.username,
      senderAvatar: users.avatarUrl,
    })
    .from(messages)
    .innerJoin(users, eq(messages.senderId, users.id))
    .where(
      and(
        eq(messages.conversationId, conversationId),
        cursor
          ? sql`${messages.createdAt} < (SELECT created_at FROM messages WHERE id = ${cursor})`
          : undefined,
      ),
    )
    .orderBy(desc(messages.createdAt))
    .limit(limit + 1);

  const hasMore = result.length > limit;
  if (hasMore) result.pop();

  // Reshape to include sender object
  const shaped = result.map((m) => ({
    id: m.id,
    conversationId: m.conversationId,
    senderId: m.senderId,
    content: m.isDeleted ? null : m.content,
    messageType: m.messageType,
    mediaUrl: m.isDeleted ? null : m.mediaUrl,
    isDeleted: m.isDeleted,
    createdAt: m.createdAt,
    sender: {
      id: m.senderId,
      displayName: m.senderName,
      username: m.senderUsername,
      avatarUrl: m.senderAvatar,
    },
  }));

  // Update last read
  await db
    .update(conversationParticipants)
    .set({ lastReadAt: new Date() })
    .where(
      and(
        eq(conversationParticipants.conversationId, conversationId),
        eq(conversationParticipants.userId, userId),
      ),
    );

  return {
    messages: shaped,
    cursor: hasMore ? (shaped[shaped.length - 1]?.id ?? null) : null,
    hasMore,
  };
}

// ── Get Conversation List ────────────────────────────────────
export async function getConversations(userId: string, cursor?: string, limit = 20) {
  // Get all conversation IDs this user is part of
  const userConvs = await db
    .select({ conversationId: conversationParticipants.conversationId })
    .from(conversationParticipants)
    .where(eq(conversationParticipants.userId, userId));

  const convIds = userConvs.map((c) => c.conversationId);
  if (convIds.length === 0) return { conversations: [], cursor: null, hasMore: false };

  // Get conversations with last message
  const convs = await db
    .select()
    .from(conversations)
    .where(
      and(
        inArray(conversations.id, convIds),
        eq(conversations.isActive, true),
        cursor
          ? sql`${conversations.lastMessageAt} < (SELECT last_message_at FROM conversations WHERE id = ${cursor})`
          : undefined,
      ),
    )
    .orderBy(desc(conversations.lastMessageAt))
    .limit(limit + 1);

  const hasMore = convs.length > limit;
  if (hasMore) convs.pop();

  // For each conversation, get the other participant(s) and last message
  const enriched = await Promise.all(
    convs.map(async (conv) => {
      // Get other participants
      const participants = await db
        .select({
          id: users.id,
          displayName: users.displayName,
          username: users.username,
          avatarUrl: users.avatarUrl,
          accountType: users.accountType,
        })
        .from(conversationParticipants)
        .innerJoin(users, eq(conversationParticipants.userId, users.id))
        .where(
          and(
            eq(conversationParticipants.conversationId, conv.id),
            sql`${conversationParticipants.userId} != ${userId}`,
          ),
        );

      // Get last message
      const [lastMessage] = await db
        .select({
          content: messages.content,
          messageType: messages.messageType,
          senderId: messages.senderId,
          createdAt: messages.createdAt,
          isDeleted: messages.isDeleted,
        })
        .from(messages)
        .where(eq(messages.conversationId, conv.id))
        .orderBy(desc(messages.createdAt))
        .limit(1);

      // Get unread count
      const [myParticipant] = await db
        .select({ lastReadAt: conversationParticipants.lastReadAt })
        .from(conversationParticipants)
        .where(
          and(
            eq(conversationParticipants.conversationId, conv.id),
            eq(conversationParticipants.userId, userId),
          ),
        )
        .limit(1);

      let unreadCount = 0;
      if (myParticipant) {
        const [unread] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(messages)
          .where(
            and(
              eq(messages.conversationId, conv.id),
              sql`${messages.senderId} != ${userId}`,
              myParticipant.lastReadAt
                ? sql`${messages.createdAt} > ${myParticipant.lastReadAt}`
                : sql`1=1`,
            ),
          );
        unreadCount = unread?.count ?? 0;
      }

      return {
        id: conv.id,
        type: conv.type,
        title: conv.title,
        lastMessageAt: conv.lastMessageAt,
        participants,
        lastMessage: lastMessage
          ? {
              content: lastMessage.isDeleted ? 'Message deleted' : lastMessage.content,
              messageType: lastMessage.messageType,
              senderId: lastMessage.senderId,
              createdAt: lastMessage.createdAt,
            }
          : null,
        unreadCount,
      };
    }),
  );

  return {
    conversations: enriched,
    cursor: hasMore ? (convs[convs.length - 1]?.id ?? null) : null,
    hasMore,
  };
}

// ── Mark Conversation as Read ────────────────────────────────
export async function markAsRead(userId: string, conversationId: string) {
  await db
    .update(conversationParticipants)
    .set({ lastReadAt: new Date() })
    .where(
      and(
        eq(conversationParticipants.conversationId, conversationId),
        eq(conversationParticipants.userId, userId),
      ),
    );
  return { read: true };
}
