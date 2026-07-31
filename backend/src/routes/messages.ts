import type { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/auth.js';
import { requireEmailVerified } from '../middleware/requireVerified.js';
import {
  createDmSchema,
  createGroupSchema,
  addGroupMembersSchema,
  sendMessageSchema,
  conversationQuerySchema,
  muteConversationSchema,
} from '../schemas/message.schema.js';
import {
  findOrCreateDm,
  createGroup,
  addGroupMembers,
  leaveConversation,
  removeGroupMember,
  getConversationById,
  sendMessage,
  getMessages,
  getConversations,
  markAsRead,
  setConversationMuted,
} from '../services/messaging.service.js';
import {
  joinClubAnnouncement,
  getClubAnnouncementMeta,
} from '../services/messaging-club.service.js';
import { sendSuccess, sendError } from '../utils/response.js';

function mapMessagingError(reply: Parameters<typeof sendError>[0], err: unknown, fallback: string) {
  const msg = err instanceof Error ? err.message : fallback;
  const status =
    msg.includes('participant') || msg.includes('Not a')
      ? 403
      : msg.includes('not found') || msg.includes('Not found')
        ? 404
        : msg.includes('yourself') ||
            msg.includes('cannot') ||
            msg.includes('Only') ||
            msg.includes('closed')
          ? 400
          : 500;
  return sendError(reply, msg, status);
}

export function messageRoutes(app: FastifyInstance) {
  // ── List conversations ──────────────────────────────────────
  app.get('/conversations', { preHandler: authenticate }, async (request, reply) => {
    const { cursor, limit } = conversationQuerySchema.parse(request.query);
    const result = await getConversations(request.user!.userId, cursor, limit);
    return sendSuccess(reply, result.conversations, 200, {
      cursor: result.cursor,
      hasMore: result.hasMore,
    });
  });

  // ── Create / find 1:1 DM ───────────────────────────────────
  app.post(
    '/conversations',
    { preHandler: [authenticate, requireEmailVerified] },
    async (request, reply) => {
      const body = createDmSchema.parse(request.body);
      try {
        const result = await findOrCreateDm(request.user!.userId, body.recipientId);
        return sendSuccess(reply, result, result.created ? 201 : 200);
      } catch (err) {
        return mapMessagingError(reply, err, 'Failed to create conversation');
      }
    },
  );

  // ── Create group chat ───────────────────────────────────────
  app.post(
    '/conversations/groups',
    { preHandler: [authenticate, requireEmailVerified] },
    async (request, reply) => {
      const body = createGroupSchema.parse(request.body);
      try {
        const result = await createGroup(request.user!.userId, body.title, body.memberIds);
        return sendSuccess(reply, result, 201);
      } catch (err) {
        return mapMessagingError(reply, err, 'Failed to create group');
      }
    },
  );

  // ── Club announcement channel meta (profile button) ─────────
  app.get('/clubs/:clubId/announcement', { preHandler: authenticate }, async (request, reply) => {
    const { clubId } = request.params as { clubId: string };
    const meta = await getClubAnnouncementMeta(clubId, request.user!.userId);
    if (!meta) return sendError(reply, 'Club announcement channel not found', 404);
    return sendSuccess(reply, meta);
  });

  // ── Join club announcement channel ──────────────────────────
  app.post(
    '/clubs/:clubId/announcement/join',
    { preHandler: authenticate },
    async (request, reply) => {
      const { clubId } = request.params as { clubId: string };
      try {
        const result = await joinClubAnnouncement(request.user!.userId, clubId);
        return sendSuccess(reply, result, result.joined ? 201 : 200);
      } catch (err) {
        return mapMessagingError(reply, err, 'Failed to join announcement channel');
      }
    },
  );

  // ── Conversation detail ─────────────────────────────────────
  app.get('/conversations/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const conv = await getConversationById(request.user!.userId, id);
      return sendSuccess(reply, conv);
    } catch (err) {
      return mapMessagingError(reply, err, 'Conversation not found');
    }
  });

  // ── Messages in conversation ────────────────────────────────
  app.get('/conversations/:id/messages', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { cursor, limit } = conversationQuerySchema.parse(request.query);
    try {
      const result = await getMessages(request.user!.userId, id, cursor, limit);
      return sendSuccess(reply, result.messages, 200, {
        cursor: result.cursor,
        hasMore: result.hasMore,
        permissions: result.permissions,
      });
    } catch (err) {
      return mapMessagingError(reply, err, 'Not a participant in this conversation');
    }
  });

  // ── Send message ────────────────────────────────────────────
  app.post(
    '/conversations/:id/messages',
    { preHandler: [authenticate, requireEmailVerified] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = sendMessageSchema.parse(request.body);
      try {
        const message = await sendMessage(request.user!.userId, id, body);
        return sendSuccess(reply, message, 201);
      } catch (err) {
        return mapMessagingError(reply, err, 'Failed to send message');
      }
    },
  );

  // ── Mark read ───────────────────────────────────────────────
  app.patch('/conversations/:id/read', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await markAsRead(request.user!.userId, id);
    return sendSuccess(reply, result);
  });

  // ── Mute / unmute ───────────────────────────────────────────
  app.patch('/conversations/:id/mute', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = muteConversationSchema.parse(request.body);
    try {
      const result = await setConversationMuted(request.user!.userId, id, body.muted);
      return sendSuccess(reply, result);
    } catch (err) {
      return mapMessagingError(reply, err, 'Failed to update mute setting');
    }
  });

  // ── Add group members ───────────────────────────────────────
  app.post('/conversations/:id/members', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = addGroupMembersSchema.parse(request.body);
    try {
      const result = await addGroupMembers(request.user!.userId, id, body.memberIds);
      return sendSuccess(reply, result);
    } catch (err) {
      return mapMessagingError(reply, err, 'Failed to add members');
    }
  });

  // ── Leave conversation (groups + announcement subscribers) ──
  app.post('/conversations/:id/leave', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const result = await leaveConversation(request.user!.userId, id);
      return sendSuccess(reply, result);
    } catch (err) {
      return mapMessagingError(reply, err, 'Failed to leave conversation');
    }
  });

  // ── Remove group member (owner only) ────────────────────────
  app.delete(
    '/conversations/:id/members/:userId',
    { preHandler: authenticate },
    async (request, reply) => {
      const { id, userId: memberId } = request.params as { id: string; userId: string };
      try {
        const result = await removeGroupMember(request.user!.userId, id, memberId);
        return sendSuccess(reply, result);
      } catch (err) {
        return mapMessagingError(reply, err, 'Failed to remove member');
      }
    },
  );
}
