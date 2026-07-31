import { db } from '../config/database.js';
import { conversations, conversationParticipants, messages, users } from '../db/schema.js';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import type { SendMessageInput } from '../schemas/message.schema.js';
import {
  CONVERSATION_TYPES,
  GROUP_MEMBER_LIMIT,
  PARTICIPANT_ROLES,
  type ConversationType,
} from '../constants/messaging.js';
import {
  assertCanSend,
  getParticipantContext,
  resolvePermissions,
  validateActiveUsers,
} from './messaging-permissions.js';
import {
  assertFollowsClub,
  isFollowingClub,
  leaveClubAnnouncement,
} from './messaging-club.service.js';

// ── Find or Create DM Conversation ──────────────────────────
export async function findOrCreateDm(userId: string, recipientId: string) {
  if (userId === recipientId) throw new Error('Cannot message yourself');

  const [recipient] = await db
    .select({ id: users.id, displayName: users.displayName })
    .from(users)
    .where(and(eq(users.id, recipientId), eq(users.isActive, true)))
    .limit(1);
  if (!recipient) throw new Error('User not found');

  const existingConvs = await db
    .select({ conversationId: conversationParticipants.conversationId })
    .from(conversationParticipants)
    .where(eq(conversationParticipants.userId, userId));

  const convIds = existingConvs.map((c) => c.conversationId);

  if (convIds.length > 0) {
    const recipientConvs = await db
      .select({ conversationId: conversationParticipants.conversationId })
      .from(conversationParticipants)
      .innerJoin(conversations, eq(conversations.id, conversationParticipants.conversationId))
      .where(
        and(
          inArray(conversationParticipants.conversationId, convIds),
          eq(conversationParticipants.userId, recipientId),
          eq(conversations.type, CONVERSATION_TYPES.DM),
        ),
      );

    if (recipientConvs.length > 0 && recipientConvs[0]) {
      return { conversationId: recipientConvs[0].conversationId, created: false };
    }
  }

  const [conv] = await db
    .insert(conversations)
    .values({ type: CONVERSATION_TYPES.DM, createdById: userId })
    .returning();

  if (!conv) throw new Error('Failed to create conversation');

  await db.insert(conversationParticipants).values([
    { conversationId: conv.id, userId, role: PARTICIPANT_ROLES.MEMBER },
    { conversationId: conv.id, userId: recipientId, role: PARTICIPANT_ROLES.MEMBER },
  ]);

  return { conversationId: conv.id, created: true };
}

// ── Create Group ─────────────────────────────────────────────
export async function createGroup(userId: string, title: string, memberIds: string[]) {
  const uniqueMembers = [...new Set(memberIds.filter((id) => id !== userId))];
  if (uniqueMembers.length < 1) {
    throw new Error('Add at least one other athlete to the group');
  }
  if (uniqueMembers.length + 1 > GROUP_MEMBER_LIMIT) {
    throw new Error(`Groups can have at most ${GROUP_MEMBER_LIMIT} members`);
  }

  await validateActiveUsers(uniqueMembers);

  const [conv] = await db
    .insert(conversations)
    .values({
      type: CONVERSATION_TYPES.GROUP,
      title: title.trim(),
      createdById: userId,
    })
    .returning();

  if (!conv) throw new Error('Failed to create group');

  await db.insert(conversationParticipants).values([
    { conversationId: conv.id, userId, role: PARTICIPANT_ROLES.OWNER },
    ...uniqueMembers.map((id) => ({
      conversationId: conv.id,
      userId: id,
      role: PARTICIPANT_ROLES.MEMBER,
    })),
  ]);

  return { conversationId: conv.id, memberCount: uniqueMembers.length + 1 };
}

