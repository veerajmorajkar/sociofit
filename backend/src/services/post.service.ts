import { db } from '../config/database.js';
import { posts, postMedia, postTags, likes, reposts, comments, follows } from '../db/schema.js';
import { eq, and, desc, asc, inArray, sql } from 'drizzle-orm';
import type { CreatePostInput, FeedQueryInput, CommentInput } from '../schemas/post.schema.js';
import { notifyUser } from './notification.service.js';
import { users } from '../db/schema.js';

export type TaggedUserSummary = {
  id: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
};

async function attachTaggedUsers(postId: string, usernames?: string[]) {
  if (!usernames?.length) return;

  const unique = [...new Set(usernames.map((u) => u.toLowerCase()))];
  const tagged = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.isActive, true), inArray(users.username, unique)));

  if (tagged.length === 0) return;

  await db
    .insert(postTags)
    .values(tagged.map((u) => ({ postId, userId: u.id })))
    .onConflictDoNothing();
}

async function getTaggedUsersByPostIds(
  postIds: string[],
): Promise<Map<string, TaggedUserSummary[]>> {
  const map = new Map<string, TaggedUserSummary[]>();
  if (postIds.length === 0) return map;

  const rows = await db
    .select({
      postId: postTags.postId,
      id: users.id,
      displayName: users.displayName,
      username: users.username,
      avatarUrl: users.avatarUrl,
    })
    .from(postTags)
    .innerJoin(users, eq(postTags.userId, users.id))
    .where(inArray(postTags.postId, postIds));

  for (const row of rows) {
    const list = map.get(row.postId) ?? [];
    list.push({
      id: row.id,
      displayName: row.displayName,
      username: row.username,
      avatarUrl: row.avatarUrl,
    });
    map.set(row.postId, list);
  }
  return map;
}

async function enrichPostsWithTags<T extends { id: string }>(
  items: T[],
): Promise<Array<T & { taggedUsers: TaggedUserSummary[] }>> {
  const tagMap = await getTaggedUsersByPostIds(items.map((p) => p.id));
  return items.map((post) => ({
    ...post,
    taggedUsers: tagMap.get(post.id) ?? [],
  }));
}

const COMMENT_PREVIEW_MAX = 100;

function toCommentPreview(content: string): string {
  const normalized = content.trim().replace(/\s+/g, ' ');
  if (!normalized) return '';
  if (normalized.length <= COMMENT_PREVIEW_MAX) return normalized;
  return `${normalized.slice(0, COMMENT_PREVIEW_MAX).trimEnd()}...`;
}

async function getPostThumbnailForNotification(postId: string): Promise<string | null> {
  const [media] = await db
    .select({ url: postMedia.url, thumbnailUrl: postMedia.thumbnailUrl })
    .from(postMedia)
    .where(eq(postMedia.postId, postId))
    .orderBy(asc(postMedia.sortOrder))
    .limit(1);

  if (!media) return null;
  return media.thumbnailUrl ?? media.url;
}

