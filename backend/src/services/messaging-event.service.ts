import { db } from '../config/database.js';
import {
  conversations,
  conversationParticipants,
  eventParticipants,
  events,
  messages,
} from '../db/schema.js';
import { eq, and, lte } from 'drizzle-orm';
import {
  CONVERSATION_TYPES,
  EVENT_DISCUSSION_GRACE_HOURS,
  PARTICIPANT_ROLES,
} from '../constants/messaging.js';

const DISCUSSION_SUFFIX = ' Discussion';

function discussionTitle(eventTitle: string): string {
  const trimmed = eventTitle.trim();
  if (trimmed.endsWith(DISCUSSION_SUFFIX)) return trimmed;
  return `${trimmed}${DISCUSSION_SUFFIX}`;
}

/** Idempotent — one event_chat conversation per event */
export async function ensureEventDiscussion(eventId: string): Promise<string> {
  const [existing] = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(
      and(
        eq(conversations.eventId, eventId),
        eq(conversations.type, CONVERSATION_TYPES.EVENT_CHAT),
      ),
    )
    .limit(1);

  if (existing) return existing.id;

  const [event] = await db
    .select({
      id: events.id,
      title: events.title,
      organiserId: events.organiserId,
      endTime: events.endTime,
      chatroomExpiresAt: events.chatroomExpiresAt,
      chatroomActive: events.chatroomActive,
    })
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);

  if (!event) throw new Error('Event not found');

  const expiresAt =
    event.chatroomExpiresAt ??
    new Date(event.endTime.getTime() + EVENT_DISCUSSION_GRACE_HOURS * 60 * 60 * 1000);

  if (!event.chatroomExpiresAt || event.chatroomActive == null) {
    await db
      .update(events)
      .set({
        chatroomActive: event.chatroomActive ?? true,
        chatroomExpiresAt: expiresAt,
      })
      .where(eq(events.id, eventId));
  }

  let conv: { id: string } | undefined;
  try {
    [conv] = await db
      .insert(conversations)
      .values({
        type: CONVERSATION_TYPES.EVENT_CHAT,
        eventId: event.id,
        createdById: event.organiserId,
        title: discussionTitle(event.title),
      })
      .returning({ id: conversations.id });
  } catch (err) {
    // Concurrent RSVPs can both reach this point before either commits (this
    // function isn't itself run inside a lock). If we lost the race to
    // idx_conversations_event_unique, the winner already created the
    // discussion — fetch and use theirs instead of failing the caller.
    const pgError = err as { code?: string };
    if (pgError.code === '23505') {
      const [race] = await db
        .select({ id: conversations.id })
        .from(conversations)
        .where(
          and(
            eq(conversations.eventId, eventId),
            eq(conversations.type, CONVERSATION_TYPES.EVENT_CHAT),
          ),
        )
        .limit(1);
      if (race) return race.id;
    }
    throw err;
  }

  if (!conv) throw new Error('Failed to create event discussion');

  await db.insert(conversationParticipants).values({
    conversationId: conv.id,
    userId: event.organiserId,
    role: PARTICIPANT_ROLES.OWNER,
  });

  // Backfill all confirmed participants
  const participants = await db
    .select({ userId: eventParticipants.userId })
    .from(eventParticipants)
    .where(and(eq(eventParticipants.eventId, eventId), eq(eventParticipants.status, 'confirmed')));

  const toAdd = participants.map((p) => p.userId).filter((uid) => uid !== event.organiserId);

  if (toAdd.length > 0) {
    await db
      .insert(conversationParticipants)
      .values(
        toAdd.map((userId) => ({
          conversationId: conv.id,
          userId,
          role: PARTICIPANT_ROLES.MEMBER,
        })),
      )
      .onConflictDoNothing();
  }

  return conv.id;
}

/** Add a confirmed attendee to the event discussion */
export async function addUserToEventDiscussion(eventId: string, userId: string): Promise<void> {
  const conversationId = await ensureEventDiscussion(eventId);

  const [event] = await db
    .select({ organiserId: events.organiserId })
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);

  if (!event) return;

  await db
    .insert(conversationParticipants)
    .values({
      conversationId,
      userId,
      role: userId === event.organiserId ? PARTICIPANT_ROLES.OWNER : PARTICIPANT_ROLES.MEMBER,
    })
    .onConflictDoNothing();
}

/** Close discussions whose grace period has ended */
export async function closeExpiredDiscussions(): Promise<number> {
  const now = new Date();

  const dueEvents = await db
    .select({
      id: events.id,
      title: events.title,
      organiserId: events.organiserId,
      conversationId: conversations.id,
    })
    .from(events)
    .innerJoin(conversations, eq(conversations.eventId, events.id))
    .where(
      and(
        eq(events.chatroomActive, true),
        eq(events.isActive, true),
        eq(conversations.type, CONVERSATION_TYPES.EVENT_CHAT),
        lte(events.chatroomExpiresAt, now),
      ),
    );

  let closed = 0;
  for (const event of dueEvents) {
    await db.update(events).set({ chatroomActive: false }).where(eq(events.id, event.id));

    await db.insert(messages).values({
      conversationId: event.conversationId,
      senderId: event.organiserId,
      content: 'This discussion is now closed. Only the organiser can post updates.',
      messageType: 'system',
    });

    closed++;
  }

  return closed;
}
