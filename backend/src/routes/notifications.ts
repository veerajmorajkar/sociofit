import type { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/auth.js';
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '../services/notification.service.js';
import { sendSuccess } from '../utils/response.js';

export function notificationRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: authenticate }, async (request, reply) => {
    const { cursor, limit } = request.query as { cursor?: string; limit?: string };
    const result = await getNotifications(
      request.user!.userId,
      cursor,
      limit ? parseInt(limit, 10) : 30,
    );
    return sendSuccess(reply, result.notifications, 200, {
      cursor: result.cursor,
      hasMore: result.hasMore,
    });
  });

  app.patch('/read-all', { preHandler: authenticate }, async (request, reply) => {
    const result = await markAllNotificationsRead(request.user!.userId);
    return sendSuccess(reply, result);
  });

  app.patch('/:id/read', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await markNotificationRead(request.user!.userId, id);
    return sendSuccess(reply, result);
  });
}
