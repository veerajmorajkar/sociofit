import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import { verifyAccessToken } from '../utils/jwt.js';
import { sendError } from '../utils/response.js';
import { db } from '../config/database.js';
import { users } from '../db/schema.js';

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      userId: string;
      accountType: string;
      tokenVersion: number;
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

    const [user] = await db
      .select({ isActive: users.isActive, tokenVersion: users.tokenVersion })
      .from(users)
      .where(eq(users.id, payload.userId))
      .limit(1);

    if (!user?.isActive) {
      return sendError(reply, 'Account is deactivated', 403);
    }

    // Session invalidation: a password reset/change, email/phone change, or
    // "log out all devices" bumps tokenVersion, which immediately kills every
    // access token issued before that point — not just at their 15-min expiry.
    if ((user.tokenVersion ?? 0) !== payload.tokenVersion) {
      return sendError(reply, 'Session expired. Please sign in again.', 401);
    }

    request.user = payload;
  } catch {
    return sendError(reply, 'Invalid or expired access token', 401);
  }
}
