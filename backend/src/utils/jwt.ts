import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

interface AccessTokenPayload {
  userId: string;
  accountType: string;
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
  return jwt.sign({ userId }, env.JWT_REFRESH_SECRET, {
    expiresIn: expiresIn(env.JWT_REFRESH_EXPIRY),
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): { userId: string } {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as { userId: string };
}
