import type { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/auth.js';
import { createReportSchema, hideContentSchema } from '../schemas/moderation.schema.js';
import { createReport, hideContent } from '../services/moderation.service.js';
import { sendSuccess, sendError } from '../utils/response.js';

export function moderationRoutes(app: FastifyInstance) {
  app.post('/reports', { preHandler: authenticate }, async (request, reply) => {
    try {
      const body = createReportSchema.parse(request.body);
      const report = await createReport(request.user!.userId, body);
      return sendSuccess(reply, report, 201);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to submit report';
      const status = message.includes('not found') ? 404 : 400;
      return sendError(reply, message, status);
    }
  });

  app.post('/hides', { preHandler: authenticate }, async (request, reply) => {
    try {
      const body = hideContentSchema.parse(request.body);
      const result = await hideContent(request.user!.userId, body);
      return sendSuccess(reply, result, 201);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to hide content';
      const status = message.includes('not found') ? 404 : 400;
      return sendError(reply, message, status);
    }
  });
}
