import { db } from '../config/database.js';
import { users, follows, posts, clubProfiles } from '../db/schema.js';
import { eq, and, sql, desc } from 'drizzle-orm';
import type { UpdateProfileInput } from '../schemas/user.schema.js';

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
      createdAt: users.createdAt,
    })
    .from(users)
    .where(and(eq(users.id, userId), eq(users.isActive, true)))
    .limit(1);

  if (!user) return null;

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
  if (user.accountType === 'club') {
    const [cp] = await db
      .select()
      .from(clubProfiles)
      .where(eq(clubProfiles.userId, userId))
      .limit(1);
    clubProfile = cp ?? null;
  }

  return {
    ...user,
    followerCount: followerCount?.count ?? 0,
    followingCount: followingCount?.count ?? 0,
    postCount: postCount?.count ?? 0,
    isFollowing,
    isOwnProfile: requestingUserId === userId,
    clubProfile,
  };
}

// ── Update Profile ───────────────────────────────────────────
export async function updateProfile(userId: string, input: UpdateProfileInput) {
  const [updated] = await db
    .update(users)
    .set({
      ...input,
      latitude: input.latitude?.toString(),
      longitude: input.longitude?.toString(),
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning({
      id: users.id,
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

// ── Follow / Unfollow ────────────────────────────────────────
export async function followUser(followerId: string, followingId: string) {
  if (followerId === followingId) throw new Error('Cannot follow yourself');

  // Check target exists
  const [target] = await db
    .select({ id: users.id })
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
  return { following: true };
}

export async function unfollowUser(followerId: string, followingId: string) {
  await db
    .delete(follows)
    .where(and(eq(follows.followerId, followerId), eq(follows.followingId, followingId)));
  return { following: false };
}

// ── Followers / Following Lists ──────────────────────────────
export async function getFollowers(userId: string, cursor?: string, limit = 20) {
  const result = await db
    .select({
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
    users: result,
    cursor: hasMore ? (result[result.length - 1]?.id ?? null) : null,
    hasMore,
  };
}

export async function getFollowing(userId: string, cursor?: string, limit = 20) {
  const result = await db
    .select({
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
    users: result,
    cursor: hasMore ? (result[result.length - 1]?.id ?? null) : null,
    hasMore,
  };
}
