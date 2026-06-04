/**
 * Event Reminder Scheduler
 *
 * Runs every 5 minutes and sends push + in-app notifications to all confirmed
 * participants (+ the organiser) for events that are:
 *   - starting in ~24 hours  (reminder_24h_sent_at IS NULL)
 *   - starting in ~1 hour    (reminder_1h_sent_at IS NULL)
 *
 * Uses nullable timestamp columns on the events table as idempotency guards.
 */

import { db } from '../config/database.js';
import { events, eventParticipants } from '../db/schema.js';
import { eq, and, isNull, sql } from 'drizzle-orm';
import { notifyUsers } from './notification.service.js';

async function sendReminders(windowLabel: '24h' | '1h') {
  const now = new Date();

  // Window: [targetMs - 10min, targetMs + 10min] to survive restarts / drift
  const BUFFER_MS = 10 * 60 * 1000;
  const targetMs = windowLabel === '24h' ? 24 * 60 * 60 * 1000 : 60 * 60 * 1000;
  const windowStart = new Date(now.getTime() + targetMs - BUFFER_MS);
  const windowEnd = new Date(now.getTime() + targetMs + BUFFER_MS);

  const sentAtCol = windowLabel === '24h' ? events.reminder24hSentAt : events.reminder1hSentAt;

  // Find events due for this reminder
  const dueEvents = await db
    .select({
      id: events.id,
      title: events.title,
      locationName: events.locationName,
      startTime: events.startTime,
      organiserId: events.organiserId,
    })
    .from(events)
    .where(
      and(
        eq(events.isActive, true),
        sql`${events.status} IN ('upcoming', 'live')`,
        sql`${events.startTime} BETWEEN ${windowStart} AND ${windowEnd}`,
        isNull(sentAtCol),
      ),
    );

  if (dueEvents.length === 0) return;

  for (const event of dueEvents) {
    // Get all confirmed participants
    const participants = await db
      .select({ userId: eventParticipants.userId })
      .from(eventParticipants)
      .where(
        and(eq(eventParticipants.eventId, event.id), eq(eventParticipants.status, 'confirmed')),
      );

    // Collect all recipient user IDs (participants + organiser, deduped)
    const recipientSet = new Set<string>(participants.map((p) => p.userId));
    recipientSet.add(event.organiserId);
    const recipientIds = [...recipientSet];

    if (recipientIds.length === 0) continue;

    const timeLabel = windowLabel === '24h' ? 'tomorrow' : 'in 1 hour';
    const title =
      windowLabel === '24h' ? `Reminder: ${event.title}` : `Starting soon: ${event.title}`;
    const body =
      windowLabel === '24h'
        ? `Your event at ${event.locationName} starts tomorrow. Get ready!`
        : `${event.title} starts in 1 hour at ${event.locationName}. Time to gear up!`;

    const inputs = recipientIds.map((userId) => ({
      userId,
      type: windowLabel === '24h' ? 'event_reminder_24h' : 'event_reminder_1h',
      title,
      body,
      data: { eventId: event.id, timeLabel },
    }));

    await notifyUsers(inputs);

    // Mark reminder sent
    await db
      .update(events)
      .set({ [windowLabel === '24h' ? 'reminder24hSentAt' : 'reminder1hSentAt']: new Date() })
      .where(eq(events.id, event.id));

    console.log(
      `[reminders] Sent ${windowLabel} reminder for "${event.title}" to ${recipientIds.length} user(s)`,
    );
  }
}

export function startEventReminderScheduler() {
  const RUN_EVERY_MS = 5 * 60 * 1000; // every 5 minutes

  const run = async () => {
    try {
      await sendReminders('24h');
      await sendReminders('1h');
    } catch (err) {
      console.error('[reminders] Scheduler error:', err);
    }
  };

  // Run once immediately on startup, then on interval
  void run();
  const handle = setInterval(() => void run(), RUN_EVERY_MS);

  console.log('[reminders] Event reminder scheduler started (every 5 min)');
  return handle;
}
