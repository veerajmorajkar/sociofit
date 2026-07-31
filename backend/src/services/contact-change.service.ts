import crypto from 'node:crypto';
import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '../config/database.js';
import { users, contactChangeRequests } from '../db/schema.js';
import { env } from '../config/env.js';
import { hashPassword, comparePassword } from '../utils/hash.js';
import { normalizePhone } from '../utils/phone.js';
import { sendContactChangeCodeEmail } from './email.service.js';
import { bumpTokenVersion } from './session.service.js';
import { logAuthEvent } from './audit-log.service.js';

/**
 * Email/phone changes on an existing account MUST go through OTP verification
 * of the NEW address — never a direct write-through via PATCH /users/me.
 * Signup email verification uses otp.service + /auth/verify-email instead.
 */

const CODE_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

type ContactField = 'email' | 'phone';

function generateCode(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
}

async function assertNotTaken(field: ContactField, value: string, userId: string) {
  const column = field === 'email' ? users.email : users.phone;
  const [conflict] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(column, value)))
    .limit(1);
  if (conflict && conflict.id !== userId) {
    throw new Error(`That ${field} is already in use`);
  }
}

async function createChangeRequest(userId: string, field: ContactField, newValue: string) {
  await assertNotTaken(field, newValue, userId);

  const code = generateCode();
  const codeHash = await hashPassword(code);

  await db
    .delete(contactChangeRequests)
    .where(and(eq(contactChangeRequests.userId, userId), eq(contactChangeRequests.field, field)));

  await db.insert(contactChangeRequests).values({
    userId,
    field,
    newValue,
    codeHash,
    expiresAt: new Date(Date.now() + CODE_TTL_MS),
  });

  return code;
}

export async function requestEmailChange(
  userId: string,
  newEmail: string,
): Promise<{ sent: true }> {
  const code = await createChangeRequest(userId, 'email', newEmail);

  try {
    await sendContactChangeCodeEmail(newEmail, code);
  } catch (err) {
    console.error('[contact-change] Failed to send email OTP:', err);
    if (env.NODE_ENV === 'production')
      throw new Error('Could not send verification code. Try again later.');
  }

  if (env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.log(`[contact-change:dev] Email change code for ${newEmail}: ${code}`);
  }

  return { sent: true };
}

/**
 * NOTE: no SMS provider is wired into this backend yet. The OTP is generated
 * and stored identically to the email flow (so the confirm endpoint and rate
 * limiting are already production-shaped), but delivery is dev-log-only until
 * an SMS gateway (e.g. MSG91/Twilio) is integrated. Treat phone verification
 * as NOT production-ready until that's wired up — see Phase 1 summary.
 */
export async function requestPhoneChange(
  userId: string,
  rawPhone: string,
): Promise<{ sent: true }> {
  const phone = normalizePhone(rawPhone);
  const code = await createChangeRequest(userId, 'phone', phone);

  // eslint-disable-next-line no-console
  console.log(`[contact-change:dev] Phone change code for ${phone}: ${code}`);
  if (env.NODE_ENV === 'production') {
    console.warn(
      '[contact-change] No SMS provider configured — phone OTP was NOT delivered to the user.',
    );
  }

  return { sent: true };
}

async function confirmChange(
  userId: string,
  field: ContactField,
  code: string,
): Promise<{ value: string }> {
  const [record] = await db
    .select()
    .from(contactChangeRequests)
    .where(and(eq(contactChangeRequests.userId, userId), eq(contactChangeRequests.field, field)))
    .orderBy(desc(contactChangeRequests.createdAt))
    .limit(1);

  if (!record || record.consumedAt || record.expiresAt < new Date()) {
    throw new Error('Code expired — request a new one');
  }
  if (record.attempts >= MAX_ATTEMPTS) {
    throw new Error('Too many attempts — request a new code');
  }

  const valid = await comparePassword(code, record.codeHash);
  if (!valid) {
    await db
      .update(contactChangeRequests)
      .set({ attempts: sql`${contactChangeRequests.attempts} + 1` })
      .where(eq(contactChangeRequests.id, record.id));
    throw new Error('Incorrect code');
  }

  await assertNotTaken(field, record.newValue, userId);

  const column = field === 'email' ? { email: record.newValue } : { phone: record.newValue };
  await db
    .update(users)
    .set({ ...column, updatedAt: new Date() })
    .where(eq(users.id, userId));

  await db
    .update(contactChangeRequests)
    .set({ consumedAt: new Date() })
    .where(eq(contactChangeRequests.id, record.id));

  // Identity changed — force re-auth on every other device.
  await bumpTokenVersion(userId);
  await logAuthEvent({
    userId,
    eventType: field === 'email' ? 'email_changed' : 'phone_changed',
  });

  return { value: record.newValue };
}

export async function confirmEmailChange(userId: string, code: string) {
  const { value } = await confirmChange(userId, 'email', code);
  return { email: value };
}

export async function confirmPhoneChange(userId: string, code: string) {
  const { value } = await confirmChange(userId, 'phone', code);
  return { phone: value };
}
