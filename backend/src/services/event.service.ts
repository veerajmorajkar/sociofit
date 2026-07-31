import { db } from '../config/database.js';
import { events, eventParticipants, users, categories } from '../db/schema.js';
import { eq, and, desc, asc, sql, inArray, gte, lte, ilike, gt } from 'drizzle-orm';
import type {
  CreateEventInput,
  UpdateEventInput,
  EventQueryInput,
} from '../schemas/event.schema.js';
import { notifyUser } from './notification.service.js';
import { ensureEventDiscussion, addUserToEventDiscussion } from './messaging-event.service.js';
import type { CoverNavTone } from './cover-tone.service.js';
import { getModerationContext, isEventHidden } from './moderation.service.js';
import { assertOptionalUserMediaUrl } from '../utils/media-url.js';

async function resolveCoverNavTone(coverImageUrl?: string): Promise<CoverNavTone | undefined> {
  if (!coverImageUrl) return undefined;
  try {
    const { analyzeCoverNavTone } = await import('./cover-tone.service.js');
    return await analyzeCoverNavTone(coverImageUrl);
  } catch {
    return 'dark';
  }
}

/** Organiser is always counted as attending; backfill legacy events on read. */
async function ensureOrganiserJoined(eventId: string, organiserId: string): Promise<void> {
  const [existing] = await db
    .select({ id: eventParticipants.id })
    .from(eventParticipants)
    .where(and(eq(eventParticipants.eventId, eventId), eq(eventParticipants.userId, organiserId)))
    .limit(1);

  if (existing) {
    await db
      .update(events)
      .set({
        participantCount: sql`GREATEST(COALESCE(${events.participantCount}, 0), 1)`,
      })
      .where(eq(events.id, eventId));
    return;
  }

  await db.insert(eventParticipants).values({
    eventId,
    userId: organiserId,
    status: 'confirmed',
  });
  await db
    .update(events)
    .set({
      participantCount: sql`GREATEST(COALESCE(${events.participantCount}, 0), 1)`,
    })
    .where(eq(events.id, eventId));
}

// ── List Events ───────────────────────────────────────────────
export async function getEvents(userId: string, input: EventQueryInput) {
  const {
    cursor,
    limit,
    category,
    categories: categorySlugsInput,
    status,
    priceType,
    startDate,
    endDate,
    search,
  } = input;

  const conditions: ReturnType<typeof eq>[] = [eq(events.isActive, true)];

  if (status) conditions.push(eq(events.status, status));
  if (!status) {
    // default: only upcoming and live events
    conditions.push(sql`${events.status} IN ('upcoming', 'live')`);
  }
  if (priceType === 'free') conditions.push(sql`${events.priceInr} = 0`);
  if (priceType === 'paid') conditions.push(sql`${events.priceInr} > 0`);
  if (startDate) conditions.push(gte(events.startTime, new Date(startDate)));
  if (endDate) conditions.push(lte(events.startTime, new Date(endDate)));
  if (search) conditions.push(ilike(events.title, `%${search}%`));
  if (cursor) {
    conditions.push(
      sql`${events.createdAt} < (SELECT created_at FROM events WHERE id = ${cursor})`,
    );
  }

  const categorySlugs = [
    ...new Set([
      ...(categorySlugsInput ?? []),
      ...(category && category !== 'all' ? [category] : []),
    ]),
  ];
  if (categorySlugs.length > 0) {
    const cats = await db
      .select({ id: categories.id })
      .from(categories)
      .where(inArray(categories.slug, categorySlugs));
    const categoryIds = cats.map((c) => c.id);
    if (categoryIds.length === 0) {
      return { events: [], cursor: null, hasMore: false };
    }
    conditions.push(inArray(events.categoryId, categoryIds));
  }

  const rows = await db
    .select({ id: events.id })
    .from(events)
    .where(and(...conditions))
    .orderBy(desc(events.startTime))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const eventIds = rows.map((e) => e.id);
  if (hasMore) eventIds.pop();

  if (eventIds.length === 0) return { events: [], cursor: null, hasMore: false };

  const fullEvents = await db.query.events.findMany({
    where: inArray(events.id, eventIds),
    with: {
      organiser: {
        columns: {
          id: true,
          displayName: true,
          username: true,
          avatarUrl: true,
          accountType: true,
          isVerified: true,
        },
      },
      category: {
        columns: { id: true, name: true, slug: true },
      },
    },
    orderBy: [desc(events.startTime)],
  });

  // Batch check RSVPs
  const rsvpd = await db
    .select({ eventId: eventParticipants.eventId })
    .from(eventParticipants)
    .where(
      and(
        eq(eventParticipants.userId, userId),
        inArray(eventParticipants.eventId, eventIds),
        eq(eventParticipants.status, 'confirmed'),
      ),
    );

  const moderation = await getModerationContext(userId);
  const visibleEvents = fullEvents.filter((e) => !isEventHidden(moderation, e.id, e.organiserId));

  const rsvpSet = new Set(rsvpd.map((r) => r.eventId));
  const enriched = visibleEvents.map((e) => ({ ...e, isRsvped: rsvpSet.has(e.id) }));

  return {
    events: enriched,
    cursor: hasMore ? (eventIds[eventIds.length - 1] ?? null) : null,
    hasMore,
  };
}

