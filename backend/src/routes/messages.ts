import type { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/auth.js';
import {
  createDmSchema,
  sendMessageSchema,
  conversationQuerySchema,
} from '../schemas/message.schema.js';
import {
  findOrCreateDm,
  sendMessage,
  getMessages,
  getConversations,
  markAsRead,
} from '../services/messaging.service.js';
import { sendSuccess, sendError } from '../utils/response.js';

export async function messageRoutes(app: FastifyInstance) {
  // ── Get Conversations List ────────────────────────────────
  app.get('/conversations', { preHandler: authenticate }, async (request, reply) => {
    const { cursor, limit } = conversationQuerySchema.parse(request.query);
    const result = await getConversations(request.user!.userId, cursor, limit);
    return sendSuccess(reply, result.conversations, 200, {
      cursor: result.cursor,
      hasMore: result.hasMore,
    });
  });

  // ── Create / Find DM Conversation ─────────────────────────
  app.post('/conversations', { preHandler: authenticate }, async (request, reply) => {
    const body = createDmSchema.parse(request.body);
    try {
      const result = await findOrCreateDm(request.user!.userId, body.recipientId);
      return sendSuccess(reply, result, result.created ? 201 : 200);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create conversation';
      return sendError(reply, msg, msg.includes('yourself') ? 400 : 404);
    }
  });

  // ── Get Messages in Conversation ──────────────────────────
  app.get(
    '/conversations/:id/messages',
    { preHandler: authenticate },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { cursor, limit } = conversationQuerySchema.parse(request.query);
      try {
        const result = await getMessages(request.user!.userId, id, cursor, limit);
        return sendSuccess(reply, result.messages, 200, {
          cursor: result.cursor,
          hasMore: result.hasMore,
        });
      } catch (err) {
        return sendError(reply, 'Not a participant in this conversation', 403);
      }
    },
  );

  // ── Send Message ──────────────────────────────────────────
  app.post(
    '/conversations/:id/messages',
    { preHandler: authenticate },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = sendMessageSchema.parse(request.body);
      try {
        const message = await sendMessage(request.user!.userId, id, body);
        return sendSuccess(reply, message, 201);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to send message';
        return sendError(reply, msg, msg.includes('participant') ? 403 : 500);
      }
    },
  );

  // ── Mark Conversation as Read ─────────────────────────────
  app.patch(
    '/conversations/:id/read',
    { preHandler: authenticate },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const result = await markAsRead(request.user!.userId, id);
      return sendSuccess(reply, result);
    },
  );
}