// ── Add members to group ─────────────────────────────────────
export async function addGroupMembers(userId: string, conversationId: string, memberIds: string[]) {
  const ctx = await getParticipantContext(userId, conversationId);
  if (!ctx) throw new Error('Not a participant in this conversation');
  if (ctx.conversationType !== CONVERSATION_TYPES.GROUP) {
    throw new Error('Members can only be added to groups');
  }

  const perms = resolvePermissions(ctx, userId);
  if (!perms.canAddMembers) throw new Error('Only the group owner can add members');

  const uniqueMembers = [...new Set(memberIds.filter((id) => id !== userId))];
  if (uniqueMembers.length === 0) throw new Error('No new members to add');

  const [countRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(conversationParticipants)
    .where(eq(conversationParticipants.conversationId, conversationId));

  const currentCount = countRow?.count ?? 0;
  if (currentCount + uniqueMembers.length > GROUP_MEMBER_LIMIT) {
    throw new Error(`Groups can have at most ${GROUP_MEMBER_LIMIT} members`);
  }

  await validateActiveUsers(uniqueMembers);

  await db
    .insert(conversationParticipants)
    .values(
      uniqueMembers.map((id) => ({
        conversationId,
        userId: id,
        role: PARTICIPANT_ROLES.MEMBER,
      })),
    )
    .onConflictDoNothing();

  return { added: uniqueMembers.length };
}

// ── Leave / remove from group ────────────────────────────────
export async function leaveConversation(userId: string, conversationId: string) {
  const ctx = await getParticipantContext(userId, conversationId);
  if (!ctx) throw new Error('Not a participant in this conversation');

  const perms = resolvePermissions(ctx, userId);
  if (!perms.canLeave) throw new Error('You cannot leave this conversation');

  await db
    .delete(conversationParticipants)
    .where(
      and(
        eq(conversationParticipants.conversationId, conversationId),
        eq(conversationParticipants.userId, userId),
      ),
    );

  return { left: true };
}

export async function removeGroupMember(ownerId: string, conversationId: string, memberId: string) {
  const ctx = await getParticipantContext(ownerId, conversationId);
  if (!ctx) throw new Error('Not a participant in this conversation');
  if (ctx.conversationType !== CONVERSATION_TYPES.GROUP) {
    throw new Error('Members can only be removed from groups');
  }

  const perms = resolvePermissions(ctx, ownerId);
  if (!perms.canAddMembers) throw new Error('Only the group owner can remove members');
  if (memberId === ownerId) throw new Error('Owner cannot be removed');

  await db
    .delete(conversationParticipants)
    .where(
      and(
        eq(conversationParticipants.conversationId, conversationId),
        eq(conversationParticipants.userId, memberId),
      ),
    );

  return { removed: true };
}

async function assertClubAnnouncementAccess(
  userId: string,
  ctx: NonNullable<Awaited<ReturnType<typeof getParticipantContext>>>,
): Promise<void> {
  if (ctx.conversationType !== CONVERSATION_TYPES.CLUB_ANNOUNCEMENT || !ctx.clubId) return;
  if (ctx.participantRole === PARTICIPANT_ROLES.OWNER) return;
  await assertFollowsClub(userId, ctx.clubId);
}

// ── Get single conversation (detail + permissions) ───────────
export async function getConversationById(userId: string, conversationId: string) {
  const ctx = await getParticipantContext(userId, conversationId);
  if (!ctx) throw new Error('Not a participant in this conversation');
  await assertClubAnnouncementAccess(userId, ctx);

  const [conv] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, conversationId))
    .limit(1);

  if (!conv) throw new Error('Conversation not found');

  const participants = await db
    .select({
      id: users.id,
      displayName: users.displayName,
      username: users.username,
      avatarUrl: users.avatarUrl,
      accountType: users.accountType,
      role: conversationParticipants.role,
    })
    .from(conversationParticipants)
    .innerJoin(users, eq(conversationParticipants.userId, users.id))
    .where(eq(conversationParticipants.conversationId, conversationId));

  const [memberCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(conversationParticipants)
    .where(eq(conversationParticipants.conversationId, conversationId));

  const perms = resolvePermissions(ctx, userId);

  return {
    id: conv.id,
    type: conv.type as ConversationType,
    title: conv.title,
    eventId: conv.eventId,
    clubId: conv.clubId,
    createdById: conv.createdById,
    lastMessageAt: conv.lastMessageAt,
    memberCount: memberCount?.count ?? 0,
    participants,
    permissions: perms,
  };
}