const eventListRelations = {
  organiser: {
    columns: {
      id: true,
      displayName: true,
      username: true,
      avatarUrl: true,
      accountType: true,
      isVerified: true,
    },
  },
  category: {
    columns: { id: true, name: true, slug: true },
  },
} as const;

// ── Joined events (profile activity) ─────────────────────────
export async function getJoinedEvents(userId: string, viewerId?: string) {
  const participations = await db
    .select({ eventId: eventParticipants.eventId })
    .from(eventParticipants)
    .where(and(eq(eventParticipants.userId, userId), eq(eventParticipants.status, 'confirmed')));

  const eventIds = participations.map((p) => p.eventId);
  if (eventIds.length === 0) {
    return { upcoming: [], past: [] };
  }

  const now = new Date();

  const upcomingRows = await db.query.events.findMany({
    where: and(inArray(events.id, eventIds), eq(events.isActive, true), gt(events.endTime, now)),
    with: eventListRelations,
    orderBy: [asc(events.startTime)],
  });

  const pastRows = await db.query.events.findMany({
    where: and(inArray(events.id, eventIds), eq(events.isActive, true), lte(events.endTime, now)),
    with: eventListRelations,
    orderBy: [desc(events.endTime)],
  });

  const moderation = viewerId ? await getModerationContext(viewerId) : null;
  const visible = (rows: typeof upcomingRows) =>
    moderation ? rows.filter((e) => !isEventHidden(moderation, e.id, e.organiserId)) : rows;

  const enrich = (rows: typeof upcomingRows) =>
    visible(rows).map((e) => ({ ...e, isRsvped: true as const }));

  return {
    upcoming: enrich(upcomingRows),
    past: enrich(pastRows),
  };
}

// ── Hosted events (profile events tab) ─────────────────────────
export async function getHostedEvents(organiserId: string, viewerId: string) {
  const now = new Date();

  const upcomingRows = await db.query.events.findMany({
    where: and(
      eq(events.organiserId, organiserId),
      eq(events.isActive, true),
      gt(events.endTime, now),
    ),
    with: eventListRelations,
    orderBy: [asc(events.startTime)],
  });

  const pastRows = await db.query.events.findMany({
    where: and(
      eq(events.organiserId, organiserId),
      eq(events.isActive, true),
      lte(events.endTime, now),
    ),
    with: eventListRelations,
    orderBy: [desc(events.endTime)],
  });

  const allIds = [...upcomingRows, ...pastRows].map((e) => e.id);
  if (allIds.length === 0) {
    return { upcoming: [], past: [] };
  }

  const rsvpd = await db
    .select({ eventId: eventParticipants.eventId })
    .from(eventParticipants)
    .where(
      and(
        eq(eventParticipants.userId, viewerId),
        inArray(eventParticipants.eventId, allIds),
        eq(eventParticipants.status, 'confirmed'),
      ),
    );

  const moderation = await getModerationContext(viewerId);
  const visible = (rows: typeof upcomingRows) =>
    rows.filter((e) => !isEventHidden(moderation, e.id, e.organiserId));

  const rsvpSet = new Set(rsvpd.map((r) => r.eventId));
  const enrich = (rows: typeof upcomingRows) =>
    visible(rows).map((e) => ({ ...e, isRsvped: rsvpSet.has(e.id) }));

  return {
    upcoming: enrich(upcomingRows),
    past: enrich(pastRows),
  };
}

