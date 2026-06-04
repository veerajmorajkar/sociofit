import type { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/auth.js';
import { presignedUrlSchema } from '../schemas/upload.schema.js';
import { generatePresignedUrl } from '../services/upload.service.js';
import { sendSuccess, sendError } from '../utils/response.js';

export function uploadRoutes(app: FastifyInstance) {
  // Generate a pre-signed URL for direct client → R2 upload
  app.post('/presigned-url', { preHandler: authenticate }, async (request, reply) => {
    const body = presignedUrlSchema.parse(request.body);
    const userId = request.user!.userId;

    try {
      const result = await generatePresignedUrl(userId, body.fileType, body.fileSize, body.folder);
      return sendSuccess(reply, result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate upload URL';
      return sendError(reply, message, 400);
    }
  });
}
