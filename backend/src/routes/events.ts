import type { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/auth.js';
import { requireEmailVerified } from '../middleware/requireVerified.js';
import { createEventSchema, updateEventSchema, eventQuerySchema } from '../schemas/event.schema.js';
import {
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  rsvpEvent,
  cancelRsvp,
  getEventParticipants,
  getJoinedEvents,
  getHostedEvents,
} from '../services/event.service.js';
import { sendSuccess, sendError } from '../utils/response.js';

export function eventRoutes(app: FastifyInstance) {
  // ── List Events ───────────────────────────────────────────
  app.get('/', { preHandler: authenticate }, async (request, reply) => {
    const query = eventQuerySchema.parse(request.query);
    const result = await getEvents(request.user!.userId, query);
    return sendSuccess(reply, result.events, 200, {
      cursor: result.cursor,
      hasMore: result.hasMore,
    });
  });

  // ── My joined events (upcoming + past) ─────────────────────
  app.get('/me/joined', { preHandler: authenticate }, async (request, reply) => {
    const result = await getJoinedEvents(request.user!.userId, request.user!.userId);
    return sendSuccess(reply, result);
  });

  // ── My hosted events ───────────────────────────────────────
  app.get('/me/hosted', { preHandler: authenticate }, async (request, reply) => {
    const result = await getHostedEvents(request.user!.userId, request.user!.userId);
    return sendSuccess(reply, result);
  });

  // ── Hosted events by user (profile) ─────────────────────────
  app.get('/user/:userId/hosted', { preHandler: authenticate }, async (request, reply) => {
    const { userId } = request.params as { userId: string };
    const result = await getHostedEvents(userId, request.user!.userId);
    return sendSuccess(reply, result);
  });

  // ── Joined events by user (profile activity) ─────────────────
  app.get('/user/:userId/joined', { preHandler: authenticate }, async (request, reply) => {
    const { userId } = request.params as { userId: string };
    const result = await getJoinedEvents(userId, request.user!.userId);
    return sendSuccess(reply, result);
  });

  // ── Create Event ──────────────────────────────────────────
  app.post('/', { preHandler: [authenticate, requireEmailVerified] }, async (request, reply) => {
    const body = createEventSchema.parse(request.body);
    try {
      const event = await createEvent(request.user!.userId, body);
      return sendSuccess(reply, event, 201);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create event';
      return sendError(reply, message, 400);
    }
  });

  // ── Get Event ─────────────────────────────────────────────
  app.get('/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const event = await getEventById(id, request.user!.userId);
    if (!event) return sendError(reply, 'Event not found', 404);
    return sendSuccess(reply, event);
  });

  // ── Update Event ──────────────────────────────────────────
  app.patch('/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = updateEventSchema.parse(request.body);
    try {
      const event = await updateEvent(request.user!.userId, id, body);
      return sendSuccess(reply, event);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update event';
      return sendError(reply, msg, msg.includes('authorised') ? 403 : 404);
    }
  });

  // ── RSVP to Event (free) ──────────────────────────────────
  app.post('/:id/rsvp', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const result = await rsvpEvent(request.user!.userId, id);
      return sendSuccess(reply, result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to RSVP';
      const status = msg.includes('payment') ? 402 : msg.includes('capacity') ? 409 : 400;
      return sendError(reply, msg, status);
    }
  });

  // ── Cancel RSVP ───────────────────────────────────────────
  app.delete('/:id/rsvp', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await cancelRsvp(request.user!.userId, id);
    return sendSuccess(reply, result);
  });

  // ── Get Participants ──────────────────────────────────────
  app.get('/:id/participants', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { cursor, limit } = request.query as { cursor?: string; limit?: string };
    const result = await getEventParticipants(id, cursor, limit ? parseInt(limit) : 20);
    return sendSuccess(reply, result.participants, 200, {
      cursor: result.cursor,
      hasMore: result.hasMore,
    });
  });
}
