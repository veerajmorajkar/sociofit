import crypto from 'node:crypto';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '../config/database.js';
import { otpVerifications } from '../db/schema.js';
import { hashPassword, comparePassword } from '../utils/hash.js';

export const OTP_TTL_MS = 10 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;

export type OtpPurpose = 'signup' | 'login' | 'password_reset';

export function generateOtpCode(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return '***';
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${'*'.repeat(Math.max(local.length - visible.length, 3))}@${domain}`;
}

/**
 * Creates a fresh OTP for the given user/purpose. Any previous unused OTP for
 * the same user+purpose is deleted first so only one live code exists.
 */
export async function issueOtp(params: {
  userId: string;
  purpose: OtpPurpose;
  email?: string | null;
  phone?: string | null;
}): Promise<string> {
  const code = generateOtpCode();
  const codeHash = await hashPassword(code);

  await db
    .delete(otpVerifications)
    .where(
      and(eq(otpVerifications.userId, params.userId), eq(otpVerifications.purpose, params.purpose)),
    );

  await db.insert(otpVerifications).values({
    userId: params.userId,
    purpose: params.purpose,
    email: params.email ?? null,
    phone: params.phone ?? null,
    codeHash,
    expiresAt: new Date(Date.now() + OTP_TTL_MS),
  });

  return code;
}

export class OtpError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OtpError';
  }
}

/**
 * Validates a submitted OTP. On success the matching row is deleted.
 * Throws OtpError with a safe user-facing message on failure.
 */
export async function consumeOtp(params: {
  userId: string;
  purpose: OtpPurpose;
  code: string;
}): Promise<void> {
  const [record] = await db
    .select()
    .from(otpVerifications)
    .where(
      and(eq(otpVerifications.userId, params.userId), eq(otpVerifications.purpose, params.purpose)),
    )
    .limit(1);

  if (!record || record.expiresAt < new Date()) {
    throw new OtpError('Code expired — request a new one');
  }
  if (record.attempts >= OTP_MAX_ATTEMPTS) {
    throw new OtpError('Too many attempts — request a new code');
  }

  const valid = await comparePassword(params.code.trim(), record.codeHash);
  if (!valid) {
    await db
      .update(otpVerifications)
      .set({ attempts: sql`${otpVerifications.attempts} + 1` })
      .where(eq(otpVerifications.id, record.id));
    throw new OtpError('Incorrect code');
  }

  await db.delete(otpVerifications).where(eq(otpVerifications.id, record.id));
}
