import { describe, it, expect, beforeAll, afterAll } from 'vitest';

process.env.DATABASE_URL ??= 'postgresql://fitsocial:fitsocial@localhost:5432/fitsocial';
process.env.JWT_ACCESS_SECRET ??= 'test-access-secret-1234567890';
process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret-1234567890';

import { db, pool } from '../src/config/database.js';
import { users, otpVerifications, categories } from '../src/db/schema.js';
import { eq } from 'drizzle-orm';
import { buildApp } from '../src/app.js';
import type { FastifyInstance } from 'fastify';
import { issueOtp } from '../src/services/otp.service.js';
import { issueSession } from '../src/services/session.service.js';
import { hashPassword } from '../src/utils/hash.js';

const stamp = Date.now();
const email = `otp_signup_${stamp}@example.com`;
const password = 'CorrectHorse123!';
const username = `otp_user_${stamp}`;

let app: FastifyInstance;
let userId: string;

describe('Email signup OTP', () => {
  beforeAll(async () => {
    app = await buildApp();
  }, 30_000);

  afterAll(async () => {
    if (userId) {
      await db.delete(users).where(eq(users.id, userId));
    }
    await app.close();
    await pool.end();
  });

  it('register returns needsEmailVerification and does not issue tokens', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email,
        password,
        accountType: 'personal',
        displayName: 'OTP Tester',
        username,
        birthdate: new Date('2000-01-15T00:00:00.000Z').toISOString(),
        activities: ['running', 'yoga', 'gym'],
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body) as {
      success: boolean;
      data: {
        needsEmailVerification?: boolean;
        email?: string;
        accessToken?: string;
      };
    };
    expect(body.success).toBe(true);
    expect(body.data.needsEmailVerification).toBe(true);
    expect(body.data.email).toBe(email);
    expect(body.data.accessToken).toBeUndefined();

    const [row] = await db
      .select({ id: users.id, isVerified: users.isVerified })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    expect(row?.isVerified).toBe(false);
    userId = row!.id;
  });

  it('rejects wrong code and accepts the correct one', async () => {
    const wrong = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/verify-email',
      payload: { email, code: '000000' },
    });
    expect(wrong.statusCode).toBe(400);

    const code = await issueOtp({ userId, purpose: 'signup', email });

    const ok = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/verify-email',
      payload: { email, code },
    });
    expect(ok.statusCode).toBe(200);
    const body = JSON.parse(ok.body) as {
      success: boolean;
      data: { accessToken: string; refreshToken: string; user: { id: string } };
    };
    expect(body.success).toBe(true);
    expect(body.data.accessToken).toBeTruthy();
    expect(body.data.user.id).toBe(userId);

    const [row] = await db
      .select({ isVerified: users.isVerified })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    expect(row?.isVerified).toBe(true);

    const leftover = await db
      .select()
      .from(otpVerifications)
      .where(eq(otpVerifications.userId, userId));
    expect(leftover).toHaveLength(0);
  });

  it('blocks event creation when isVerified is false', async () => {
    const passwordHash = await hashPassword(password);
    const [unverified] = await db
      .insert(users)
      .values({
        email: `otp_gate_${stamp}@example.com`,
        passwordHash,
        accountType: 'personal',
        displayName: 'Unverified Gate',
        username: `otp_gate_${stamp}`,
        authProvider: 'email',
        isVerified: false,
        tokenVersion: 0,
      })
      .returning({
        id: users.id,
        accountType: users.accountType,
        tokenVersion: users.tokenVersion,
      });

    const { accessToken } = await issueSession({
      id: unverified!.id,
      accountType: unverified!.accountType,
      tokenVersion: unverified!.tokenVersion ?? 0,
    });

    const [category] = await db.select({ id: categories.id }).from(categories).limit(1);
    let categoryId = category?.id;
    if (!categoryId) {
      const [created] = await db
        .insert(categories)
        .values({ name: `OTP Cat ${stamp}`, slug: `otp-cat-${stamp}` })
        .returning({ id: categories.id });
      categoryId = created!.id;
    }

    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/events',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {
        title: 'Should Fail',
        categoryId,
        startTime: new Date(Date.now() + 3600000).toISOString(),
        endTime: new Date(Date.now() + 7200000).toISOString(),
        locationName: 'Test',
        latitude: 19.07,
        longitude: 72.87,
      },
    });

    expect(createRes.statusCode).toBe(403);
    const errBody = JSON.parse(createRes.body) as { code?: string };
    expect(errBody.code).toBe('EMAIL_VERIFICATION_REQUIRED');

    await db.delete(users).where(eq(users.id, unverified!.id));
  });
});
