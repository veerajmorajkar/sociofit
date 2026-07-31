import { db } from '../config/database.js';
import { reports, contentHides, posts, users, events } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import type { CreateReportInput, HideContentInput } from '../schemas/moderation.schema.js';

export type ModerationTargetType = 'post' | 'user' | 'event';

export interface ModerationContext {
  hiddenPostIds: string[];
  hiddenEventIds: string[];
  hiddenUserIds: string[];
}

export async function getModerationContext(viewerId: string): Promise<ModerationContext> {
  const hides = await db
    .select({
      targetType: contentHides.targetType,
      targetId: contentHides.targetId,
    })
    .from(contentHides)
    .where(eq(contentHides.userId, viewerId));

  return {
    hiddenPostIds: hides.filter((h) => h.targetType === 'post').map((h) => h.targetId),
    hiddenEventIds: hides.filter((h) => h.targetType === 'event').map((h) => h.targetId),
    hiddenUserIds: hides.filter((h) => h.targetType === 'user').map((h) => h.targetId),
  };
}

async function assertTargetExists(targetType: ModerationTargetType, targetId: string) {
  if (targetType === 'post') {
    const [row] = await db
      .select({ id: posts.id })
      .from(posts)
      .where(and(eq(posts.id, targetId), eq(posts.isActive, true)))
      .limit(1);
    if (!row) throw new Error('Post not found');
    return;
  }

  if (targetType === 'user') {
    const [row] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, targetId), eq(users.isActive, true)))
      .limit(1);
    if (!row) throw new Error('User not found');
    return;
  }

  const [row] = await db
    .select({ id: events.id })
    .from(events)
    .where(and(eq(events.id, targetId), eq(events.isActive, true)))
    .limit(1);
  if (!row) throw new Error('Event not found');
}

export function isPostHidden(ctx: ModerationContext, postId: string, authorId: string): boolean {
  return ctx.hiddenPostIds.includes(postId) || ctx.hiddenUserIds.includes(authorId);
}

export function isEventHidden(
  ctx: ModerationContext,
  eventId: string,
  organiserId: string,
): boolean {
  return ctx.hiddenEventIds.includes(eventId) || ctx.hiddenUserIds.includes(organiserId);
}

export function isUserHidden(ctx: ModerationContext, userId: string): boolean {
  return ctx.hiddenUserIds.includes(userId);
}

export async function createReport(reporterId: string, input: CreateReportInput) {
  await assertTargetExists(input.targetType, input.targetId);

  if (input.targetType === 'user' && input.targetId === reporterId) {
    throw new Error('You cannot report yourself');
  }

  if (input.targetType === 'post') {
    const [post] = await db
      .select({ authorId: posts.authorId })
      .from(posts)
      .where(eq(posts.id, input.targetId))
      .limit(1);
    if (post?.authorId === reporterId) {
      throw new Error('You cannot report your own post');
    }
  }

  if (input.targetType === 'event') {
    const [event] = await db
      .select({ organiserId: events.organiserId })
      .from(events)
      .where(eq(events.id, input.targetId))
      .limit(1);
    if (event?.organiserId === reporterId) {
      throw new Error('You cannot report your own event');
    }
  }

  const [existing] = await db
    .select({ id: reports.id })
    .from(reports)
    .where(
      and(
        eq(reports.reporterId, reporterId),
        eq(reports.targetType, input.targetType),
        eq(reports.targetId, input.targetId),
      ),
    )
    .limit(1);

  if (existing) {
    throw new Error('You have already reported this');
  }

  const [created] = await db
    .insert(reports)
    .values({
      reporterId,
      targetType: input.targetType,
      targetId: input.targetId,
      reason: input.reason,
      description: input.description?.trim() || null,
      status: 'pending',
    })
    .returning({
      id: reports.id,
      targetType: reports.targetType,
      targetId: reports.targetId,
      reason: reports.reason,
      status: reports.status,
      createdAt: reports.createdAt,
    });

  return created;
}

export async function hideContent(userId: string, input: HideContentInput) {
  await assertTargetExists(input.targetType, input.targetId);

  if (input.targetType === 'user' && input.targetId === userId) {
    throw new Error('You cannot hide yourself');
  }

  const [existing] = await db
    .select({ id: contentHides.id })
    .from(contentHides)
    .where(
      and(
        eq(contentHides.userId, userId),
        eq(contentHides.targetType, input.targetType),
        eq(contentHides.targetId, input.targetId),
      ),
    )
    .limit(1);

  if (existing) {
    return { hidden: true, alreadyHidden: true };
  }

  await db.insert(contentHides).values({
    userId,
    targetType: input.targetType,
    targetId: input.targetId,
  });

  return { hidden: true, alreadyHidden: false };
}

/** Admin-style listing for future tooling — pending reports newest first. */
export async function listPendingReports(limit = 50) {
  return db
    .select({
      id: reports.id,
      reporterId: reports.reporterId,
      targetType: reports.targetType,
      targetId: reports.targetId,
      reason: reports.reason,
      description: reports.description,
      status: reports.status,
      createdAt: reports.createdAt,
    })
    .from(reports)
    .where(eq(reports.status, 'pending'))
    .orderBy(reports.createdAt)
    .limit(limit);
}

export async function filterHiddenPostIds(
  viewerId: string,
  postIds: string[],
): Promise<Set<string>> {
  if (postIds.length === 0) return new Set();
  const ctx = await getModerationContext(viewerId);
  const hidden = new Set<string>();
  for (const id of postIds) {
    if (ctx.hiddenPostIds.includes(id)) hidden.add(id);
  }
  return hidden;
}

export async function getHiddenUserIdSet(viewerId: string): Promise<Set<string>> {
  const ctx = await getModerationContext(viewerId);
  return new Set(ctx.hiddenUserIds);
}

export async function getHiddenEventIdSet(viewerId: string): Promise<Set<string>> {
  const ctx = await getModerationContext(viewerId);
  return new Set([...ctx.hiddenEventIds]);
}

export async function isContentHiddenForUser(
  viewerId: string,
  targetType: ModerationTargetType,
  targetId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: contentHides.id })
    .from(contentHides)
    .where(
      and(
        eq(contentHides.userId, viewerId),
        eq(contentHides.targetType, targetType),
        eq(contentHides.targetId, targetId),
      ),
    )
    .limit(1);
  return !!row;
}