// ── Send Message ─────────────────────────────────────────────
export async function sendMessage(userId: string, conversationId: string, input: SendMessageInput) {
  await assertCanSend(userId, conversationId);

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

  await db
    .update(conversations)
    .set({ lastMessageAt: new Date() })
    .where(eq(conversations.id, conversationId));

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
  const ctx = await getParticipantContext(userId, conversationId);
  if (!ctx) throw new Error('Not a participant in this conversation');
  await assertClubAnnouncementAccess(userId, ctx);

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

  await db
    .update(conversationParticipants)
    .set({ lastReadAt: new Date() })
    .where(
      and(
        eq(conversationParticipants.conversationId, conversationId),
        eq(conversationParticipants.userId, userId),
      ),
    );

  const permissions = resolvePermissions(ctx, userId);

  return {
    messages: shaped,
    cursor: hasMore ? (shaped[shaped.length - 1]?.id ?? null) : null,
    hasMore,
    permissions,
  };
}

// ── Get Conversation List ────────────────────────────────────
export async function getConversations(userId: string, cursor?: string, limit = 20) {
  const userConvs = await db
    .select({ conversationId: conversationParticipants.conversationId })
    .from(conversationParticipants)
    .where(eq(conversationParticipants.userId, userId));

  const convIds = userConvs.map((c) => c.conversationId);
  if (convIds.length === 0) return { conversations: [], cursor: null, hasMore: false };

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

  const enriched = await Promise.all(
    convs.map(async (conv) => {
      const ctx = await getParticipantContext(userId, conv.id);
      const permissions = ctx ? resolvePermissions(ctx, userId) : null;

      const participants =
        conv.type === CONVERSATION_TYPES.DM
          ? await db
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
              )
          : [];

      const [memberCount] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(conversationParticipants)
        .where(eq(conversationParticipants.conversationId, conv.id));

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

      if (
        conv.type === CONVERSATION_TYPES.CLUB_ANNOUNCEMENT &&
        conv.clubId &&
        ctx?.participantRole === PARTICIPANT_ROLES.SUBSCRIBER
      ) {
        const followsClub = await isFollowingClub(userId, conv.clubId);
        if (!followsClub) {
          await leaveClubAnnouncement(userId, conv.clubId);
          return null;
        }
      }

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
        eventId: conv.eventId,
        clubId: conv.clubId,
        lastMessageAt: conv.lastMessageAt,
        memberCount: memberCount?.count ?? 0,
        participants,
        lastMessage: lastMessage
          ? {
              content: lastMessage.isDeleted
                ? 'Message deleted'
                : lastMessage.messageType === 'system'
                  ? lastMessage.content
                  : lastMessage.content,
              messageType: lastMessage.messageType,
              senderId: lastMessage.senderId,
              createdAt: lastMessage.createdAt,
            }
          : null,
        unreadCount,
        permissions,
      };
    }),
  );

  const visible = enriched.filter((conv) => conv !== null);

  return {
    conversations: visible,
    cursor: hasMore ? (convs[convs.length - 1]?.id ?? null) : null,
    hasMore,
  };
}

// ── Mark Conversation as Read ────────────────────────────────
export async function markAsRead(userId: string, conversationId: string) {
  const ctx = await getParticipantContext(userId, conversationId);
  if (!ctx) throw new Error('Not a participant in this conversation');

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

// ── Mute / unmute ────────────────────────────────────────────
export async function setConversationMuted(userId: string, conversationId: string, muted: boolean) {
  const ctx = await getParticipantContext(userId, conversationId);
  if (!ctx) throw new Error('Not a participant in this conversation');

  await db
    .update(conversationParticipants)
    .set({ isMuted: muted })
    .where(
      and(
        eq(conversationParticipants.conversationId, conversationId),
        eq(conversationParticipants.userId, userId),
      ),
    );

  return { muted };
}
