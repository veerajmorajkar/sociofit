import type { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/auth.js';
import { presignedUrlSchema, confirmUploadSchema } from '../schemas/upload.schema.js';
import { generatePresignedUrl, confirmUpload } from '../services/upload.service.js';
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

  // Confirm a direct-to-R2 upload completed. Mobile should call this right
  // after the PUT succeeds; harmless (idempotent) if called more than once.
  app.post('/confirm', { preHandler: authenticate }, async (request, reply) => {
    const body = confirmUploadSchema.parse(request.body);
    try {
      await confirmUpload(request.user!.userId, body.key);
      return sendSuccess(reply, { confirmed: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to confirm upload';
      return sendError(reply, message, 404);
    }
  });
}
