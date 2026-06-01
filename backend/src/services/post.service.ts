import { db } from '../config/database.js';
import {
  posts,
  postMedia,
  likes,
  comments,
  follows,
} from '../db/schema.js';
import { eq, and, lt, desc, inArray, sql } from 'drizzle-orm';
import type { CreatePostInput, FeedQueryInput, CommentInput } from '../schemas/post.schema.js';

// ── Create Post ──────────────────────────────────────────────
export async function createPost(authorId: string, input: CreatePostInput) {
  const [post] = await db
    .insert(posts)
    .values({
      authorId,
      postType: input.postType,
      caption: input.caption,
      linkUrl: input.linkUrl,
      categoryId: input.categoryId,
      locationName: input.locationName,
      latitude: input.latitude?.toString(),
      longitude: input.longitude?.toString(),
    })
    .returning();

  if (!post) throw new Error('Failed to create post');

  // Insert media if provided
  if (input.mediaUrls && input.mediaUrls.length > 0) {
    await db.insert(postMedia).values(
      input.mediaUrls.map((m, i) => ({
        postId: post.id,
        mediaType: m.mediaType,
        url: m.url,
        thumbnailUrl: m.thumbnailUrl,
        width: m.width,
        height: m.height,
        durationMs: m.durationMs,
        sortOrder: i,
      })),
    );
  }

  return getPostById(post.id, authorId);
}

// ── Get Post By ID ───────────────────────────────────────────
export async function getPostById(postId: string, requestingUserId: string) {
  const post = await db.query.posts.findFirst({
    where: and(eq(posts.id, postId), eq(posts.isActive, true)),
    with: {
      author: {
        columns: {
          id: true,
          displayName: true,
          username: true,
          avatarUrl: true,
          accountType: true,
          isVerified: true,
        },
      },
      media: {
        orderBy: [postMedia.sortOrder],
      },
    },
  });

  if (!post) return null;

  // Check if requesting user liked this post
  const [liked] = await db
    .select({ id: likes.id })
    .from(likes)
    .where(and(eq(likes.postId, postId), eq(likes.userId, requestingUserId)))
    .limit(1);

  return { ...post, isLiked: !!liked };
}

// ── Get Feed ─────────────────────────────────────────────────
export async function getFeed(userId: string, input: FeedQueryInput) {
  const { cursor, limit, type } = input;

  let postIds: string[] = [];

  if (type === 'following') {
    // Get IDs of people this user follows
    const followedUsers = await db
      .select({ followingId: follows.followingId })
      .from(follows)
      .where(eq(follows.followerId, userId));

    const followedIds = followedUsers.map((f) => f.followingId);
    followedIds.push(userId); // include own posts

    if (followedIds.length === 0) {
      return { posts: [], cursor: null, hasMore: false };
    }

    // Get posts from followed users with cursor pagination
    const feedPosts = await db
      .select({ id: posts.id })
      .from(posts)
      .where(
        and(
          inArray(posts.authorId, followedIds),
          eq(posts.isActive, true),
          cursor ? lt(posts.createdAt, db.select({ createdAt: posts.createdAt }).from(posts).where(eq(posts.id, cursor)).limit(1) as unknown as Date) : undefined,
        ),
      )
      .orderBy(desc(posts.createdAt))
      .limit(limit + 1);

    postIds = feedPosts.map((p) => p.id);
  } else {
    // Discover: all posts, newest first
    const feedPosts = await db
      .select({ id: posts.id })
      .from(posts)
      .where(
        and(
          eq(posts.isActive, true),
          cursor
            ? sql`${posts.createdAt} < (SELECT created_at FROM posts WHERE id = ${cursor})`
            : undefined,
        ),
      )
      .orderBy(desc(posts.createdAt))
      .limit(limit + 1);

    postIds = feedPosts.map((p) => p.id);
  }

  const hasMore = postIds.length > limit;
  if (hasMore) postIds.pop();

  if (postIds.length === 0) {
    return { posts: [], cursor: null, hasMore: false };
  }

  // Fetch full post data with author + media
  const feedPosts = await db.query.posts.findMany({
    where: inArray(posts.id, postIds),
    with: {
      author: {
        columns: {
          id: true,
          displayName: true,
          username: true,
          avatarUrl: true,
          accountType: true,
          isVerified: true,
        },
      },
      media: {
        orderBy: [postMedia.sortOrder],
      },
    },
    orderBy: [desc(posts.createdAt)],
  });

  // Batch check which posts the user has liked
  const likedPosts = await db
    .select({ postId: likes.postId })
    .from(likes)
    .where(and(eq(likes.userId, userId), inArray(likes.postId, postIds)));

  const likedSet = new Set(likedPosts.map((l) => l.postId));

  const enriched = feedPosts.map((p) => ({ ...p, isLiked: likedSet.has(p.id) }));

  const nextCursor = hasMore ? (postIds[postIds.length - 1] ?? null) : null;

  return { posts: enriched, cursor: nextCursor, hasMore };
}

