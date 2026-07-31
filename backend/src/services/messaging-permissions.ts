import { db } from '../config/database.js';
import { conversations, conversationParticipants, events, users } from '../db/schema.js';
import { eq, and, inArray } from 'drizzle-orm';
import {
  CONVERSATION_TYPES,
  PARTICIPANT_ROLES,
  type ConversationType,
  type ParticipantRole,
} from '../constants/messaging.js';

export interface ConversationPermissions {
  canSend: boolean;
  canAddMembers: boolean;
  canLeave: boolean;
  isReadOnly: boolean;
  /** open = everyone can chat; organiser_only = post-event grace ended */
  discussionPhase: 'open' | 'organiser_only' | null;
  role: ParticipantRole;
}

export interface ParticipantContext {
  conversationId: string;
  conversationType: ConversationType;
  participantRole: ParticipantRole;
  eventId: string | null;
  clubId: string | null;
  organiserId: string | null;
  chatroomActive: boolean | null;
  chatroomExpiresAt: Date | null;
}

export async function getParticipantContext(
  userId: string,
  conversationId: string,
): Promise<ParticipantContext | null> {
  const [row] = await db
    .select({
      conversationId: conversations.id,
      conversationType: conversations.type,
      eventId: conversations.eventId,
      clubId: conversations.clubId,
      participantRole: conversationParticipants.role,
      chatroomActive: events.chatroomActive,
      chatroomExpiresAt: events.chatroomExpiresAt,
      organiserId: events.organiserId,
    })
    .from(conversationParticipants)
    .innerJoin(conversations, eq(conversations.id, conversationParticipants.conversationId))
    .leftJoin(events, eq(events.id, conversations.eventId))
    .where(
      and(
        eq(conversationParticipants.conversationId, conversationId),
        eq(conversationParticipants.userId, userId),
        eq(conversations.isActive, true),
      ),
    )
    .limit(1);

  if (!row) return null;

  return {
    conversationId: row.conversationId,
    conversationType: row.conversationType as ConversationType,
    participantRole: (row.participantRole ?? PARTICIPANT_ROLES.MEMBER) as ParticipantRole,
    eventId: row.eventId,
    clubId: row.clubId,
    organiserId: row.organiserId,
    chatroomActive: row.chatroomActive,
    chatroomExpiresAt: row.chatroomExpiresAt,
  };
}

export function resolvePermissions(
  ctx: ParticipantContext,
  userId: string,
): ConversationPermissions {
  const role = ctx.participantRole;
  const isOwner = role === PARTICIPANT_ROLES.OWNER;
  const isOrganiser = ctx.organiserId === userId;

  switch (ctx.conversationType) {
    case CONVERSATION_TYPES.DM:
      return {
        canSend: true,
        canAddMembers: false,
        canLeave: false,
        isReadOnly: false,
        discussionPhase: null,
        role,
      };

    case CONVERSATION_TYPES.GROUP:
      return {
        canSend: true,
        canAddMembers: isOwner,
        canLeave: true,
        isReadOnly: false,
        discussionPhase: null,
        role,
      };

    case CONVERSATION_TYPES.EVENT_CHAT: {
      const graceEnded = ctx.chatroomExpiresAt != null && new Date() > ctx.chatroomExpiresAt;
      const discussionClosed = ctx.chatroomActive === false || graceEnded;
      const canSendAsMember = !discussionClosed;
      const canSendAsOrganiser = isOrganiser || isOwner;

      return {
        canSend: canSendAsMember || canSendAsOrganiser,
        canAddMembers: false,
        canLeave: false,
        isReadOnly: discussionClosed && !canSendAsOrganiser,
        discussionPhase: discussionClosed ? 'organiser_only' : 'open',
        role,
      };
    }

    case CONVERSATION_TYPES.CLUB_ANNOUNCEMENT:
      return {
        canSend: isOwner,
        canAddMembers: false,
        canLeave: role === PARTICIPANT_ROLES.SUBSCRIBER,
        isReadOnly: !isOwner,
        discussionPhase: null,
        role,
      };

    default:
      return {
        canSend: false,
        canAddMembers: false,
        canLeave: false,
        isReadOnly: true,
        discussionPhase: null,
        role,
      };
  }
}

export async function assertCanSend(userId: string, conversationId: string): Promise<void> {
  const ctx = await getParticipantContext(userId, conversationId);
  if (!ctx) throw new Error('Not a participant in this conversation');

  const perms = resolvePermissions(ctx, userId);
  if (!perms.canSend) {
    if (
      ctx.conversationType === CONVERSATION_TYPES.EVENT_CHAT &&
      perms.discussionPhase === 'organiser_only'
    ) {
      throw new Error('Discussion is closed — only the organiser can post now');
    }
    if (ctx.conversationType === CONVERSATION_TYPES.CLUB_ANNOUNCEMENT) {
      throw new Error('Only the club can post in this announcement channel');
    }
    throw new Error('You cannot send messages in this conversation');
  }
}

/** Validate target users exist and are active before adding to a conversation */
export async function validateActiveUsers(userIds: string[]): Promise<void> {
  if (userIds.length === 0) return;

  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(and(inArray(users.id, userIds), eq(users.isActive, true)));

  if (rows.length !== userIds.length) throw new Error('One or more users not found');
}
