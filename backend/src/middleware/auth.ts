import type { FastifyRequest, FastifyReply } from 'fastify';
import { verifyAccessToken } from '../utils/jwt.js';
import { sendError } from '../utils/response.js';

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      userId: string;
      accountType: string;
    };
  }
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return sendError(reply, 'Missing or invalid authorization header', 401);
  }

  const token = authHeader.slice(7);

  try {
    const payload = verifyAccessToken(token);
    request.user = payload;
  } catch {
    return sendError(reply, 'Invalid or expired access token', 401);
  }
}
