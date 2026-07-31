import { describe, it, expect, beforeAll, afterAll } from 'vitest';

process.env.DATABASE_URL ??= 'postgresql://fitsocial:fitsocial@localhost:5432/fitsocial';
process.env.JWT_ACCESS_SECRET ??= 'test-access-secret-1234567890';
process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret-1234567890';

import { db, pool } from '../src/config/database.js';
import { users, posts, likes, comments } from '../src/db/schema.js';
import { eq } from 'drizzle-orm';
import { repairEngagementCounters } from '../src/services/counter-repair.service.js';

let authorId: string;
let likerId: string;
let postId: string;

describe('Counter drift repair job', () => {
  beforeAll(async () => {
    const [author] = await db
      .insert(users)
      .values({
        accountType: 'personal',
        displayName: 'Counter Repair Author',
        username: `counter_author_${Date.now()}`,
      })
      .returning({ id: users.id });
    authorId = author!.id;

    const [liker] = await db
      .insert(users)
      .values({
        accountType: 'personal',
        displayName: 'Counter Repair Liker',
        username: `counter_liker_${Date.now()}`,
      })
      .returning({ id: users.id });
    likerId = liker!.id;

    const [post] = await db
      .insert(posts)
      .values({
        authorId,
        postType: 'text',
        caption: 'Counter repair test post',
        likeCount: 0,
        commentCount: 0,
      })
      .returning({ id: posts.id });
    postId = post!.id;

    // Simulate drift: real like/comment rows exist, but cached counters are stale.
    await db.insert(likes).values({ userId: likerId, postId });
    await db.insert(comments).values({ postId, authorId: likerId, content: 'drift comment' });
    await db.update(posts).set({ likeCount: 999, commentCount: 999 }).where(eq(posts.id, postId));
  }, 30_000);

  afterAll(async () => {
    await db.delete(posts).where(eq(posts.id, postId));
    for (const id of [authorId, likerId]) {
      await db.delete(users).where(eq(users.id, id));
    }
    await pool.end();
  });

  it('recomputes drifted like/comment counts from source-of-truth tables', async () => {
    const [before] = await db
      .select({ likeCount: posts.likeCount, commentCount: posts.commentCount })
      .from(posts)
      .where(eq(posts.id, postId))
      .limit(1);
    expect(before?.likeCount).toBe(999);
    expect(before?.commentCount).toBe(999);

    const result = await repairEngagementCounters();
    expect(result.likeDrift).toBeGreaterThanOrEqual(1);
    expect(result.commentDrift).toBeGreaterThanOrEqual(1);

    const [after] = await db
      .select({ likeCount: posts.likeCount, commentCount: posts.commentCount })
      .from(posts)
      .where(eq(posts.id, postId))
      .limit(1);
    expect(after?.likeCount).toBe(1);
    expect(after?.commentCount).toBe(1);
  }, 30_000);
});
