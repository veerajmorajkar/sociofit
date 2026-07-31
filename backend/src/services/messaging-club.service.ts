import { db } from '../config/database.js';
import { conversations, conversationParticipants, follows, users } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { CONVERSATION_TYPES, PARTICIPANT_ROLES } from '../constants/messaging.js';

export const CLUB_ANNOUNCEMENT_FOLLOW_REQUIRED = 'Follow the club to view announcements';

export async function isFollowingClub(followerId: string, clubUserId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: follows.id })
    .from(follows)
    .where(and(eq(follows.followerId, followerId), eq(follows.followingId, clubUserId)))
    .limit(1);
  return !!row;
}

export async function assertFollowsClub(userId: string, clubUserId: string): Promise<void> {
  if (userId === clubUserId) return;
  const followsClub = await isFollowingClub(userId, clubUserId);
  if (!followsClub) throw new Error(CLUB_ANNOUNCEMENT_FOLLOW_REQUIRED);
}

const ANNOUNCEMENT_TITLE = 'Announcements';

/** Idempotent — each club account gets exactly one announcement channel */
export async function ensureClubAnnouncementChannel(clubUserId: string): Promise<string> {
  const [club] = await db
    .select({
      id: users.id,
      displayName: users.displayName,
      accountType: users.accountType,
    })
    .from(users)
    .where(and(eq(users.id, clubUserId), eq(users.isActive, true)))
    .limit(1);

  if (!club) throw new Error('Club not found');
  if (club.accountType !== 'club') throw new Error('User is not a club account');

  const [existing] = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(
      and(
        eq(conversations.clubId, clubUserId),
        eq(conversations.type, CONVERSATION_TYPES.CLUB_ANNOUNCEMENT),
      ),
    )
    .limit(1);

  if (existing) return existing.id;

  const [conv] = await db
    .insert(conversations)
    .values({
      type: CONVERSATION_TYPES.CLUB_ANNOUNCEMENT,
      clubId: clubUserId,
      createdById: clubUserId,
      title: `${club.displayName} · ${ANNOUNCEMENT_TITLE}`,
    })
    .returning({ id: conversations.id });

  if (!conv) throw new Error('Failed to create announcement channel');

  await db.insert(conversationParticipants).values({
    conversationId: conv.id,
    userId: clubUserId,
    role: PARTICIPANT_ROLES.OWNER,
  });

  return conv.id;
}

/** Subscribe a user to a club's announcement channel (profile button) */
export async function joinClubAnnouncement(
  userId: string,
  clubUserId: string,
): Promise<{ conversationId: string; joined: boolean }> {
  if (userId === clubUserId) throw new Error('Club cannot subscribe to its own channel');

  await assertFollowsClub(userId, clubUserId);

  const conversationId = await ensureClubAnnouncementChannel(clubUserId);

  const [existing] = await db
    .select({ id: conversationParticipants.id })
    .from(conversationParticipants)
    .where(
      and(
        eq(conversationParticipants.conversationId, conversationId),
        eq(conversationParticipants.userId, userId),
      ),
    )
    .limit(1);

  if (existing) return { conversationId, joined: false };

  await db.insert(conversationParticipants).values({
    conversationId,
    userId,
    role: PARTICIPANT_ROLES.SUBSCRIBER,
  });

  return { conversationId, joined: true };
}

/** Remove subscriber access when a user unfollows a club */
export async function leaveClubAnnouncement(userId: string, clubUserId: string): Promise<void> {
  if (userId === clubUserId) return;

  const [existing] = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(
      and(
        eq(conversations.clubId, clubUserId),
        eq(conversations.type, CONVERSATION_TYPES.CLUB_ANNOUNCEMENT),
      ),
    )
    .limit(1);

  if (!existing) return;

  await db
    .delete(conversationParticipants)
    .where(
      and(
        eq(conversationParticipants.conversationId, existing.id),
        eq(conversationParticipants.userId, userId),
        eq(conversationParticipants.role, PARTICIPANT_ROLES.SUBSCRIBER),
      ),
    );
}

/** For club profile — whether viewer is subscribed */
export async function getClubAnnouncementMeta(
  clubUserId: string,
  viewerId?: string,
): Promise<{
  conversationId: string | null;
  title: string;
  isSubscribed: boolean;
  subscriberCount: number;
  canView: boolean;
} | null> {
  const [club] = await db
    .select({ accountType: users.accountType })
    .from(users)
    .where(and(eq(users.id, clubUserId), eq(users.isActive, true)))
    .limit(1);

  if (!club || club.accountType !== 'club') return null;

  const conversationId = await ensureClubAnnouncementChannel(clubUserId);

  const [conv] = await db
    .select({ title: conversations.title })
    .from(conversations)
    .where(eq(conversations.id, conversationId))
    .limit(1);

  const isClubOwner = viewerId === clubUserId;
  let isSubscribed = false;
  let canView = isClubOwner;

  if (viewerId && !isClubOwner) {
    const followsClub = await isFollowingClub(viewerId, clubUserId);
    canView = followsClub;

    const [part] = await db
      .select({ id: conversationParticipants.id, role: conversationParticipants.role })
      .from(conversationParticipants)
      .where(
        and(
          eq(conversationParticipants.conversationId, conversationId),
          eq(conversationParticipants.userId, viewerId),
        ),
      )
      .limit(1);
    isSubscribed =
      part?.role === PARTICIPANT_ROLES.SUBSCRIBER || part?.role === PARTICIPANT_ROLES.OWNER;
  } else if (isClubOwner) {
    isSubscribed = true;
  }

  const subscribers = await db
    .select({ id: conversationParticipants.id })
    .from(conversationParticipants)
    .where(
      and(
        eq(conversationParticipants.conversationId, conversationId),
        eq(conversationParticipants.role, PARTICIPANT_ROLES.SUBSCRIBER),
      ),
    );

  return {
    conversationId: canView ? conversationId : null,
    title: conv?.title ?? ANNOUNCEMENT_TITLE,
    isSubscribed: canView && isSubscribed,
    subscriberCount: subscribers.length,
    canView,
  };
}
