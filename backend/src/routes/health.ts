import type { FastifyInstance } from 'fastify';
import { sendSuccess } from '../utils/response.js';

export function healthRoute(app: FastifyInstance) {
  app.get('/health', async (_request, reply) => {
    return sendSuccess(reply, {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '0.1.0',
    });
  });
}