// ── Get Event By ID ───────────────────────────────────────────
export async function getEventById(eventId: string, userId: string) {
  const event = await db.query.events.findFirst({
    where: and(eq(events.id, eventId), eq(events.isActive, true)),
    with: {
      organiser: {
        columns: {
          id: true,
          displayName: true,
          username: true,
          avatarUrl: true,
          accountType: true,
          isVerified: true,
        },
      },
      category: {
        columns: { id: true, name: true, slug: true },
      },
      participants: {
        where: eq(eventParticipants.status, 'confirmed'),
        limit: 5,
        with: {
          user: {
            columns: {
              id: true,
              displayName: true,
              username: true,
              avatarUrl: true,
            },
          },
        },
        columns: {
          id: true,
          userId: true,
          status: true,
          joinedAt: true,
        },
      },
    },
  });

  if (!event) return null;

  const moderation = await getModerationContext(userId);
  if (isEventHidden(moderation, event.id, event.organiserId)) return null;

  await ensureOrganiserJoined(eventId, event.organiserId);

  let coverNavTone = event.coverNavTone as CoverNavTone | null;
  if (event.coverImageUrl && !coverNavTone) {
    const resolved = await resolveCoverNavTone(event.coverImageUrl);
    coverNavTone = resolved ?? null;
    if (resolved)
      await db.update(events).set({ coverNavTone: resolved }).where(eq(events.id, eventId));
  }

  const [rsvp] = await db
    .select({ id: eventParticipants.id })
    .from(eventParticipants)
    .where(
      and(
        eq(eventParticipants.eventId, eventId),
        eq(eventParticipants.userId, userId),
        eq(eventParticipants.status, 'confirmed'),
      ),
    )
    .limit(1);

  const [hostedCount] = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(events)
    .where(and(eq(events.organiserId, event.organiserId), eq(events.isActive, true)));

  const [countRow] = await db
    .select({ participantCount: events.participantCount })
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);

  const isRsvped = !!rsvp || event.organiserId === userId;
  let discussionId: string | null = null;
  if (isRsvped) {
    discussionId = await ensureEventDiscussion(eventId);
  }

  return {
    ...event,
    participantCount: Math.max(countRow?.participantCount ?? 0, 1),
    coverNavTone,
    isRsvped,
    discussionId,
    organiser: {
      ...event.organiser,
      hostedEventsCount: hostedCount?.count ?? 0,
    },
  };
}

// ── Create Event ──────────────────────────────────────────────
export async function createEvent(organiserId: string, input: CreateEventInput) {
  await assertOptionalUserMediaUrl(input.coverImageUrl, organiserId, 'covers');
  const coverNavTone = await resolveCoverNavTone(input.coverImageUrl);

  const [event] = await db
    .insert(events)
    .values({
      organiserId,
      title: input.title,
      description: input.description,
      categoryId: input.categoryId,
      coverImageUrl: input.coverImageUrl,
      coverNavTone,
      startTime: new Date(input.startTime),
      endTime: new Date(input.endTime),
      locationName: input.locationName,
      locationAddress: input.locationAddress,
      latitude: input.latitude.toString(),
      longitude: input.longitude.toString(),
      maxCapacity: input.maxCapacity,
      priceInr: input.priceInr,
      participantCount: 1,
      status: 'upcoming',
      chatroomActive: true,
      chatroomExpiresAt: new Date(new Date(input.endTime).getTime() + 24 * 60 * 60 * 1000),
    })
    .returning();

  if (!event) throw new Error('Failed to create event');

  await db.insert(eventParticipants).values({
    eventId: event.id,
    userId: organiserId,
    status: 'confirmed',
  });

  await ensureEventDiscussion(event.id);

  return getEventById(event.id, organiserId);
}

