import { db } from '../config/database.js';
import { posts, postMedia, follows, users, likes, comments, reposts } from '../db/schema.js';
import { eq, and, desc, notInArray, gte, sql, count, countDistinct } from 'drizzle-orm';
import type { FeedQueryInput } from '../schemas/post.schema.js';
import {
  enrichPostsWithEngagement,
  enrichPostsWithTags,
  type TaggedUserSummary,
} from './post.service.js';
import { getModerationContext, isPostHidden, isUserHidden } from './moderation.service.js';
import type {
  FeedActivitySnapshot,
  FeedItem,
  FeedPostPayload,
  FeedSuggestedUser,
} from '../types/feed.types.js';

const AUTHOR_COLUMNS = {
  id: true,
  displayName: true,
  username: true,
  avatarUrl: true,
  accountType: true,
  isVerified: true,
} as const;

const MAX_CANDIDATE_POSTS = 400;
const FOLLOWING_LOOKBACK_DAYS = 45;
const VIRAL_LOOKBACK_DAYS = 14;
const MAX_FEED_ITEMS = 600;
const SUGGESTIONS_PER_CARD = 6;
const SUGGESTION_POOL_SIZE = 18;

// ── Seeded daily shuffle (stable per user per UTC day) ───────

function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  return () => {
    let a = seed >>> 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function dailySeed(userId: string, date = new Date()): string {
  const day = date.toISOString().slice(0, 10);
  return `${userId}:${day}`;
}

function shuffleWithSeed<T>(items: T[], seed: string): T[] {
  const rng = mulberry32(hashString(seed));
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

// ── Activity metrics (drives thresholds & injection rates) ───

interface ActivityMetrics {
  postsLast24h: number;
  postsLast7d: number;
  engagementsLast7d: number;
  activeUsersLast7d: number;
}

async function getPlatformActivityMetrics(): Promise<ActivityMetrics> {
  const now = Date.now();
  const dayAgo = new Date(now - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

  const [[postStats], [likeStats], [commentStats], [repostStats], [activeAuthors]] =
    await Promise.all([
      db
        .select({
          last24h: sql<number>`count(*) filter (where ${posts.createdAt} >= ${dayAgo})`.mapWith(
            Number,
          ),
          last7d: sql<number>`count(*) filter (where ${posts.createdAt} >= ${weekAgo})`.mapWith(
            Number,
          ),
        })
        .from(posts)
        .where(eq(posts.isActive, true)),
      db.select({ total: count() }).from(likes).where(gte(likes.createdAt, weekAgo)),
      db
        .select({ total: count() })
        .from(comments)
        .where(and(gte(comments.createdAt, weekAgo), eq(comments.isActive, true))),
      db.select({ total: count() }).from(reposts).where(gte(reposts.createdAt, weekAgo)),
      db
        .select({ total: countDistinct(posts.authorId) })
        .from(posts)
        .where(and(eq(posts.isActive, true), gte(posts.createdAt, weekAgo))),
    ]);

  return {
    postsLast24h: postStats?.last24h ?? 0,
    postsLast7d: postStats?.last7d ?? 0,
    engagementsLast7d:
      (likeStats?.total ?? 0) + (commentStats?.total ?? 0) + (repostStats?.total ?? 0),
    activeUsersLast7d: activeAuthors?.total ?? 0,
  };
}

/** Minimum engagement score for a post to qualify as app-wide recommended. */
export function computeViralThreshold(metrics: ActivityMetrics): number {
  const { postsLast7d, engagementsLast7d, activeUsersLast7d } = metrics;

  // Early-stage app: lower bar so discovery still works.
  if (postsLast7d < 30) return 4;
  if (postsLast7d < 100) return Math.max(6, Math.floor(postsLast7d * 0.12));

  const engagementFactor = Math.floor(engagementsLast7d * 0.015);
  const userFactor = Math.floor(activeUsersLast7d * 0.25);
  return Math.min(120, Math.max(12, 8 + engagementFactor + userFactor));
}

/** Share of feed slots reserved for recommended (viral) posts. */
export function computeRecommendedPostRatio(metrics: ActivityMetrics): number {
  if (metrics.postsLast7d < 40) return 0.38;
  if (metrics.postsLast7d < 120) return 0.24;
  if (metrics.postsLast24h < 15) return 0.18;
  return 0.12;
}

/** Insert a follow-suggestions card every N post slots. */
export function computeSuggestionInterval(followingCount: number): number {
  if (followingCount < 5) return 4;
  if (followingCount < 20) return 6;
  return 8;
}

/** Inject a recommended post every N following posts (derived from ratio). */
function computeViralInterval(ratio: number): number {
  if (ratio >= 0.3) return 2;
  if (ratio >= 0.2) return 3;
  if (ratio >= 0.14) return 4;
  return 5;
}

// ── Engagement scoring ───────────────────────────────────────

export function computeEngagementScore(post: {
  likeCount: number | null;
  commentCount: number | null;
  shareCount: number | null;
}): number {
  const likes = post.likeCount ?? 0;
  const comments = post.commentCount ?? 0;
  const repostsCount = post.shareCount ?? 0;
  return likes * 2 + comments * 5 + repostsCount * 8;
}

function scoreFollowingPost(
  post: {
    likeCount: number | null;
    commentCount: number | null;
    shareCount: number | null;
    createdAt: Date;
  },
  nowMs: number,
): number {
  const ageHours = (nowMs - post.createdAt.getTime()) / (1000 * 60 * 60);
  const recency = Math.max(0, 168 - ageHours) * 4;
  const engagement = computeEngagementScore(post) * 0.35;
  return recency + engagement;
}

function scoreViralPost(
  post: {
    likeCount: number | null;
    commentCount: number | null;
    shareCount: number | null;
    createdAt: Date;
  },
  nowMs: number,
): number {
  const ageHours = (nowMs - post.createdAt.getTime()) / (1000 * 60 * 60);
  const recency = Math.max(0, 96 - ageHours) * 2;
  return computeEngagementScore(post) + recency;
}

// ── Graph helpers ────────────────────────────────────────────

async function getFollowingIds(userId: string): Promise<string[]> {
  const rows = await db
    .select({ id: follows.followingId })
    .from(follows)
    .where(eq(follows.followerId, userId));
  return rows.map((r) => r.id);
}

async function getViewerContext(userId: string) {
  const [viewer] = await db
    .select({
      id: users.id,
      activities: users.activities,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const followingIds = await getFollowingIds(userId);
  const followingSet = new Set(followingIds);

  return {
    viewer,
    followingIds,
    followingSet,
    feedAuthorIds: [...followingSet, userId],
  };
}

type RawPost = Awaited<ReturnType<typeof loadPostCandidates>>[number];

async function loadPostCandidates(since: Date) {
  return db.query.posts.findMany({
    where: and(eq(posts.isActive, true), gte(posts.createdAt, since)),
    with: {
      author: { columns: AUTHOR_COLUMNS },
      media: { orderBy: [postMedia.sortOrder] },
    },
    orderBy: [desc(posts.createdAt)],
    limit: MAX_CANDIDATE_POSTS,
  });
}

// ── Follow suggestions (daily refresh) ───────────────────────

async function buildFollowSuggestions(
  userId: string,
  followingSet: Set<string>,
  viewerActivities: string[],
): Promise<FeedSuggestedUser[]> {
  const excludeIds = [...followingSet, userId];
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const candidates = await db
    .select({
      id: users.id,
      displayName: users.displayName,
      username: users.username,
      avatarUrl: users.avatarUrl,
      accountType: users.accountType,
      activities: users.activities,
      followerCount: sql<number>`(
        select count(*)::int from follows f where f.following_id = ${users.id}
      )`.mapWith(Number),
      eventsAttended: sql<number>`(
        select count(*)::int from event_participants ep where ep.user_id = ${users.id}
      )`.mapWith(Number),
      eventsHosted: sql<number>`(
        select count(*)::int from events e
        where e.organiser_id = ${users.id} and e.is_active = true
      )`.mapWith(Number),
      recentPosts: sql<number>`(
        select count(*)::int from posts p
        where p.author_id = ${users.id}
          and p.is_active = true
          and p.created_at >= ${weekAgo}
      )`.mapWith(Number),
    })
    .from(users)
    .where(
      and(
        eq(users.isActive, true),
        excludeIds.length > 0 ? notInArray(users.id, excludeIds) : undefined,
      ),
    )
    .limit(120);

  if (candidates.length === 0) return [];

  const viewerActivitySet = new Set(viewerActivities);
  const scored = candidates.map((c) => {
    const overlap = (c.activities ?? []).filter((a) => viewerActivitySet.has(a)).length;
    const typeBonus = c.accountType === 'club' ? 1.5 : 1;
    const activityScore =
      overlap * 12 + (c.recentPosts > 0 ? 8 : 0) + Math.min(c.followerCount, 50) * 0.1;
    return {
      id: c.id,
      displayName: c.displayName,
      username: c.username,
      avatarUrl: c.avatarUrl,
      accountType: (c.accountType === 'club' ? 'club' : 'personal') as 'personal' | 'club',
      followerCount: c.followerCount,
      eventsAttended: c.eventsAttended,
      eventsHosted: c.eventsHosted,
      activityOverlap: overlap,
      score: activityScore * typeBonus,
    };
  });

  const athletes = scored
    .filter((u) => u.accountType === 'personal')
    .sort((a, b) => b.score - a.score);
  const clubs = scored.filter((u) => u.accountType === 'club').sort((a, b) => b.score - a.score);

  const seed = dailySeed(userId);
  const shuffledAthletes = shuffleWithSeed(athletes, `${seed}:athletes`);
  const shuffledClubs = shuffleWithSeed(clubs, `${seed}:clubs`);

  const picked: typeof scored = [];
  const targetAthletes = Math.ceil(SUGGESTIONS_PER_CARD / 2);
  const targetClubs = SUGGESTIONS_PER_CARD - targetAthletes;

  picked.push(...shuffledAthletes.slice(0, targetAthletes));
  picked.push(...shuffledClubs.slice(0, targetClubs));

  if (picked.length < SUGGESTIONS_PER_CARD) {
    const pickedIds = new Set(picked.map((p) => p.id));
    const remainder = shuffleWithSeed(
      scored.filter((u) => !pickedIds.has(u.id)),
      `${seed}:fill`,
    );
    for (const user of remainder) {
      if (picked.length >= SUGGESTIONS_PER_CARD) break;
      picked.push(user);
    }
  }

  return shuffleWithSeed(picked, `${seed}:final`)
    .slice(0, SUGGESTION_POOL_SIZE)
    .map(({ score: _s, ...u }) => u);
}

// ── Feed assembly ────────────────────────────────────────────

function toFeedPostPayload(
  post: RawPost & { isLiked: boolean; isReposted: boolean; taggedUsers: TaggedUserSummary[] },
): FeedPostPayload {
  return post as unknown as FeedPostPayload;
}

async function enrichRawPosts(rawPosts: RawPost[], viewerId: string) {
  if (rawPosts.length === 0) return [];
  const withEngagement = await enrichPostsWithEngagement(rawPosts, viewerId);
  const enriched = await enrichPostsWithTags(withEngagement);
  return enriched.map(toFeedPostPayload);
}

export async function buildFeed(
  userId: string,
  input: FeedQueryInput,
): Promise<{
  items: FeedItem[];
  cursor: string | null;
  hasMore: boolean;
  activity: FeedActivitySnapshot;
}> {
  const { cursor, limit } = input;
  const nowMs = Date.now();
  const now = new Date(nowMs);

  const [activityMetrics, graph] = await Promise.all([
    getPlatformActivityMetrics(),
    getViewerContext(userId),
  ]);

  const viralThreshold = computeViralThreshold(activityMetrics);
  const recommendedRatio = computeRecommendedPostRatio(activityMetrics);
  const suggestionInterval = computeSuggestionInterval(graph.followingIds.length);
  const viralInterval = computeViralInterval(recommendedRatio);

  const followingSince = new Date(nowMs - FOLLOWING_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
  const viralSince = new Date(nowMs - VIRAL_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

  const moderation = await getModerationContext(userId);

  const [allCandidates, suggestions] = await Promise.all([
    loadPostCandidates(followingSince),
    buildFollowSuggestions(userId, graph.followingSet, graph.viewer?.activities ?? []),
  ]);

  const visible = allCandidates.filter(
    (p) => !isPostHidden(moderation, p.id, p.authorId) && !isUserHidden(moderation, p.authorId),
  );

  const followingCandidates = visible
    .filter((p) => graph.feedAuthorIds.includes(p.authorId))
    .map((post) => ({ post, score: scoreFollowingPost(post, nowMs) }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.post.createdAt.getTime() - a.post.createdAt.getTime();
    });

  const viralCandidates = visible
    .filter((p) => {
      if (graph.feedAuthorIds.includes(p.authorId)) return false;
      if (p.authorId === userId) return false;
      if (p.createdAt < viralSince) return false;
      return computeEngagementScore(p) >= viralThreshold;
    })
    .map((post) => ({ post, score: scoreViralPost(post, nowMs) }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.post.createdAt.getTime() - a.post.createdAt.getTime();
    });

  const dailyViralOrder = shuffleWithSeed(viralCandidates, dailySeed(userId, now) + ':viral');

  const suggestionPool = suggestions;
  const refreshDate = now.toISOString().slice(0, 10);

  const makeSuggestionItem = (slot: number): FeedItem | null => {
    if (suggestionPool.length < 3) return null;
    const start = (slot * SUGGESTIONS_PER_CARD) % suggestionPool.length;
    const users: FeedSuggestedUser[] = [];
    for (let i = 0; i < SUGGESTIONS_PER_CARD; i++) {
      const user = suggestionPool[(start + i) % suggestionPool.length];
      if (user) users.push(user);
    }
    if (users.length < 3) return null;
    return {
      id: `suggest:${refreshDate}:${slot}`,
      kind: 'follow_suggestions',
      title: slot === 0 ? 'Athletes & clubs to follow' : 'More for you',
      subtitle: 'Fresh picks for you today',
      refreshDate,
      users,
    };
  };

  const feedItems: FeedItem[] = [];
  const usedPostIds = new Set<string>();
  let followingIdx = 0;
  let viralIdx = 0;
  let followingPostsSinceViral = 0;
  let postsSinceSuggestion = 0;
  let suggestionSlot = 0;

  const takeFollowing = (): RawPost | null => {
    while (followingIdx < followingCandidates.length) {
      const entry = followingCandidates[followingIdx++]!;
      if (usedPostIds.has(entry.post.id)) continue;
      usedPostIds.add(entry.post.id);
      return entry.post;
    }
    return null;
  };

  const takeViral = (): RawPost | null => {
    while (viralIdx < dailyViralOrder.length) {
      const entry = dailyViralOrder[viralIdx++]!;
      if (usedPostIds.has(entry.post.id)) continue;
      usedPostIds.add(entry.post.id);
      return entry.post;
    }
    return null;
  };

  while (feedItems.length < MAX_FEED_ITEMS) {
    const shouldSuggest =
      suggestionPool.length >= 3 &&
      postsSinceSuggestion >= suggestionInterval &&
      feedItems.some((i) => i.kind === 'post' || i.kind === 'recommended_post');

    if (shouldSuggest) {
      const suggestionItem = makeSuggestionItem(suggestionSlot);
      if (suggestionItem) {
        feedItems.push(suggestionItem);
        suggestionSlot++;
        postsSinceSuggestion = 0;
        continue;
      }
    }

    const shouldInjectViral =
      followingPostsSinceViral >= viralInterval && dailyViralOrder.length > viralIdx;

    if (shouldInjectViral) {
      const viralPost = takeViral();
      if (viralPost) {
        feedItems.push({
          id: `rec:${viralPost.id}`,
          kind: 'recommended_post',
          label: 'Recommended post',
          post: viralPost as unknown as FeedPostPayload,
        });
        followingPostsSinceViral = 0;
        postsSinceSuggestion++;
        continue;
      }
    }

    const followingPost = takeFollowing();
    if (followingPost) {
      feedItems.push({
        id: `post:${followingPost.id}`,
        kind: 'post',
        source: followingPost.authorId === userId ? 'self' : 'following',
        post: followingPost as unknown as FeedPostPayload,
      });
      followingPostsSinceViral++;
      postsSinceSuggestion++;
      continue;
    }

    const viralPost = takeViral();
    if (viralPost) {
      feedItems.push({
        id: `rec:${viralPost.id}`,
        kind: 'recommended_post',
        label: 'Recommended post',
        post: viralPost as unknown as FeedPostPayload,
      });
      postsSinceSuggestion++;
      continue;
    }

    break;
  }

  // Enrich all post payloads in one batch
  const postMap = new Map<string, RawPost>();
  for (const item of feedItems) {
    if (item.kind === 'post' || item.kind === 'recommended_post') {
      postMap.set(item.post.id, item.post as unknown as RawPost);
    }
  }

  const enrichedList = await enrichRawPosts([...postMap.values()], userId);
  const enrichedById = new Map(enrichedList.map((p) => [p.id, p]));

  const hydratedItems: FeedItem[] = feedItems.map((item) => {
    if (item.kind === 'follow_suggestions') return item;
    const enriched = enrichedById.get(item.post.id);
    if (!enriched) return item;
    return { ...item, post: enriched };
  });

  let startIndex = 0;
  if (cursor) {
    const idx = hydratedItems.findIndex((item) => item.id === cursor);
    if (idx >= 0) startIndex = idx + 1;
  }

  const page = hydratedItems.slice(startIndex, startIndex + limit + 1);
  const hasMore = page.length > limit;
  const items = hasMore ? page.slice(0, limit) : page;

  const activity: FeedActivitySnapshot = {
    postsLast24h: activityMetrics.postsLast24h,
    postsLast7d: activityMetrics.postsLast7d,
    engagementsLast7d: activityMetrics.engagementsLast7d,
    activeUsersLast7d: activityMetrics.activeUsersLast7d,
    viralThreshold,
    recommendedPostRatio: recommendedRatio,
    suggestionInterval,
  };

  return {
    items,
    cursor: hasMore ? (items[items.length - 1]?.id ?? null) : null,
    hasMore,
    activity,
  };
}
