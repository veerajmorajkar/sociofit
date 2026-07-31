import type { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/auth.js';
import {
  updateProfileSchema,
  paginationSchema,
  requestEmailChangeSchema,
  confirmEmailChangeSchema,
  requestPhoneChangeSchema,
  confirmPhoneChangeSchema,
} from '../schemas/user.schema.js';
import {
  getProfile,
  updateProfile,
  searchUsers,
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  savePushToken,
} from '../services/user.service.js';
import {
  requestEmailChange,
  confirmEmailChange,
  requestPhoneChange,
  confirmPhoneChange,
} from '../services/contact-change.service.js';
import { sendSuccess, sendError } from '../utils/response.js';

export function userRoutes(app: FastifyInstance) {
  // ── Get own profile ───────────────────────────────────────
  app.get('/me', { preHandler: authenticate }, async (request, reply) => {
    const profile = await getProfile(request.user!.userId, request.user!.userId);
    if (!profile) return sendError(reply, 'User not found', 404);
    return sendSuccess(reply, profile);
  });

  // ── Update own profile ────────────────────────────────────
  app.patch('/me', { preHandler: authenticate }, async (request, reply) => {
    try {
      const body = updateProfileSchema.parse(request.body);
      const updated = await updateProfile(request.user!.userId, body);
      if (!updated) return sendError(reply, 'Failed to update profile', 500);
      return sendSuccess(reply, updated);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update profile';
      const status = message.includes('already in use') ? 409 : 400;
      return sendError(reply, message, status);
    }
  });

  // ── Email change (OTP-verified, never a direct write-through) ──
  app.post('/me/email/request-change', { preHandler: authenticate }, async (request, reply) => {
    try {
      const body = requestEmailChangeSchema.parse(request.body);
      const result = await requestEmailChange(request.user!.userId, body.email);
      return sendSuccess(reply, result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to request email change';
      return sendError(reply, message, message.includes('already in use') ? 409 : 400);
    }
  });

  app.post('/me/email/confirm-change', { preHandler: authenticate }, async (request, reply) => {
    try {
      const body = confirmEmailChangeSchema.parse(request.body);
      const result = await confirmEmailChange(request.user!.userId, body.code);
      return sendSuccess(reply, result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to confirm email change';
      return sendError(reply, message, 400);
    }
  });

  // ── Phone change (OTP-verified, never a direct write-through) ──
  app.post('/me/phone/request-change', { preHandler: authenticate }, async (request, reply) => {
    try {
      const body = requestPhoneChangeSchema.parse(request.body);
      const result = await requestPhoneChange(request.user!.userId, body.phone);
      return sendSuccess(reply, result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to request phone change';
      return sendError(reply, message, message.includes('already in use') ? 409 : 400);
    }
  });

  app.post('/me/phone/confirm-change', { preHandler: authenticate }, async (request, reply) => {
    try {
      const body = confirmPhoneChangeSchema.parse(request.body);
      const result = await confirmPhoneChange(request.user!.userId, body.code);
      return sendSuccess(reply, result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to confirm phone change';
      return sendError(reply, message, 400);
    }
  });

  // ── Search users ──────────────────────────────────────────
  app.get('/search', { preHandler: authenticate }, async (request, reply) => {
    const { q } = request.query as { q?: string };
    if (!q || q.trim().replace(/^@/, '').length < 1) {
      return sendSuccess(reply, []);
    }
    const results = await searchUsers(q);
    return sendSuccess(reply, results);
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

  // ── Register push token ───────────────────────────────────
  app.put('/me/push-token', { preHandler: authenticate }, async (request, reply) => {
    const { token } = request.body as { token?: string };
    if (!token || typeof token !== 'string') {
      return sendError(reply, 'token is required', 400);
    }
    await savePushToken(request.user!.userId, token);
    return sendSuccess(reply, { saved: true });
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