// ── Update Event ──────────────────────────────────────────────
export async function updateEvent(organiserId: string, eventId: string, input: UpdateEventInput) {
  const [existing] = await db
    .select({ id: events.id, organiserId: events.organiserId })
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);

  if (!existing) throw new Error('Event not found');
  if (existing.organiserId !== organiserId) throw new Error('Not authorised to update this event');

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (input.title) updateData.title = input.title;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.coverImageUrl) {
    await assertOptionalUserMediaUrl(input.coverImageUrl, organiserId, 'covers');
    updateData.coverImageUrl = input.coverImageUrl;
    updateData.coverNavTone = await resolveCoverNavTone(input.coverImageUrl);
  }
  if (input.startTime) updateData.startTime = new Date(input.startTime);
  if (input.endTime) updateData.endTime = new Date(input.endTime);
  if (input.locationName) updateData.locationName = input.locationName;
  if (input.locationAddress !== undefined) updateData.locationAddress = input.locationAddress;
  if (input.latitude !== undefined) updateData.latitude = input.latitude.toString();
  if (input.longitude !== undefined) updateData.longitude = input.longitude.toString();
  if (input.maxCapacity !== undefined) updateData.maxCapacity = input.maxCapacity;
  if (input.priceInr !== undefined) updateData.priceInr = input.priceInr;
  if (input.status) updateData.status = input.status;

  await db.update(events).set(updateData).where(eq(events.id, eventId));
  return getEventById(eventId, organiserId);
}

/**
 * Row type returned by the `SELECT ... FOR UPDATE` lock query below.
 * Raw SQL is used here (rather than the query builder) because this driver's
 * drizzle-orm version has no `.for('update')` locking clause helper.
 */
interface LockedEventRow {
  organiserId: string;
  title: string;
  priceInr: number | null;
  maxCapacity: number | null;
  status: string | null;
}

async function lockEventForUpdate(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  eventId: string,
): Promise<LockedEventRow | undefined> {
  const result = await tx.execute(sql`
    SELECT organiser_id AS "organiserId", title, price_inr AS "priceInr",
           max_capacity AS "maxCapacity", status
    FROM events
    WHERE id = ${eventId} AND is_active = true
    FOR UPDATE
  `);
  return (result.rows as unknown as LockedEventRow[])[0];
}

