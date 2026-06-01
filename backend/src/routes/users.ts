import type { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/auth.js';
import { updateProfileSchema, paginationSchema } from '../schemas/user.schema.js';
import {
  getProfile,
  updateProfile,
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
} from '../services/user.service.js';
import { sendSuccess, sendError } from '../utils/response.js';

export async function userRoutes(app: FastifyInstance) {
  // ── Get own profile ───────────────────────────────────────
  app.get('/me', { preHandler: authenticate }, async (request, reply) => {
    const profile = await getProfile(request.user!.userId, request.user!.userId);
    if (!profile) return sendError(reply, 'User not found', 404);
    return sendSuccess(reply, profile);
  });

  // ── Update own profile ────────────────────────────────────
  app.patch('/me', { preHandler: authenticate }, async (request, reply) => {
    const body = updateProfileSchema.parse(request.body);
    const updated = await updateProfile(request.user!.userId, body);
    if (!updated) return sendError(reply, 'Failed to update profile', 500);
    return sendSuccess(reply, updated);
  });

  // ── Get user profile by ID ────────────────────────────────
  app.get('/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const profile = await getProfile(id, request.user!.userId);
    if (!profile) return sendError(reply, 'User not found', 404);
    return sendSuccess(reply, profile);
  });

  // ── Follow user ───────────────────────────────────────────
  app.post('/:id/follow', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const result = await followUser(request.user!.userId, id);
      return sendSuccess(reply, result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to follow';
      return sendError(reply, msg, msg.includes('yourself') ? 400 : 404);
    }
  });

  // ── Unfollow user ─────────────────────────────────────────
  app.delete('/:id/follow', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await unfollowUser(request.user!.userId, id);
    return sendSuccess(reply, result);
  });

  // ── Get followers ─────────────────────────────────────────
  app.get('/:id/followers', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { cursor, limit } = paginationSchema.parse(request.query);
    const result = await getFollowers(id, cursor, limit);
    return sendSuccess(reply, result.users, 200, {
      cursor: result.cursor,
      hasMore: result.hasMore,
    });
  });

  // ── Get following ─────────────────────────────────────────
  app.get('/:id/following', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { cursor, limit } = paginationSchema.parse(request.query);
    const result = await getFollowing(id, cursor, limit);
    return sendSuccess(reply, result.users, 200, {
      cursor: result.cursor,
      hasMore: result.hasMore,
    });
  });
}
