/**
 * Periodically recomputes denormalized engagement counters from their
 * source-of-truth tables and corrects any drift. The hot-path mutations
 * (like/unlike, repost/unrepost, comment, RSVP) already update these counters
 * atomically inside the same transaction as the underlying row insert/delete,
 * so drift should be rare — this job is a safety net against edge cases like
 * manual DB edits, historical data, or bugs we haven't caught yet.
 */
import { eq, sql } from 'drizzle-orm';
import { db } from '../config/database.js';
import { posts, events } from '../db/schema.js';

interface DriftRow {
  id: string;
  cached: number | null;
  actual: number;
}

async function repairPostLikeCounts(): Promise<number> {
  const { rows } = await db.execute(sql`
    SELECT p.id, p.like_count AS cached, COALESCE(COUNT(l.id), 0)::int AS actual
    FROM posts p
    LEFT JOIN likes l ON l.post_id = p.id
    GROUP BY p.id
    HAVING p.like_count IS DISTINCT FROM COALESCE(COUNT(l.id), 0)::int
  `);
  for (const row of rows as unknown as DriftRow[]) {
    await db.update(posts).set({ likeCount: row.actual }).where(eq(posts.id, row.id));
    console.warn(
      `[counter-repair] post ${row.id} likeCount drift: cached=${row.cached} actual=${row.actual}`,
    );
  }
  return rows.length;
}

async function repairPostCommentCounts(): Promise<number> {
  const { rows } = await db.execute(sql`
    SELECT p.id, p.comment_count AS cached, COALESCE(COUNT(c.id), 0)::int AS actual
    FROM posts p
    LEFT JOIN comments c ON c.post_id = p.id
    GROUP BY p.id
    HAVING p.comment_count IS DISTINCT FROM COALESCE(COUNT(c.id), 0)::int
  `);
  for (const row of rows as unknown as DriftRow[]) {
    await db.update(posts).set({ commentCount: row.actual }).where(eq(posts.id, row.id));
    console.warn(
      `[counter-repair] post ${row.id} commentCount drift: cached=${row.cached} actual=${row.actual}`,
    );
  }
  return rows.length;
}

async function repairPostShareCounts(): Promise<number> {
  const { rows } = await db.execute(sql`
    SELECT p.id, p.share_count AS cached, COALESCE(COUNT(r.id), 0)::int AS actual
    FROM posts p
    LEFT JOIN reposts r ON r.post_id = p.id
    GROUP BY p.id
    HAVING p.share_count IS DISTINCT FROM COALESCE(COUNT(r.id), 0)::int
  `);
  for (const row of rows as unknown as DriftRow[]) {
    await db.update(posts).set({ shareCount: row.actual }).where(eq(posts.id, row.id));
    console.warn(
      `[counter-repair] post ${row.id} shareCount drift: cached=${row.cached} actual=${row.actual}`,
    );
  }
  return rows.length;
}

async function repairEventParticipantCounts(): Promise<number> {
  const { rows } = await db.execute(sql`
    SELECT e.id, e.participant_count AS cached, COALESCE(COUNT(ep.id), 0)::int AS actual
    FROM events e
    LEFT JOIN event_participants ep ON ep.event_id = e.id AND ep.status = 'confirmed'
    GROUP BY e.id
    HAVING e.participant_count IS DISTINCT FROM COALESCE(COUNT(ep.id), 0)::int
  `);
  for (const row of rows as unknown as DriftRow[]) {
    await db.update(events).set({ participantCount: row.actual }).where(eq(events.id, row.id));
    console.warn(
      `[counter-repair] event ${row.id} participantCount drift: cached=${row.cached} actual=${row.actual}`,
    );
  }
  return rows.length;
}

export async function repairEngagementCounters(): Promise<{
  likeDrift: number;
  commentDrift: number;
  shareDrift: number;
  eventParticipantDrift: number;
}> {
  const [likeDrift, commentDrift, shareDrift, eventParticipantDrift] = await Promise.all([
    repairPostLikeCounts(),
    repairPostCommentCounts(),
    repairPostShareCounts(),
    repairEventParticipantCounts(),
  ]);
  return { likeDrift, commentDrift, shareDrift, eventParticipantDrift };
}

const REPAIR_INTERVAL_MS = 30 * 60 * 1000; // every 30 minutes

export function startCounterRepairScheduler(): NodeJS.Timeout {
  const tick = async () => {
    try {
      const result = await repairEngagementCounters();
      const total =
        result.likeDrift + result.commentDrift + result.shareDrift + result.eventParticipantDrift;
      if (total > 0) {
        console.warn(
          `[counter-repair] corrected ${total} drifted counter(s): ` +
            `likes=${result.likeDrift} comments=${result.commentDrift} shares=${result.shareDrift} eventParticipants=${result.eventParticipantDrift}`,
        );
      }
    } catch (err) {
      console.error('[counter-repair] Scheduler error:', err);
    }
  };

  void tick();
  return setInterval(() => void tick(), REPAIR_INTERVAL_MS);
}
