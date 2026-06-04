import type { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/auth.js';
import { createPostSchema, feedQuerySchema, commentSchema } from '../schemas/post.schema.js';
import {
  createPost,
  getFeed,
  getPostById,
  likePost,
  unlikePost,
  repostPost,
  unrepostPost,
  addComment,
  getComments,
  deletePost,
  getPostsByAuthor,
} from '../services/post.service.js';
import { sendSuccess, sendError } from '../utils/response.js';

export function postRoutes(app: FastifyInstance) {
  // ── Feed ──────────────────────────────────────────────────
  app.get('/feed', { preHandler: authenticate }, async (request, reply) => {
    const query = feedQuerySchema.parse(request.query);
    const result = await getFeed(request.user!.userId, query);
    return sendSuccess(reply, result.posts, 200, {
      cursor: result.cursor,
      hasMore: result.hasMore,
    });
  });

  // ── Posts by user (profile) ───────────────────────────────
  app.get('/user/:userId', { preHandler: authenticate }, async (request, reply) => {
    const { userId } = request.params as { userId: string };
    const { cursor, limit } = request.query as { cursor?: string; limit?: string };
    const result = await getPostsByAuthor(
      userId,
      request.user!.userId,
      cursor,
      limit ? parseInt(limit, 10) : 20,
    );
    return sendSuccess(reply, result.posts, 200, {
      cursor: result.cursor,
      hasMore: result.hasMore,
    });
  });

  // ── Create Post ───────────────────────────────────────────
  app.post('/', { preHandler: authenticate }, async (request, reply) => {
    const body = createPostSchema.parse(request.body);
    const post = await createPost(request.user!.userId, body);
    return sendSuccess(reply, post, 201);
  });

  // ── Get Post ──────────────────────────────────────────────
  app.get('/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const post = await getPostById(id, request.user!.userId);
    if (!post) return sendError(reply, 'Post not found', 404);
    return sendSuccess(reply, post);
  });

  // ── Delete Post ───────────────────────────────────────────
  app.delete('/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const result = await deletePost(request.user!.userId, id);
      return sendSuccess(reply, result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete post';
      return sendError(reply, msg, msg.includes('authorised') ? 403 : 404);
    }
  });

  // ── Like ──────────────────────────────────────────────────
  app.post('/:id/like', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const result = await likePost(request.user!.userId, id);
      return sendSuccess(reply, result);
    } catch {
      return sendError(reply, 'Post not found', 404);
    }
  });

  // ── Unlike ────────────────────────────────────────────────
  app.delete('/:id/like', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const result = await unlikePost(request.user!.userId, id);
      return sendSuccess(reply, result);
    } catch {
      return sendError(reply, 'Post not found', 404);
    }
  });

  // ── Repost ────────────────────────────────────────────────
  app.post('/:id/repost', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const result = await repostPost(request.user!.userId, id);
      return sendSuccess(reply, result);
    } catch {
      return sendError(reply, 'Post not found', 404);
    }
  });

  app.delete('/:id/repost', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const result = await unrepostPost(request.user!.userId, id);
      return sendSuccess(reply, result);
    } catch {
      return sendError(reply, 'Post not found', 404);
    }
  });

  // ── Get Comments ──────────────────────────────────────────
  app.get('/:id/comments', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { cursor, limit } = request.query as { cursor?: string; limit?: string };
    const result = await getComments(id, cursor, limit ? parseInt(limit) : 20);
    return sendSuccess(reply, result.comments, 200, {
      cursor: result.cursor,
      hasMore: result.hasMore,
    });
  });

  // ── Add Comment ───────────────────────────────────────────
  app.post('/:id/comments', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = commentSchema.parse(request.body);
    try {
      const comment = await addComment(request.user!.userId, id, body);
      return sendSuccess(reply, comment, 201);
    } catch {
      return sendError(reply, 'Post not found', 404);
    }
  });
}