// ── RSVP Event (free only) ────────────────────────────────────
// Locks the event row for the duration of the transaction so concurrent RSVPs
// against the same event are fully serialized — capacity is checked against a
// live COUNT(*) of confirmed participants, not the (denormalized) cached
// counter, so overbooking is impossible and the counter self-heals from drift.
export async function rsvpEvent(userId: string, eventId: string) {
  const result = await db.transaction(async (tx) => {
    const event = await lockEventForUpdate(tx, eventId);
    if (!event) throw new Error('Event not found');
    if (event.status === 'cancelled' || event.status === 'completed') {
      throw new Error('Event is no longer accepting RSVPs');
    }
    if (event.priceInr && event.priceInr > 0) {
      throw new Error('This event requires payment — use the payment flow');
    }

    const [existing] = await tx
      .select({ id: eventParticipants.id })
      .from(eventParticipants)
      .where(and(eq(eventParticipants.eventId, eventId), eq(eventParticipants.userId, userId)))
      .limit(1);

    const [confirmedRow] = await tx
      .select({ confirmedCount: sql<number>`cast(count(*) as int)` })
      .from(eventParticipants)
      .where(
        and(eq(eventParticipants.eventId, eventId), eq(eventParticipants.status, 'confirmed')),
      );
    const confirmedCount = confirmedRow?.confirmedCount ?? 0;

    if (existing) {
      return {
        alreadyRsvped: true,
        event,
        participantCount: Math.max(confirmedCount, 1),
      };
    }

    if (event.maxCapacity && confirmedCount >= event.maxCapacity) {
      throw new Error('Event is at capacity');
    }

    await tx.insert(eventParticipants).values({ eventId, userId, status: 'confirmed' });

    const newCount = confirmedCount + 1;
    await tx.update(events).set({ participantCount: newCount }).where(eq(events.id, eventId));

    return {
      alreadyRsvped: false,
      event,
      participantCount: Math.max(newCount, 1),
    };
  });

  if (!result.alreadyRsvped) {
    await addUserToEventDiscussion(eventId, userId);

    if (result.event.organiserId !== userId) {
      const [joiner] = await db
        .select({ displayName: users.displayName })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      notifyUser({
        userId: result.event.organiserId,
        type: 'event_rsvp',
        title: `${joiner?.displayName ?? 'Someone'} joined your event`,
        body: result.event.title,
        data: { eventId },
      });
    }
  }

  return { rsvped: true, participantCount: result.participantCount };
}

// ── Cancel RSVP ───────────────────────────────────────────────
export async function cancelRsvp(userId: string, eventId: string) {
  return db.transaction(async (tx) => {
    const event = await lockEventForUpdate(tx, eventId);

    if (event?.organiserId === userId) {
      throw new Error('Organiser cannot leave their own event');
    }

    const deleted = await tx
      .delete(eventParticipants)
      .where(and(eq(eventParticipants.eventId, eventId), eq(eventParticipants.userId, userId)))
      .returning({ id: eventParticipants.id });

    if (deleted.length === 0) {
      const [current] = await tx
        .select({ participantCount: events.participantCount })
        .from(events)
        .where(eq(events.id, eventId))
        .limit(1);
      return { rsvped: false, participantCount: Math.max(current?.participantCount ?? 0, 1) };
    }

    const [confirmedRow] = await tx
      .select({ confirmedCount: sql<number>`cast(count(*) as int)` })
      .from(eventParticipants)
      .where(
        and(eq(eventParticipants.eventId, eventId), eq(eventParticipants.status, 'confirmed')),
      );
    const confirmedCount = confirmedRow?.confirmedCount ?? 0;

    await tx.update(events).set({ participantCount: confirmedCount }).where(eq(events.id, eventId));

    return { rsvped: false, participantCount: Math.max(confirmedCount, 1) };
  });
}

// ── Get Event Participants ────────────────────────────────────
export async function getEventParticipants(eventId: string, cursor?: string, limit = 20) {
  const result = await db
    .select({
      id: users.id,
      displayName: users.displayName,
      username: users.username,
      avatarUrl: users.avatarUrl,
      accountType: users.accountType,
      isVerified: users.isVerified,
      joinedAt: eventParticipants.joinedAt,
    })
    .from(eventParticipants)
    .innerJoin(users, eq(eventParticipants.userId, users.id))
    .where(
      and(
        eq(eventParticipants.eventId, eventId),
        eq(eventParticipants.status, 'confirmed'),
        cursor
          ? sql`${eventParticipants.joinedAt} > (SELECT joined_at FROM event_participants WHERE event_id = ${eventId} AND user_id = ${cursor} LIMIT 1)`
          : undefined,
      ),
    )
    .orderBy(eventParticipants.joinedAt)
    .limit(limit + 1);

  const hasMore = result.length > limit;
  if (hasMore) result.pop();

  return {
    participants: result,
    cursor: hasMore ? (result[result.length - 1]?.id ?? null) : null,
    hasMore,
  };
}
