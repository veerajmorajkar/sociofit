import type { FastifyInstance, FastifyRequest } from 'fastify';
import { eq, or } from 'drizzle-orm';
import crypto from 'node:crypto';
import { db } from '../config/database.js';
import { env } from '../config/env.js';
import { users, passwordResetTokens } from '../db/schema.js';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  googleAuthSchema,
  appleAuthSchema,
  oauthCompleteSchema,
  confirmLinkSchema,
  verifyEmailSchema,
  resendVerificationSchema,
} from '../schemas/auth.schema.js';
import { authenticate } from '../middleware/auth.js';
import {
  verifyGoogleIdToken,
  verifyAppleIdentityToken,
  authenticateOAuthUser,
  completeOAuthProfile,
  confirmAccountLink,
} from '../services/oauth.service.js';
import { hashPassword, comparePassword } from '../utils/hash.js';
import {
  issueSession,
  rotateSession,
  revokeSessionByRefreshToken,
  revokeAllSessions,
  listSessions,
  revokeSession,
  RefreshTokenReuseError,
  type RequestMeta,
} from '../services/session.service.js';
import { logAuthEvent } from '../services/audit-log.service.js';
import { toOwnerUserProfile } from '../types/user-dto.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { ensureClubAnnouncementChannel } from '../services/messaging-club.service.js';
import { sendPasswordResetEmail, sendSignupVerificationEmail } from '../services/email.service.js';
import { issueOtp, consumeOtp, maskEmail, OtpError } from '../services/otp.service.js';

const GENERIC_INVALID_CREDENTIALS = 'Invalid credentials';

function requestMeta(request: FastifyRequest): RequestMeta {
  return {
    ip: request.ip,
    userAgent: request.headers['user-agent'] ?? null,
  };
}

async function issueAuthTokens(
  user: {
    id: string;
    accountType: string;
    email: string | null;
    phone: string | null;
    displayName: string;
    username: string;
    avatarUrl?: string | null;
    bio?: string | null;
    tokenVersion?: number | null;
  },
  meta: RequestMeta,
) {
  const tokens = await issueSession(
    { id: user.id, accountType: user.accountType, tokenVersion: user.tokenVersion ?? 0 },
    meta,
  );

  return {
    user: toOwnerUserProfile(user),
    ...tokens,
  };
}

async function createPasswordResetToken(userId: string): Promise<string> {
  await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, userId));

  const token = crypto.randomBytes(24).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

  await db.insert(passwordResetTokens).values({
    userId,
    tokenHash,
    expiresAt,
  });

  return token;
}

// Dummy hash so login timing doesn't reveal whether an account exists —
// bcrypt.compare against a real hash and against this constant do the same work.
const DUMMY_PASSWORD_HASH = '$2b$12$CwTycUXWue0Thq9StjUM0uJ8i6ZlbFN6/dK3wLzTB1SPcAqTOTZKu';

