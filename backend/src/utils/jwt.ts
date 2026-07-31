import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { env } from '../config/env.js';

interface AccessTokenPayload {
  userId: string;
  accountType: string;
  /** Must match the user's current `tokenVersion` row — bumped on password
   *  reset/change, email/phone change, and "log out all devices" so old
   *  access tokens die immediately instead of at their natural expiry. */
  tokenVersion: number;
}

// JWT expiresIn accepts seconds (number) or ms-compatible strings like "15m", "30d".
// We cast through `unknown` because the Zod-parsed env string isn't branded as `StringValue`.
function expiresIn(value: string): jwt.SignOptions['expiresIn'] {
  return value as unknown as jwt.SignOptions['expiresIn'];
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: expiresIn(env.JWT_ACCESS_EXPIRY),
  });
}

export function signRefreshToken(userId: string): string {
  // `jti` guarantees uniqueness even when two tokens for the same user are
  // issued within the same second (e.g. register immediately followed by a
  // refresh) — without it the JWT payload/iat/exp can be byte-identical,
  // colliding on the refresh_tokens.token_hash unique index.
  return jwt.sign({ userId, jti: crypto.randomUUID() }, env.JWT_REFRESH_SECRET, {
    expiresIn: expiresIn(env.JWT_REFRESH_EXPIRY),
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET, {
    algorithms: ['HS256'],
  }) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): { userId: string } {
  return jwt.verify(token, env.JWT_REFRESH_SECRET, {
    algorithms: ['HS256'],
  }) as { userId: string };
}