// ── Like / Unlike ────────────────────────────────────────────
export async function likePost(userId: string, postId: string) {
  // Check post exists
  const [post] = await db
    .select({ id: posts.id, likeCount: posts.likeCount })
    .from(posts)
    .where(and(eq(posts.id, postId), eq(posts.isActive, true)))
    .limit(1);

  if (!post) throw new Error('Post not found');

  // Check already liked
  const [existing] = await db
    .select({ id: likes.id })
    .from(likes)
    .where(and(eq(likes.userId, userId), eq(likes.postId, postId)))
    .limit(1);

  if (existing) return { liked: true, likeCount: post.likeCount ?? 0 };

  // Insert like + increment counter atomically
  await db.insert(likes).values({ userId, postId });
  const [updated] = await db
    .update(posts)
    .set({ likeCount: sql`${posts.likeCount} + 1` })
    .where(eq(posts.id, postId))
    .returning({ likeCount: posts.likeCount });

  return { liked: true, likeCount: updated?.likeCount ?? 0 };
}

export async function unlikePost(userId: string, postId: string) {
  const [post] = await db
    .select({ id: posts.id, likeCount: posts.likeCount })
    .from(posts)
    .where(and(eq(posts.id, postId), eq(posts.isActive, true)))
    .limit(1);

  if (!post) throw new Error('Post not found');

  await db
    .delete(likes)
    .where(and(eq(likes.userId, userId), eq(likes.postId, postId)));

  const [updated] = await db
    .update(posts)
    .set({ likeCount: sql`GREATEST(${posts.likeCount} - 1, 0)` })
    .where(eq(posts.id, postId))
    .returning({ likeCount: posts.likeCount });

  return { liked: false, likeCount: updated?.likeCount ?? 0 };
}

// ── Comments ─────────────────────────────────────────────────
export async function addComment(userId: string, postId: string, input: CommentInput) {
  const [post] = await db
    .select({ id: posts.id })
    .from(posts)
    .where(and(eq(posts.id, postId), eq(posts.isActive, true)))
    .limit(1);

  if (!post) throw new Error('Post not found');

  const [comment] = await db
    .insert(comments)
    .values({
      postId,
      authorId: userId,
      parentId: input.parentId,
      content: input.content,
    })
    .returning();

  // Increment comment count
  await db
    .update(posts)
    .set({ commentCount: sql`${posts.commentCount} + 1` })
    .where(eq(posts.id, postId));

  // Return comment with author
  const full = await db.query.comments.findFirst({
    where: eq(comments.id, comment!.id),
    with: {
      author: {
        columns: {
          id: true,
          displayName: true,
          username: true,
          avatarUrl: true,
        },
      },
    },
  });

  return full;
}

export async function getComments(postId: string, cursor?: string, limit = 20) {
  const result = await db.query.comments.findMany({
    where: and(
      eq(comments.postId, postId),
      eq(comments.isActive, true),
      cursor
        ? sql`${comments.createdAt} < (SELECT created_at FROM comments WHERE id = ${cursor})`
        : undefined,
    ),
    with: {
      author: {
        columns: {
          id: true,
          displayName: true,
          username: true,
          avatarUrl: true,
        },
      },
    },
    orderBy: [desc(comments.createdAt)],
    limit: limit + 1,
  });

  const hasMore = result.length > limit;
  if (hasMore) result.pop();

  return {
    comments: result,
    cursor: hasMore ? (result[result.length - 1]?.id ?? null) : null,
    hasMore,
  };
}

// ── Delete Post ──────────────────────────────────────────────
export async function deletePost(userId: string, postId: string) {
  const [post] = await db
    .select({ id: posts.id, authorId: posts.authorId })
    .from(posts)
    .where(eq(posts.id, postId))
    .limit(1);

  if (!post) throw new Error('Post not found');
  if (post.authorId !== userId) throw new Error('Not authorised to delete this post');

  await db.update(posts).set({ isActive: false }).where(eq(posts.id, postId));
  return { deleted: true };
}