// ── Create Post ──────────────────────────────────────────────
export async function createPost(authorId: string, input: CreatePostInput) {
  const { taggedUsernames, ...postInput } = input;
  const [post] = await db
    .insert(posts)
    .values({
      authorId,
      postType: postInput.postType,
      caption: postInput.caption,
      linkUrl: postInput.linkUrl,
      categoryId: postInput.categoryId,
      locationName: postInput.locationName,
      latitude: postInput.latitude?.toString(),
      longitude: postInput.longitude?.toString(),
    })
    .returning();

  if (!post) throw new Error('Failed to create post');

  await attachTaggedUsers(post.id, taggedUsernames);

  // Insert media if provided
  if (postInput.mediaUrls && postInput.mediaUrls.length > 0) {
    await db.insert(postMedia).values(
      postInput.mediaUrls.map((m, i) => ({
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

  const [liked, reposted] = await Promise.all([
    db
      .select({ id: likes.id })
      .from(likes)
      .where(and(eq(likes.postId, postId), eq(likes.userId, requestingUserId)))
      .limit(1),
    db
      .select({ id: reposts.id })
      .from(reposts)
      .where(and(eq(reposts.postId, postId), eq(reposts.userId, requestingUserId)))
      .limit(1),
  ]);

  const tagMap = await getTaggedUsersByPostIds([postId]);
  return {
    ...post,
    isLiked: !!liked[0],
    isReposted: !!reposted[0],
    taggedUsers: tagMap.get(postId) ?? [],
  };
}

/** Social graph: people you follow, people who follow you, and yourself */
async function getNetworkUserIds(userId: string): Promise<Set<string>> {
  const [followingRows, followerRows] = await Promise.all([
    db.select({ id: follows.followingId }).from(follows).where(eq(follows.followerId, userId)),
    db.select({ id: follows.followerId }).from(follows).where(eq(follows.followingId, userId)),
  ]);

  const network = new Set<string>([userId]);
  for (const row of followingRows) network.add(row.id);
  for (const row of followerRows) network.add(row.id);
  return network;
}

async function enrichPostsWithEngagement<T extends { id: string }>(
  items: T[],
  viewerId: string,
): Promise<Array<T & { isLiked: boolean; isReposted: boolean }>> {
  const postIds = items.map((p) => p.id);
  if (postIds.length === 0) return [];

  const [likedPosts, repostedPosts] = await Promise.all([
    db
      .select({ postId: likes.postId })
      .from(likes)
      .where(and(eq(likes.userId, viewerId), inArray(likes.postId, postIds))),
    db
      .select({ postId: reposts.postId })
      .from(reposts)
      .where(and(eq(reposts.userId, viewerId), inArray(reposts.postId, postIds))),
  ]);

  const likedSet = new Set(likedPosts.map((l) => l.postId));
  const repostedSet = new Set(repostedPosts.map((r) => r.postId));

  return items.map((post) => ({
    ...post,
    isLiked: likedSet.has(post.id),
    isReposted: repostedSet.has(post.id),
  }));
}

/**
 * Blended home feed: network posts (following + followers) ranked together with
 * high-reach posts from others (engagement + recency). Paid boost reserved for later.
 */
function scorePostForFeed(
  post: {
    authorId: string;
    likeCount: number | null;
    commentCount: number | null;
    createdAt: Date;
  },
  network: Set<string>,
  nowMs: number,
): number {
  const inNetwork = network.has(post.authorId);
  const likes = post.likeCount ?? 0;
  const comments = post.commentCount ?? 0;
  const ageHours = (nowMs - post.createdAt.getTime()) / (1000 * 60 * 60);
  const recencyBoost = Math.max(0, 72 - ageHours) * 3;
  const engagementScore = likes * 2 + comments * 5;
  const networkBoost = inNetwork ? 800 : 0;

  return networkBoost + engagementScore + recencyBoost;
}

// ── Get Feed ─────────────────────────────────────────────────
export async function getFeed(userId: string, input: FeedQueryInput) {
  const { cursor, limit } = input;
  const network = await getNetworkUserIds(userId);
  const nowMs = Date.now();

  // Score a recent candidate pool, then paginate in memory (fine for beta scale)
  const candidates = await db.query.posts.findMany({
    where: eq(posts.isActive, true),
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
    limit: 200,
  });

  if (candidates.length === 0) {
    return { posts: [], cursor: null, hasMore: false };
  }

  const ranked = candidates
    .map((post) => ({
      post,
      score: scorePostForFeed(post, network, nowMs),
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.post.createdAt.getTime() - a.post.createdAt.getTime();
    });

  let startIndex = 0;
  if (cursor) {
    const cursorIndex = ranked.findIndex((r) => r.post.id === cursor);
    if (cursorIndex >= 0) startIndex = cursorIndex + 1;
  }

  const page = ranked.slice(startIndex, startIndex + limit + 1);
  const hasMore = page.length > limit;
  const items = hasMore ? page.slice(0, limit) : page;
  const postIds = items.map((r) => r.post.id);

  if (postIds.length === 0) {
    return { posts: [], cursor: null, hasMore: false };
  }

  const withEngagement = await enrichPostsWithEngagement(
    items.map((r) => r.post),
    userId,
  );
  const enriched = await enrichPostsWithTags(withEngagement);

  return {
    posts: enriched,
    cursor: hasMore ? (postIds[postIds.length - 1] ?? null) : null,
    hasMore,
  };
}

// ── Posts by author (profile grid) ───────────────────────────
export async function getPostsByAuthor(
  authorId: string,
  viewerId: string,
  cursor?: string,
  limit = 20,
) {
  const authorColumns = {
    id: true,
    displayName: true,
    username: true,
    avatarUrl: true,
    accountType: true,
    isVerified: true,
  } as const;

  const [authored, userReposts] = await Promise.all([
    db.query.posts.findMany({
      where: and(eq(posts.authorId, authorId), eq(posts.isActive, true)),
      with: {
        author: { columns: authorColumns },
        media: { orderBy: [postMedia.sortOrder] },
      },
      orderBy: [desc(posts.createdAt)],
      limit: 150,
    }),
    db.query.reposts.findMany({
      where: eq(reposts.userId, authorId),
      with: {
        post: {
          with: {
            author: { columns: authorColumns },
            media: { orderBy: [postMedia.sortOrder] },
          },
        },
      },
      orderBy: [desc(reposts.createdAt)],
      limit: 150,
    }),
  ]);

  type TimelineEntry = {
    key: string;
    sortAt: number;
    post: (typeof authored)[number];
    repostMeta: { repostId: string; repostedAt: Date } | null;
  };

  const timeline: TimelineEntry[] = [
    ...authored.map((post) => ({
      key: `post:${post.id}`,
      sortAt: post.createdAt.getTime(),
      post,
      repostMeta: null,
    })),
    ...userReposts
      .filter((r) => r.post?.isActive)
      .map((r) => ({
        key: `repost:${r.id}`,
        sortAt: r.createdAt.getTime(),
        post: r.post,
        repostMeta: { repostId: r.id, repostedAt: r.createdAt },
      })),
  ].sort((a, b) => b.sortAt - a.sortAt);

  let startIndex = 0;
  if (cursor) {
    const cursorIndex = timeline.findIndex((entry) => entry.key === cursor);
    if (cursorIndex >= 0) startIndex = cursorIndex + 1;
  }

  const page = timeline.slice(startIndex, startIndex + limit + 1);
  const hasMore = page.length > limit;
  const entries = hasMore ? page.slice(0, limit) : page;

  if (entries.length === 0) {
    return { posts: [], cursor: null, hasMore: false };
  }

  const withEngagement = await enrichPostsWithEngagement(
    entries.map((entry) => entry.post),
    viewerId,
  );
  const enriched = await enrichPostsWithTags(withEngagement);

  const postsWithMeta = enriched.map((post, index) => {
    const entry = entries[index]!;
    if (!entry.repostMeta) return post;
    return {
      ...post,
      repostMeta: {
        repostId: entry.repostMeta.repostId,
        repostedAt: entry.repostMeta.repostedAt.toISOString(),
      },
    };
  });

  return {
    posts: postsWithMeta,
    cursor: hasMore ? (entries[entries.length - 1]?.key ?? null) : null,
    hasMore,
  };
}

// ── Like / Unlike ────────────────────────────────────────────
export async function likePost(userId: string, postId: string) {
  // Check post exists
  const [post] = await db
    .select({ id: posts.id, authorId: posts.authorId, likeCount: posts.likeCount })
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

  if (post.authorId !== userId) {
    const [liker] = await db
      .select({ displayName: users.displayName })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    const postImageUrl = await getPostThumbnailForNotification(postId);
    notifyUser({
      userId: post.authorId,
      type: 'like',
      title: `${liker?.displayName ?? 'Someone'} liked your post`,
      data: { postId, postImageUrl: postImageUrl ?? undefined },
    });
  }
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

  await db.delete(likes).where(and(eq(likes.userId, userId), eq(likes.postId, postId)));

  const [updated] = await db
    .update(posts)
    .set({ likeCount: sql`GREATEST(${posts.likeCount} - 1, 0)` })
    .where(eq(posts.id, postId))
    .returning({ likeCount: posts.likeCount });

  return { liked: false, likeCount: updated?.likeCount ?? 0 };
}

// ── Repost / Unrepost ────────────────────────────────────────
export async function repostPost(userId: string, postId: string) {
  const [post] = await db
    .select({ id: posts.id, authorId: posts.authorId, shareCount: posts.shareCount })
    .from(posts)
    .where(and(eq(posts.id, postId), eq(posts.isActive, true)))
    .limit(1);

  if (!post) throw new Error('Post not found');

  const [existing] = await db
    .select({ id: reposts.id })
    .from(reposts)
    .where(and(eq(reposts.userId, userId), eq(reposts.postId, postId)))
    .limit(1);

  if (existing) {
    return { reposted: true, repostCount: post.shareCount ?? 0 };
  }

  await db.insert(reposts).values({ userId, postId });

  if (post.authorId !== userId) {
    const [reposter] = await db
      .select({ displayName: users.displayName })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    const postImageUrl = await getPostThumbnailForNotification(postId);
    notifyUser({
      userId: post.authorId,
      type: 'repost',
      title: `${reposter?.displayName ?? 'Someone'} reposted your post`,
      data: { postId, postImageUrl: postImageUrl ?? undefined },
    });
  }

  const [updated] = await db
    .update(posts)
    .set({ shareCount: sql`${posts.shareCount} + 1` })
    .where(eq(posts.id, postId))
    .returning({ shareCount: posts.shareCount });

  return { reposted: true, repostCount: updated?.shareCount ?? 0 };
}

export async function unrepostPost(userId: string, postId: string) {
  const [post] = await db
    .select({ id: posts.id, shareCount: posts.shareCount })
    .from(posts)
    .where(and(eq(posts.id, postId), eq(posts.isActive, true)))
    .limit(1);

  if (!post) throw new Error('Post not found');

  await db.delete(reposts).where(and(eq(reposts.userId, userId), eq(reposts.postId, postId)));

  const [updated] = await db
    .update(posts)
    .set({ shareCount: sql`GREATEST(${posts.shareCount} - 1, 0)` })
    .where(eq(posts.id, postId))
    .returning({ shareCount: posts.shareCount });

  return { reposted: false, repostCount: updated?.shareCount ?? 0 };
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

  const [postRow] = await db
    .select({ authorId: posts.authorId })
    .from(posts)
    .where(eq(posts.id, postId))
    .limit(1);

  if (postRow && postRow.authorId !== userId && full?.author) {
    const postImageUrl = await getPostThumbnailForNotification(postId);
    const commentPreview = toCommentPreview(input.content);
    notifyUser({
      userId: postRow.authorId,
      type: 'comment',
      title: `${full.author.displayName} commented on your post`,
      body: commentPreview || undefined,
      data: {
        postId,
        postImageUrl: postImageUrl ?? undefined,
        commentPreview: commentPreview || undefined,
      },
    });
  }

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
