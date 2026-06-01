import type { FastifyInstance } from 'fastify';
import { eq, or } from 'drizzle-orm';
import crypto from 'node:crypto';
import { db } from '../config/database.js';
import { users, refreshTokens } from '../db/schema.js';
import { registerSchema, loginSchema, refreshTokenSchema } from '../schemas/auth.schema.js';
import { hashPassword, comparePassword } from '../utils/hash.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import { sendSuccess, sendError } from '../utils/response.js';

export async function authRoutes(app: FastifyInstance) {
  // ── Register ──
  app.post('/register', async (request, reply) => {
    const body = registerSchema.parse(request.body);

    // Check if user already exists
    const conditions = [];
    if (body.email) conditions.push(eq(users.email, body.email));
    if (body.phone) conditions.push(eq(users.phone, body.phone));
    conditions.push(eq(users.username, body.username));

    const existing = await db
      .select({ id: users.id, email: users.email, username: users.username })
      .from(users)
      .where(or(...conditions))
      .limit(1);

    if (existing.length > 0) {
      const match = existing[0]!;
      if (match.username === body.username) {
        return sendError(reply, 'Username already taken', 409);
      }
      return sendError(reply, 'Account with this email or phone already exists', 409);
    }

    // Create user
    const passwordHash = await hashPassword(body.password);

    const [newUser] = await db
      .insert(users)
      .values({
        email: body.email,
        phone: body.phone,
        passwordHash,
        accountType: body.accountType,
        displayName: body.displayName,
        username: body.username,
        authProvider: 'email',
      })
      .returning({
        id: users.id,
        email: users.email,
        phone: users.phone,
        accountType: users.accountType,
        displayName: users.displayName,
        username: users.username,
      });

    if (!newUser) {
      return sendError(reply, 'Failed to create user', 500);
    }

    // Generate tokens
    const accessToken = signAccessToken({ userId: newUser.id, accountType: newUser.accountType });
    const refreshToken = signRefreshToken(newUser.id);

    // Store refresh token hash
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await db.insert(refreshTokens).values({
      userId: newUser.id,
      tokenHash,
      expiresAt,
    });

    return sendSuccess(
      reply,
      {
        user: newUser,
        accessToken,
        refreshToken,
      },
      201,
    );
  });

  // ── Login ──
  app.post('/login', async (request, reply) => {
    const body = loginSchema.parse(request.body);

    // Find user
    const conditions = [];
    if (body.email) conditions.push(eq(users.email, body.email));
    if (body.phone) conditions.push(eq(users.phone, body.phone));

    const [user] = await db
      .select()
      .from(users)
      .where(or(...conditions))
      .limit(1);

    if (!user || !user.passwordHash) {
      return sendError(reply, 'Invalid credentials', 401);
    }

    if (!user.isActive) {
      return sendError(reply, 'Account is deactivated', 403);
    }

    const validPassword = await comparePassword(body.password, user.passwordHash);
    if (!validPassword) {
      return sendError(reply, 'Invalid credentials', 401);
    }

    // Generate tokens
    const accessToken = signAccessToken({ userId: user.id, accountType: user.accountType });
    const refreshToken = signRefreshToken(user.id);

    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await db.insert(refreshTokens).values({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    return sendSuccess(reply, {
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        accountType: user.accountType,
        displayName: user.displayName,
        username: user.username,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
      },
      accessToken,
      refreshToken,
    });
  });

  // ── Refresh Token ──
  app.post('/refresh', async (request, reply) => {
    const body = refreshTokenSchema.parse(request.body);

    let payload: { userId: string };
    try {
      payload = verifyRefreshToken(body.refreshToken);
    } catch {
      return sendError(reply, 'Invalid or expired refresh token', 401);
    }

    // Verify token exists in DB
    const tokenHash = crypto.createHash('sha256').update(body.refreshToken).digest('hex');
    const [storedToken] = await db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, tokenHash))
      .limit(1);

    if (!storedToken || storedToken.expiresAt < new Date()) {
      return sendError(reply, 'Refresh token revoked or expired', 401);
    }

    // Get user
    const [user] = await db
      .select({ id: users.id, accountType: users.accountType, isActive: users.isActive })
      .from(users)
      .where(eq(users.id, payload.userId))
      .limit(1);

    if (!user || !user.isActive) {
      return sendError(reply, 'User not found or deactivated', 401);
    }

    // Rotate: delete old, issue new
    await db.delete(refreshTokens).where(eq(refreshTokens.tokenHash, tokenHash));

    const newAccessToken = signAccessToken({ userId: user.id, accountType: user.accountType });
    const newRefreshToken = signRefreshToken(user.id);

    const newTokenHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await db.insert(refreshTokens).values({
      userId: user.id,
      tokenHash: newTokenHash,
      expiresAt,
    });

    return sendSuccess(reply, {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  });

  // ── Logout ──
  app.post('/logout', async (request, reply) => {
    const body = refreshTokenSchema.parse(request.body);
    const tokenHash = crypto.createHash('sha256').update(body.refreshToken).digest('hex');

    await db.delete(refreshTokens).where(eq(refreshTokens.tokenHash, tokenHash));

    return sendSuccess(reply, { message: 'Logged out successfully' });
  });
}
