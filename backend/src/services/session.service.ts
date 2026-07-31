import crypto from 'node:crypto';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { db } from '../config/database.js';
import { refreshTokens, users } from '../db/schema.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import { logAuthEvent } from './audit-log.service.js';

const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface RequestMeta {
  ip?: string | null;
  userAgent?: string | null;
}

export interface SessionUser {
  id: string;
  accountType: string;
  tokenVersion: number | null;
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function deriveDeviceLabel(userAgent?: string | null): string | null {
  if (!userAgent) return null;
  if (/ipad/i.test(userAgent)) return 'iPad';
  if (/iphone/i.test(userAgent)) return 'iPhone';
  if (/android/i.test(userAgent)) return 'Android device';
  if (/okhttp|expo/i.test(userAgent)) return 'Mobile app';
  return userAgent.slice(0, 100);
}

/** Issues a fresh access + refresh token pair. `familyId` should be carried
 *  forward on rotation so reuse-detection can revoke the whole lineage. */
export async function issueSession(user: SessionUser, meta: RequestMeta = {}, familyId?: string) {
  const tokenVersion = user.tokenVersion ?? 0;
  const accessToken = signAccessToken({
    userId: user.id,
    accountType: user.accountType,
    tokenVersion,
  });
  const refreshToken = signRefreshToken(user.id);
  const tokenHash = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  await db.insert(refreshTokens).values({
    userId: user.id,
    tokenHash,
    familyId: familyId ?? crypto.randomUUID(),
    deviceLabel: deriveDeviceLabel(meta.userAgent),
    ip: meta.ip ?? null,
    userAgent: meta.userAgent ? meta.userAgent.slice(0, 500) : null,
    lastUsedAt: new Date(),
    expiresAt,
  });

  return { accessToken, refreshToken };
}

export class RefreshTokenReuseError extends Error {}

/**
 * Validates and rotates a refresh token. Rotated/revoked tokens are kept
 * (not deleted) so a replay of one is recognisable as theft: if the presented
 * token is found but already revoked, the ENTIRE token family is revoked and
 * the caller must force full re-authentication.
 */
export async function rotateSession(presentedRefreshToken: string, meta: RequestMeta = {}) {
  let payload: { userId: string };
  try {
    payload = verifyRefreshToken(presentedRefreshToken);
  } catch {
    throw new Error('Invalid or expired refresh token');
  }

  const tokenHash = hashToken(presentedRefreshToken);
  const [stored] = await db
    .select()
    .from(refreshTokens)
    .where(eq(refreshTokens.tokenHash, tokenHash))
    .limit(1);

  if (!stored) {
    throw new Error('Refresh token revoked or expired');
  }

  if (stored.revokedAt) {
    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(refreshTokens.familyId, stored.familyId), isNull(refreshTokens.revokedAt)));

    // Treat this as a theft signal: also bump tokenVersion so any access
    // token already in flight from this lineage dies immediately, instead
    // of surviving up to its natural 15-minute expiry.
    await bumpTokenVersion(stored.userId);

    await logAuthEvent({
      userId: stored.userId,
      eventType: 'refresh_reuse_detected',
      ip: meta.ip,
      userAgent: meta.userAgent,
      metadata: { familyId: stored.familyId, tokenId: stored.id },
    });

    throw new RefreshTokenReuseError('Refresh token reuse detected — all sessions revoked');
  }

  if (stored.expiresAt < new Date()) {
    throw new Error('Refresh token revoked or expired');
  }

  const [user] = await db
    .select({
      id: users.id,
      accountType: users.accountType,
      isActive: users.isActive,
      tokenVersion: users.tokenVersion,
    })
    .from(users)
    .where(eq(users.id, payload.userId))
    .limit(1);

  if (!user || !user.isActive) {
    throw new Error('User not found or deactivated');
  }

  // Rotate: mark this token used/revoked BEFORE issuing the replacement so a
  // concurrent replay of the same token is treated as reuse, not a race.
  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date(), lastUsedAt: new Date() })
    .where(eq(refreshTokens.id, stored.id));

  const tokens = await issueSession(user, meta, stored.familyId);
  return { user, ...tokens };
}

export async function revokeSessionByRefreshToken(refreshToken: string): Promise<void> {
  const tokenHash = hashToken(refreshToken);
  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(and(eq(refreshTokens.tokenHash, tokenHash), isNull(refreshTokens.revokedAt)));
}

/** Revokes every active session and bumps tokenVersion so any access tokens
 *  already in flight die immediately too. */
export async function revokeAllSessions(userId: string): Promise<void> {
  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)));
  await bumpTokenVersion(userId);
}

export async function bumpTokenVersion(userId: string): Promise<void> {
  await db
    .update(users)
    .set({ tokenVersion: sql`${users.tokenVersion} + 1` })
    .where(eq(users.id, userId));
}

export interface SessionSummary {
  id: string;
  deviceLabel: string | null;
  ip: string | null;
  userAgent: string | null;
  lastUsedAt: Date | null;
  createdAt: Date;
  expiresAt: Date;
}

export async function listSessions(userId: string): Promise<SessionSummary[]> {
  const now = new Date();
  const rows = await db
    .select({
      id: refreshTokens.id,
      deviceLabel: refreshTokens.deviceLabel,
      ip: refreshTokens.ip,
      userAgent: refreshTokens.userAgent,
      lastUsedAt: refreshTokens.lastUsedAt,
      createdAt: refreshTokens.createdAt,
      expiresAt: refreshTokens.expiresAt,
    })
    .from(refreshTokens)
    .where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)));

  return rows
    .filter((r) => r.expiresAt > now)
    .sort(
      (a, b) =>
        (b.lastUsedAt?.getTime() ?? b.createdAt.getTime()) -
        (a.lastUsedAt?.getTime() ?? a.createdAt.getTime()),
    );
}

/** Revokes a single session; returns false if it doesn't exist or isn't owned by userId. */
export async function revokeSession(userId: string, sessionId: string): Promise<boolean> {
  const result = await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(refreshTokens.id, sessionId),
        eq(refreshTokens.userId, userId),
        isNull(refreshTokens.revokedAt),
      ),
    )
    .returning({ id: refreshTokens.id });
  return result.length > 0;
}
