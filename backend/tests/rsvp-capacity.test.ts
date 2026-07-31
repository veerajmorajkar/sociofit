import { describe, it, expect, beforeAll, afterAll } from 'vitest';

process.env.DATABASE_URL ??= 'postgresql://fitsocial:fitsocial@localhost:5432/fitsocial';
process.env.JWT_ACCESS_SECRET ??= 'test-access-secret-1234567890';
process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret-1234567890';

import { db, pool } from '../src/config/database.js';
import { users, categories, events, eventParticipants } from '../src/db/schema.js';
import { eq } from 'drizzle-orm';
import { rsvpEvent } from '../src/services/event.service.js';

const CAPACITY = 3;
const CONCURRENT_JOINERS = 10;

let organiserId: string;
let categoryId: string;
let eventId: string;
let joinerIds: string[] = [];

describe('Atomic event RSVP capacity enforcement', () => {
  beforeAll(async () => {
    const [organiser] = await db
      .insert(users)
      .values({
        accountType: 'personal',
        displayName: 'RSVP Test Organiser',
        username: `rsvp_organiser_${Date.now()}`,
      })
      .returning({ id: users.id });
    organiserId = organiser!.id;

    const [category] = (await db.select({ id: categories.id }).from(categories).limit(1)) ?? [];
    if (category) {
      categoryId = category.id;
    } else {
      const [created] = await db
        .insert(categories)
        .values({ name: `RSVP Test Category ${Date.now()}`, slug: `rsvp-test-${Date.now()}` })
        .returning({ id: categories.id });
      categoryId = created!.id;
    }

    const [event] = await db
      .insert(events)
      .values({
        organiserId,
        title: 'RSVP Capacity Test Event',
        categoryId,
        startTime: new Date(Date.now() + 60 * 60 * 1000),
        endTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
        latitude: '19.0760',
        longitude: '72.8777',
        locationName: 'Test Venue',
        maxCapacity: CAPACITY,
        priceInr: 0,
        participantCount: 1,
        status: 'upcoming',
      })
      .returning({ id: events.id });
    eventId = event!.id;

    // Organiser is auto-counted as attending (mirrors createEvent behaviour).
    await db
      .insert(eventParticipants)
      .values({ eventId, userId: organiserId, status: 'confirmed' });

    const joiners = await db
      .insert(users)
      .values(
        Array.from({ length: CONCURRENT_JOINERS }, (_, i) => ({
          accountType: 'personal' as const,
          displayName: `RSVP Test Joiner ${i}`,
          username: `rsvp_joiner_${Date.now()}_${i}`,
        })),
      )
      .returning({ id: users.id });
    joinerIds = joiners.map((j) => j.id);
  }, 30_000);

  afterAll(async () => {
    await db.delete(events).where(eq(events.id, eventId));
    for (const id of [organiserId, ...joinerIds]) {
      await db.delete(users).where(eq(users.id, id));
    }
    await pool.end();
  });

  it(`allows exactly ${CAPACITY - 1} of ${CONCURRENT_JOINERS} concurrent joiners to fill remaining capacity`, async () => {
    // Organiser already occupies 1 of the 3 capacity slots, so only
    // CAPACITY - 1 more confirmed joins should succeed.
    const results = await Promise.allSettled(joinerIds.map((userId) => rsvpEvent(userId, eventId)));

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');

    expect(fulfilled).toHaveLength(CAPACITY - 1);
    expect(rejected).toHaveLength(CONCURRENT_JOINERS - (CAPACITY - 1));
    for (const r of rejected) {
      expect(String(r.reason)).toMatch(/at capacity/i);
    }

    // Source-of-truth row count must match the cached counter exactly — no drift.
    const confirmedRows = await db
      .select({ id: eventParticipants.id })
      .from(eventParticipants)
      .where(eq(eventParticipants.eventId, eventId));
    expect(confirmedRows).toHaveLength(CAPACITY);

    const [eventRow] = await db
      .select({ participantCount: events.participantCount })
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1);
    expect(eventRow?.participantCount).toBe(CAPACITY);
  }, 30_000);
});
