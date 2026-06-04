import { db } from '../config/database.js';
import { events, eventParticipants, users, categories } from '../db/schema.js';
import { eq, and, desc, asc, sql, inArray, gte, lte, ilike, gt } from 'drizzle-orm';
import type {
  CreateEventInput,
  UpdateEventInput,
  EventQueryInput,
} from '../schemas/event.schema.js';
import { notifyUser } from './notification.service.js';

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

  const rsvpSet = new Set(rsvpd.map((r) => r.eventId));
  const enriched = fullEvents.map((e) => ({ ...e, isRsvped: rsvpSet.has(e.id) }));

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
export async function getJoinedEvents(userId: string) {
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

  const enrich = (rows: typeof upcomingRows) =>
    rows.map((e) => ({ ...e, isRsvped: true as const }));

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

  const rsvpSet = new Set(rsvpd.map((r) => r.eventId));
  const enrich = (rows: typeof upcomingRows) =>
    rows.map((e) => ({ ...e, isRsvped: rsvpSet.has(e.id) }));

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

  return { ...event, isRsvped: !!rsvp };
}

// ── Create Event ──────────────────────────────────────────────
export async function createEvent(organiserId: string, input: CreateEventInput) {
  const [event] = await db
    .insert(events)
    .values({
      organiserId,
      title: input.title,
      description: input.description,
      categoryId: input.categoryId,
      coverImageUrl: input.coverImageUrl,
      startTime: new Date(input.startTime),
      endTime: new Date(input.endTime),
      locationName: input.locationName,
      locationAddress: input.locationAddress,
      latitude: input.latitude.toString(),
      longitude: input.longitude.toString(),
      maxCapacity: input.maxCapacity,
      priceInr: input.priceInr,
      status: 'upcoming',
      chatroomActive: true,
      chatroomExpiresAt: new Date(new Date(input.endTime).getTime() + 24 * 60 * 60 * 1000),
    })
    .returning();

  if (!event) throw new Error('Failed to create event');

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
  if (input.coverImageUrl) updateData.coverImageUrl = input.coverImageUrl;
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

// ── RSVP Event (free only) ────────────────────────────────────
export async function rsvpEvent(userId: string, eventId: string) {
  const [event] = await db
    .select({
      id: events.id,
      title: events.title,
      organiserId: events.organiserId,
      priceInr: events.priceInr,
      maxCapacity: events.maxCapacity,
      participantCount: events.participantCount,
      status: events.status,
    })
    .from(events)
    .where(and(eq(events.id, eventId), eq(events.isActive, true)))
    .limit(1);

  if (!event) throw new Error('Event not found');
  if (event.status === 'cancelled' || event.status === 'completed') {
    throw new Error('Event is no longer accepting RSVPs');
  }
  if (event.priceInr && event.priceInr > 0) {
    throw new Error('This event requires payment — use the payment flow');
  }
  if (event.maxCapacity && (event.participantCount ?? 0) >= event.maxCapacity) {
    throw new Error('Event is at capacity');
  }

  // Check already rsvp'd
  const [existing] = await db
    .select({ id: eventParticipants.id })
    .from(eventParticipants)
    .where(and(eq(eventParticipants.eventId, eventId), eq(eventParticipants.userId, userId)))
    .limit(1);

  if (existing) return { rsvped: true, participantCount: event.participantCount ?? 0 };

  await db.insert(eventParticipants).values({
    eventId,
    userId,
    status: 'confirmed',
  });

  if (event.organiserId !== userId) {
    const [joiner] = await db
      .select({ displayName: users.displayName })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    notifyUser({
      userId: event.organiserId,
      type: 'event_rsvp',
      title: `${joiner?.displayName ?? 'Someone'} joined your event`,
      body: event.title,
      data: { eventId },
    });
  }

  const [updated] = await db
    .update(events)
    .set({
      participantCount: sql`COALESCE(${events.participantCount}, 0) + 1`,
    })
    .where(eq(events.id, eventId))
    .returning({ participantCount: events.participantCount });

  return { rsvped: true, participantCount: updated?.participantCount ?? 1 };
}

// ── Cancel RSVP ───────────────────────────────────────────────
export async function cancelRsvp(userId: string, eventId: string) {
  const deleted = await db
    .delete(eventParticipants)
    .where(and(eq(eventParticipants.eventId, eventId), eq(eventParticipants.userId, userId)))
    .returning({ id: eventParticipants.id });

  let participantCount = 0;
  if (deleted.length > 0) {
    const [updated] = await db
      .update(events)
      .set({
        participantCount: sql`GREATEST(COALESCE(${events.participantCount}, 0) - 1, 0)`,
      })
      .where(eq(events.id, eventId))
      .returning({ participantCount: events.participantCount });
    participantCount = updated?.participantCount ?? 0;
  } else {
    const [event] = await db
      .select({ participantCount: events.participantCount })
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1);
    participantCount = event?.participantCount ?? 0;
  }

  return { rsvped: false, participantCount };
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
