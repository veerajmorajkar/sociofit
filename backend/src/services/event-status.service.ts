/**
 * Transitions event status based on wall-clock time:
 *   upcoming → live when startTime <= now < endTime
 *   live → completed when endTime < now
 */

import { db } from '../config/database.js';
import { events } from '../db/schema.js';
import { and, eq, lt, lte, gt, inArray } from 'drizzle-orm';

export async function transitionEventStatuses(): Promise<{ live: number; completed: number }> {
  const now = new Date();

  const toLive = await db
    .update(events)
    .set({ status: 'live', updatedAt: now })
    .where(
      and(
        eq(events.isActive, true),
        eq(events.status, 'upcoming'),
        lte(events.startTime, now),
        gt(events.endTime, now),
      ),
    )
    .returning({ id: events.id });

  const toCompleted = await db
    .update(events)
    .set({ status: 'completed', updatedAt: now })
    .where(
      and(
        eq(events.isActive, true),
        inArray(events.status, ['upcoming', 'live']),
        lt(events.endTime, now),
      ),
    )
    .returning({ id: events.id });

  return { live: toLive.length, completed: toCompleted.length };
}

const INTERVAL_MS = 60 * 1000;

export function startEventStatusScheduler(): NodeJS.Timeout {
  const tick = async () => {
    try {
      const result = await transitionEventStatuses();
      if (result.live > 0 || result.completed > 0) {
        // eslint-disable-next-line no-console
        console.log(`[event-status] ${result.live} → live, ${result.completed} → completed`);
      }
    } catch (err) {
      console.error('[event-status] Scheduler error:', err);
    }
  };

  void tick();
  return setInterval(() => void tick(), INTERVAL_MS);
}
