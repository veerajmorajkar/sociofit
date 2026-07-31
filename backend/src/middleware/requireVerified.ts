import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import { db } from '../config/database.js';
import { users } from '../db/schema.js';
import { sendError } from '../utils/response.js';

export const EMAIL_VERIFICATION_REQUIRED = 'EMAIL_VERIFICATION_REQUIRED';

/**
 * Blocks mutating social actions until email/password accounts verify their
 * inbox. OAuth accounts are marked verified at signup/complete, so they pass.
 * Existing grandfathered users already have isVerified=true.
 */
export async function requireEmailVerified(request: FastifyRequest, reply: FastifyReply) {
  const userId = request.user?.userId;
  if (!userId) {
    return sendError(reply, 'Unauthorized', 401);
  }

  const [user] = await db
    .select({
      isVerified: users.isVerified,
      authProvider: users.authProvider,
      email: users.email,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    return sendError(reply, 'Unauthorized', 401);
  }

  if (user.isVerified) return;

  // Email/password signups must verify. OAuth should already be verified;
  // if somehow not, still block until fixed.
  return sendError(
    reply,
    'Verify your email before continuing. Check your inbox for a code, or resend from the verify screen.',
    403,
    EMAIL_VERIFICATION_REQUIRED,
  );
}