export function authRoutes(app: FastifyInstance) {
  // ── Register ──
  // Creates an unverified account and emails a 6-digit OTP. No session tokens
  // until POST /auth/verify-email succeeds.
  app.post('/register', async (request, reply) => {
    const body = registerSchema.parse(request.body);

    const existing = await db
      .select({ id: users.id, email: users.email, username: users.username })
      .from(users)
      .where(or(eq(users.email, body.email), eq(users.username, body.username)))
      .limit(1);

    if (existing.length > 0) {
      const match = existing[0]!;
      if (match.username === body.username) {
        return sendError(reply, 'Username already taken', 409);
      }
      return sendError(reply, 'Account with this email already exists', 409);
    }

    const passwordHash = await hashPassword(body.password);

    const [newUser] = await db
      .insert(users)
      .values({
        email: body.email,
        phone: null,
        passwordHash,
        accountType: body.accountType,
        displayName: body.displayName,
        username: body.username,
        authProvider: 'email',
        dateOfBirth: new Date(body.birthdate),
        activities: body.activities,
        isVerified: false,
      })
      .returning({
        id: users.id,
        email: users.email,
        accountType: users.accountType,
      });

    if (!newUser || !newUser.email) {
      return sendError(reply, 'Failed to create user', 500);
    }

    if (newUser.accountType === 'club') {
      await ensureClubAnnouncementChannel(newUser.id);
    }

    const code = await issueOtp({
      userId: newUser.id,
      purpose: 'signup',
      email: newUser.email,
    });

    try {
      await sendSignupVerificationEmail(newUser.email, code);
    } catch (err) {
      console.error('[auth] Failed to send signup verification email:', err);
      if (env.NODE_ENV === 'production') {
        return sendError(reply, 'Could not send verification code. Try again later.', 502);
      }
    }

    return sendSuccess(
      reply,
      {
        needsEmailVerification: true as const,
        email: newUser.email,
        maskedEmail: maskEmail(newUser.email),
      },
      201,
    );
  });

  // ── Verify email (completes signup) ──
  app.post('/verify-email', async (request, reply) => {
    const body = verifyEmailSchema.parse(request.body);

    const [user] = await db.select().from(users).where(eq(users.email, body.email)).limit(1);

    if (!user || !user.isActive) {
      return sendError(reply, 'Invalid or expired code', 400);
    }

    if (user.isVerified) {
      const tokens = await issueAuthTokens(user, requestMeta(request));
      return sendSuccess(reply, tokens);
    }

    try {
      await consumeOtp({ userId: user.id, purpose: 'signup', code: body.code });
    } catch (err) {
      const message = err instanceof OtpError ? err.message : 'Invalid or expired code';
      return sendError(reply, message, 400);
    }

    const [verified] = await db
      .update(users)
      .set({ isVerified: true, updatedAt: new Date() })
      .where(eq(users.id, user.id))
      .returning();

    if (!verified) {
      return sendError(reply, 'Could not verify email', 500);
    }

    await logAuthEvent({
      userId: user.id,
      eventType: 'email_verified',
      method: 'otp',
      ...requestMeta(request),
    });

    const tokens = await issueAuthTokens(verified, requestMeta(request));
    return sendSuccess(reply, tokens);
  });

  // ── Resend signup verification code ──
  app.post('/resend-verification', async (request, reply) => {
    const body = resendVerificationSchema.parse(request.body);
    const generic = {
      sent: true as const,
      message: 'If that email needs verification, a new code has been sent.',
    };

    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        isVerified: users.isVerified,
        isActive: users.isActive,
        authProvider: users.authProvider,
      })
      .from(users)
      .where(eq(users.email, body.email))
      .limit(1);

    // Always the same response — do not leak whether the account exists.
    if (
      !user ||
      !user.isActive ||
      !user.email ||
      user.isVerified ||
      user.authProvider !== 'email'
    ) {
      return sendSuccess(reply, generic);
    }

    const code = await issueOtp({
      userId: user.id,
      purpose: 'signup',
      email: user.email,
    });

    try {
      await sendSignupVerificationEmail(user.email, code);
    } catch (err) {
      console.error('[auth] Failed to resend verification email:', err);
      if (env.NODE_ENV === 'production') {
        return sendError(reply, 'Could not send verification code. Try again later.', 502);
      }
    }

    return sendSuccess(reply, generic);
  });

  // ── Login ──
  app.post('/login', async (request, reply) => {
    const body = loginSchema.parse(request.body);

    const [user] = await db.select().from(users).where(eq(users.email, body.email)).limit(1);

    // Account-enumeration hardening: "no such account", "wrong password", and
    // "deactivated" all fall through to the same generic 401 with equivalent
    // work done (constant-time-ish bcrypt compare either way).
    const validPassword = await comparePassword(
      body.password,
      user?.passwordHash ?? DUMMY_PASSWORD_HASH,
    );

    if (!user || !user.passwordHash || !user.isActive || !validPassword) {
      return sendError(reply, GENERIC_INVALID_CREDENTIALS, 401);
    }

    if (!user.isVerified) {
      return sendSuccess(reply, {
        needsEmailVerification: true as const,
        email: user.email!,
        maskedEmail: maskEmail(user.email!),
      });
    }

    const tokens = await issueAuthTokens(user, requestMeta(request));
    return sendSuccess(reply, tokens);
  });

  // ── Refresh Token ──
  app.post('/refresh', async (request, reply) => {
    const body = refreshTokenSchema.parse(request.body);

    try {
      const { user, accessToken, refreshToken } = await rotateSession(
        body.refreshToken,
        requestMeta(request),
      );
      return sendSuccess(reply, { accessToken, refreshToken, accountType: user.accountType });
    } catch (err) {
      if (err instanceof RefreshTokenReuseError) {
        return sendError(reply, 'Session revoked — please sign in again', 401);
      }
      const message = err instanceof Error ? err.message : 'Invalid or expired refresh token';
      return sendError(reply, message, 401);
    }
  });

  // ── Logout ──
  app.post('/logout', async (request, reply) => {
    const body = refreshTokenSchema.parse(request.body);
    await revokeSessionByRefreshToken(body.refreshToken);
    return sendSuccess(reply, { message: 'Logged out successfully' });
  });

  // ── Logout of all devices ──
  app.post('/logout-all', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    await revokeAllSessions(userId);
    await logAuthEvent({
      userId,
      eventType: 'logout_all',
      ...requestMeta(request),
    });
    return sendSuccess(reply, { message: 'Logged out of all devices' });
  });

  // ── List active sessions ──
  app.get('/sessions', { preHandler: authenticate }, async (request, reply) => {
    const sessions = await listSessions(request.user!.userId);
    return sendSuccess(reply, sessions);
  });

  // ── Revoke a single session ──
  app.delete('/sessions/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const revoked = await revokeSession(request.user!.userId, id);
    if (!revoked) return sendError(reply, 'Session not found', 404);
    await logAuthEvent({
      userId: request.user!.userId,
      eventType: 'session_revoked',
      metadata: { sessionId: id },
      ...requestMeta(request),
    });
    return sendSuccess(reply, { revoked: true });
  });

  // ── Forgot Password ──
  app.post('/forgot-password', async (request, reply) => {
    const body = forgotPasswordSchema.parse(request.body);

    const [user] = await db
      .select({ id: users.id, isActive: users.isActive })
      .from(users)
      .where(eq(users.email, body.email))
      .limit(1);

    // Always the same response regardless of whether the account exists —
    // this is the load-bearing anti-enumeration control for this endpoint.
    const genericResponse = {
      ok: true,
      message: 'If an account exists, a reset link has been sent.',
    };

    if (!user || !user.isActive) {
      return sendSuccess(reply, genericResponse);
    }

    const token = await createPasswordResetToken(user.id);
    const resetLink = `${env.PASSWORD_RESET_DEEP_LINK}?token=${encodeURIComponent(token)}`;

    try {
      await sendPasswordResetEmail(body.email, resetLink);
    } catch (err) {
      console.error('[auth] Password reset email failed:', err);
      if (env.NODE_ENV === 'production') {
        return sendError(reply, 'Could not send reset email. Try again later.', 503);
      }
    }

    if (env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.log(`[auth:dev] Password reset token for ${body.email}: ${token}`);
    }

    return sendSuccess(reply, genericResponse);
  });

  // ── Google Sign-In ──
  app.post('/google', async (request, reply) => {
    try {
      const body = googleAuthSchema.parse(request.body);
      const profile = await verifyGoogleIdToken(body.idToken);
      const result = await authenticateOAuthUser({
        profile,
        mode: body.mode,
        accountType: body.accountType,
        meta: requestMeta(request),
      });
      return sendSuccess(reply, result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Google authentication failed';
      return sendError(reply, message, 401);
    }
  });

  // ── Apple Sign-In ──
  app.post('/apple', async (request, reply) => {
    try {
      const body = appleAuthSchema.parse(request.body);
      const profile = await verifyAppleIdentityToken(body.identityToken);
      const result = await authenticateOAuthUser({
        profile,
        mode: body.mode,
        accountType: body.accountType,
        fullName: body.fullName,
        meta: requestMeta(request),
      });
      return sendSuccess(reply, result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Apple authentication failed';
      return sendError(reply, message, 401);
    }
  });

  // ── Confirm OAuth ↔ existing account link ──
  // Called after the client shows "An account with this email already exists —
  // link it?" and the user proves ownership of the EXISTING account via its
  // current password (OTP-to-verified-email path can be added the same way).
  app.post('/oauth/confirm-link', async (request, reply) => {
    try {
      const body = confirmLinkSchema.parse(request.body);
      const result = await confirmAccountLink({
        linkToken: body.linkToken,
        password: body.password,
        meta: requestMeta(request),
      });
      return sendSuccess(reply, result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not link account';
      return sendError(reply, message, 401);
    }
  });

  // ── Complete OAuth profile (activities, username, birthdate) ──
  app.post('/oauth/complete', { preHandler: authenticate }, async (request, reply) => {
    try {
      const body = oauthCompleteSchema.parse(request.body);
      const userId = request.user?.userId;
      if (!userId) return sendError(reply, 'Unauthorized', 401);

      const result = await completeOAuthProfile({
        userId,
        displayName: body.displayName,
        username: body.username,
        accountType: body.accountType,
        birthdate: body.birthdate,
        activities: body.activities,
      });
      return sendSuccess(reply, result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not complete profile';
      const status = message.includes('Username') ? 409 : 400;
      return sendError(reply, message, status);
    }
  });

  // ── Reset Password ──
  app.post('/reset-password', async (request, reply) => {
    const body = resetPasswordSchema.parse(request.body);
    const tokenHash = crypto.createHash('sha256').update(body.token).digest('hex');

    const [record] = await db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.tokenHash, tokenHash))
      .limit(1);

    if (!record || record.expiresAt < new Date()) {
      return sendError(reply, 'Invalid or expired reset token', 400);
    }

    const passwordHash = await hashPassword(body.password);
    await db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, record.userId));

    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.id, record.id));

    // Session invalidation: kill every existing refresh token AND bump
    // tokenVersion so access tokens issued before the reset die immediately
    // on their next authenticated call, not just at their natural expiry.
    await revokeAllSessions(record.userId);

    await logAuthEvent({
      userId: record.userId,
      eventType: 'password_reset',
      ...requestMeta(request),
    });

    return sendSuccess(reply, { ok: true });
  });
}
