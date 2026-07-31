import { db } from '../config/database.js';
import { users, follows, posts, clubProfiles } from '../db/schema.js';
import { eq, and, sql, desc, or, ilike, ne } from 'drizzle-orm';
import type { UpdateProfileInput } from '../schemas/user.schema.js';
import { normalizePhone } from '../utils/phone.js';
import { notifyUser } from './notification.service.js';
import { getModerationContext, isUserHidden } from './moderation.service.js';
import {
  getClubAnnouncementMeta,
  joinClubAnnouncement,
  leaveClubAnnouncement,
} from './messaging-club.service.js';
import { assertOptionalUserMediaUrl } from '../utils/media-url.js';

// ── Get Profile ──────────────────────────────────────────────
export async function getProfile(userId: string, requestingUserId: string) {
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      phone: users.phone,
      accountType: users.accountType,
      displayName: users.displayName,
      username: users.username,
      bio: users.bio,
      avatarUrl: users.avatarUrl,
      coverPhotoUrl: users.coverPhotoUrl,
      websiteUrl: users.websiteUrl,
      city: users.city,
      neighbourhood: users.neighbourhood,
      isVerified: users.isVerified,
      activities: users.activities,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(and(eq(users.id, userId), eq(users.isActive, true)))
    .limit(1);

  if (!user) return null;

  if (requestingUserId !== userId) {
    const moderation = await getModerationContext(requestingUserId);
    if (isUserHidden(moderation, userId)) return null;
  }

  // Follower/following counts
  const [followerCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(follows)
    .where(eq(follows.followingId, userId));

  const [followingCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(follows)
    .where(eq(follows.followerId, userId));

  // Post count
  const [postCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(posts)
    .where(and(eq(posts.authorId, userId), eq(posts.isActive, true)));

  // Is requesting user following this user?
  let isFollowing = false;
  if (requestingUserId !== userId) {
    const [follow] = await db
      .select({ id: follows.id })
      .from(follows)
      .where(and(eq(follows.followerId, requestingUserId), eq(follows.followingId, userId)))
      .limit(1);
    isFollowing = !!follow;
  }

  // Club profile if club account
  let clubProfile = null;
  let announcementChannel = null;
  if (user.accountType === 'club') {
    const [cp] = await db
      .select()
      .from(clubProfiles)
      .where(eq(clubProfiles.userId, userId))
      .limit(1);
    clubProfile = cp ?? null;
    announcementChannel = await getClubAnnouncementMeta(userId, requestingUserId);
  }

  return {
    ...user,
    email: requestingUserId === userId ? user.email : null,
    phone: requestingUserId === userId ? user.phone : null,
    followerCount: followerCount?.count ?? 0,
    followingCount: followingCount?.count ?? 0,
    postCount: postCount?.count ?? 0,
    isFollowing,
    isOwnProfile: requestingUserId === userId,
    clubProfile,
    announcementChannel,
  };
}

// ── Update Profile ───────────────────────────────────────────
export async function updateProfile(userId: string, input: UpdateProfileInput) {
  await assertOptionalUserMediaUrl(input.avatarUrl, userId, 'avatars');
  await assertOptionalUserMediaUrl(input.coverPhotoUrl, userId, 'covers');

  const patch: Record<string, unknown> = { ...input, updatedAt: new Date() };
  if (input.latitude !== undefined) patch.latitude = input.latitude.toString();
  if (input.longitude !== undefined) patch.longitude = input.longitude.toString();
  if (input.phone) {
    patch.phone = normalizePhone(input.phone);
  }

  // Email/phone can only be *set* here when the account doesn't already have
  // one (e.g. an OAuth signup filling in a missing contact field). Changing
  // an existing, already-trusted value must go through the OTP-verified
  // request-change/confirm-change flow — never a direct write-through.
  if (input.email !== undefined || patch.phone !== undefined) {
    const [current] = await db
      .select({ email: users.email, phone: users.phone })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (input.email !== undefined) {
      if (current?.email) {
        throw new Error('Use the email change flow to update an existing email address');
      }
    }
    if (patch.phone !== undefined) {
      if (current?.phone) {
        throw new Error('Use the phone change flow to update an existing phone number');
      }
    }
  }

  if (input.email || patch.phone) {
    const conditions = [];
    if (input.email) conditions.push(eq(users.email, input.email));
    if (patch.phone) conditions.push(eq(users.phone, patch.phone as string));
    if (conditions.length) {
      const [conflict] = await db
        .select({ id: users.id })
        .from(users)
        .where(and(or(...conditions), ne(users.id, userId)))
        .limit(1);
      if (conflict) throw new Error('Email or phone already in use');
    }
  }

  const [updated] = await db.update(users).set(patch).where(eq(users.id, userId)).returning({
    id: users.id,
    email: users.email,
    phone: users.phone,
    displayName: users.displayName,
    username: users.username,
    bio: users.bio,
    avatarUrl: users.avatarUrl,
    coverPhotoUrl: users.coverPhotoUrl,
    websiteUrl: users.websiteUrl,
    city: users.city,
  });

  return updated;
}

// ── Search users ─────────────────────────────────────────────
export async function searchUsers(query: string, limit = 20) {
  const q = query.trim().replace(/^@/, '');
  if (q.length < 1) return [];

  const pattern = `%${q}%`;
  const prefix = `${q}%`;
  return db
    .select({
      id: users.id,
      displayName: users.displayName,
      username: users.username,
      avatarUrl: users.avatarUrl,
      accountType: users.accountType,
      isVerified: users.isVerified,
    })
    .from(users)
    .where(
      and(
        eq(users.isActive, true),
        or(
          ilike(users.username, prefix),
          ilike(users.displayName, prefix),
          ilike(users.username, pattern),
          ilike(users.displayName, pattern),
        ),
      ),
    )
    .limit(Math.min(limit, 30));
}

// ── Follow / Unfollow ────────────────────────────────────────
export async function followUser(followerId: string, followingId: string) {
  if (followerId === followingId) throw new Error('Cannot follow yourself');

  // Check target exists
  const [target] = await db
    .select({ id: users.id, accountType: users.accountType })
    .from(users)
    .where(and(eq(users.id, followingId), eq(users.isActive, true)))
    .limit(1);
  if (!target) throw new Error('User not found');

  // Check not already following
  const [existing] = await db
    .select({ id: follows.id })
    .from(follows)
    .where(and(eq(follows.followerId, followerId), eq(follows.followingId, followingId)))
    .limit(1);
  if (existing) return { following: true };

  await db.insert(follows).values({ followerId, followingId });

  const [follower] = await db
    .select({ displayName: users.displayName })
    .from(users)
    .where(eq(users.id, followerId))
    .limit(1);

  notifyUser({
    userId: followingId,
    type: 'follow',
    title: `${follower?.displayName ?? 'Someone'} started following you`,
    data: { userId: followerId },
  });

  if (target.accountType === 'club') {
    await joinClubAnnouncement(followerId, followingId);
  }

  return { following: true };
}

export async function unfollowUser(followerId: string, followingId: string) {
  const [target] = await db
    .select({ accountType: users.accountType })
    .from(users)
    .where(eq(users.id, followingId))
    .limit(1);

  await db
    .delete(follows)
    .where(and(eq(follows.followerId, followerId), eq(follows.followingId, followingId)));

  if (target?.accountType === 'club') {
    await leaveClubAnnouncement(followerId, followingId);
  }

  return { following: false };
}

// ── Followers / Following Lists ──────────────────────────────
export async function getFollowers(userId: string, cursor?: string, limit = 20) {
  const result = await db
    .select({
      followId: follows.id,
      id: users.id,
      displayName: users.displayName,
      username: users.username,
      avatarUrl: users.avatarUrl,
      accountType: users.accountType,
      isVerified: users.isVerified,
      followedAt: follows.createdAt,
    })
    .from(follows)
    .innerJoin(users, eq(follows.followerId, users.id))
    .where(
      and(
        eq(follows.followingId, userId),
        cursor
          ? sql`${follows.createdAt} < (SELECT created_at FROM follows WHERE id = ${cursor})`
          : undefined,
      ),
    )
    .orderBy(desc(follows.createdAt))
    .limit(limit + 1);

  const hasMore = result.length > limit;
  if (hasMore) result.pop();

  return {
    users: result.map(({ followId: _followId, ...user }) => user),
    cursor: hasMore ? (result[result.length - 1]?.followId ?? null) : null,
    hasMore,
  };
}

export async function getFollowing(userId: string, cursor?: string, limit = 20) {
  const result = await db
    .select({
      followId: follows.id,
      id: users.id,
      displayName: users.displayName,
      username: users.username,
      avatarUrl: users.avatarUrl,
      accountType: users.accountType,
      isVerified: users.isVerified,
      followedAt: follows.createdAt,
    })
    .from(follows)
    .innerJoin(users, eq(follows.followingId, users.id))
    .where(
      and(
        eq(follows.followerId, userId),
        cursor
          ? sql`${follows.createdAt} < (SELECT created_at FROM follows WHERE id = ${cursor})`
          : undefined,
      ),
    )
    .orderBy(desc(follows.createdAt))
    .limit(limit + 1);

  const hasMore = result.length > limit;
  if (hasMore) result.pop();

  return {
    users: result.map(({ followId: _followId, ...user }) => user),
    cursor: hasMore ? (result[result.length - 1]?.followId ?? null) : null,
    hasMore,
  };
}

// ── Push Token ───────────────────────────────────────────────
export async function savePushToken(userId: string, token: string) {
  await db.update(users).set({ expoPushToken: token }).where(eq(users.id, userId));
}
