import { OAuth2Client } from 'google-auth-library';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { eq, or } from 'drizzle-orm';
import crypto from 'node:crypto';
import { db } from '../config/database.js';
import { users, accountLinkTokens } from '../db/schema.js';
import { ensureClubAnnouncementChannel } from './messaging-club.service.js';
import { env } from '../config/env.js';
import { issueSession, type RequestMeta } from './session.service.js';
import { logAuthEvent } from './audit-log.service.js';
import { comparePassword } from '../utils/hash.js';
import { toOwnerUserProfile } from '../types/user-dto.js';
import { maskEmail } from './otp.service.js';

const googleClient = new OAuth2Client();
const appleJwks = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));

const LINK_TOKEN_TTL_MS = 15 * 60 * 1000; // short-lived — must be confirmed promptly

export interface OAuthProfile {
  provider: 'google' | 'apple';
  providerId: string;
  email: string | null;
  displayName: string;
}

export async function verifyGoogleIdToken(idToken: string): Promise<OAuthProfile> {
  const audiences = [
    env.GOOGLE_OAUTH_IOS_CLIENT_ID,
    env.GOOGLE_OAUTH_ANDROID_CLIENT_ID,
    env.GOOGLE_OAUTH_WEB_CLIENT_ID,
  ].filter(Boolean) as string[];

  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: audiences.length > 0 ? audiences : undefined,
  });

  const payload = ticket.getPayload();
  if (!payload?.sub) {
    throw new Error('Invalid Google token');
  }

  return {
    provider: 'google',
    providerId: payload.sub,
    // Only trust the email if Google says it's actually verified.
    email: payload.email_verified ? (payload.email ?? null) : null,
    displayName: payload.name ?? payload.email?.split('@')[0] ?? 'Athlete',
  };
}

export async function verifyAppleIdentityToken(identityToken: string): Promise<OAuthProfile> {
  const audiences = [env.APPLE_CLIENT_ID, env.APPLE_BUNDLE_ID].filter(Boolean) as string[];

  const { payload } = await jwtVerify(identityToken, appleJwks, {
    issuer: 'https://appleid.apple.com',
    audience: audiences.length > 0 ? audiences : undefined,
  });

  const sub = payload.sub;
  if (!sub) throw new Error('Invalid Apple token');

  // Apple's `email_verified` claim can be a boolean or the string "true".
  const emailVerified = payload.email_verified === true || payload.email_verified === 'true';
  const email = emailVerified && typeof payload.email === 'string' ? payload.email : null;

  return {
    provider: 'apple',
    providerId: sub,
    email,
    displayName: email?.split('@')[0] ?? 'Athlete',
  };
}

function slugifyUsername(base: string): string {
  const cleaned = base
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 40);
  return cleaned.length >= 3 ? cleaned : `user_${crypto.randomBytes(3).toString('hex')}`;
}

async function uniqueUsername(base: string): Promise<string> {
  let candidate = slugifyUsername(base);
  for (let i = 0; i < 8; i++) {
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, candidate))
      .limit(1);
    if (!existing) return candidate;
    candidate = `${slugifyUsername(base).slice(0, 36)}_${crypto.randomBytes(2).toString('hex')}`;
  }
  return `user_${crypto.randomBytes(4).toString('hex')}`;
}

async function issueTokens(
  user: { id: string; accountType: string; tokenVersion: number | null },
  meta: RequestMeta = {},
) {
  return issueSession(user, meta);
}

export async function authenticateOAuthUser(params: {
  profile: OAuthProfile;
  mode: 'login' | 'signup';
  accountType?: 'personal' | 'club';
  fullName?: { givenName?: string; familyName?: string };
  meta?: RequestMeta;
}) {
  const { profile, mode, accountType = 'personal', fullName, meta = {} } = params;

  const idColumn = profile.provider === 'google' ? users.googleId : users.appleId;

  const [byProvider] = await db
    .select()
    .from(users)
    .where(eq(idColumn, profile.providerId))
    .limit(1);
  if (byProvider) {
    if (!byProvider.isActive) throw new Error('Account is deactivated');

    const tokens = await issueTokens(byProvider, meta);
    const needsProfile = !byProvider.activities?.length || byProvider.activities.length < 3;

    return {
      user: toOwnerUserProfile(byProvider),
      ...tokens,
      needsProfile,
      needsLinkConfirmation: false as const,
    };
  }

  if (profile.email) {
    const [byEmail] = await db.select().from(users).where(eq(users.email, profile.email)).limit(1);

    // Only a *verified* local account is treated as a takeover risk worth
    // gating behind confirmation. An email match against an unverified
    // account is ignored entirely — surfacing it (even as "please confirm")
    // would let an attacker probe for the existence of a real account by
    // squatting the address first, and unverified rows aren't a trustworthy
    // signal that the OAuth user actually owns that mailbox's other account.
    if (byEmail && byEmail.passwordHash && byEmail.authProvider === 'email' && byEmail.isVerified) {
      const linkToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(linkToken).digest('hex');

      await db.insert(accountLinkTokens).values({
        existingUserId: byEmail.id,
        provider: profile.provider,
        providerId: profile.providerId,
        oauthEmail: profile.email,
        tokenHash,
        expiresAt: new Date(Date.now() + LINK_TOKEN_TTL_MS),
      });

      await logAuthEvent({
        userId: byEmail.id,
        eventType: 'account_link_requested',
        method: profile.provider,
        ip: meta.ip,
        userAgent: meta.userAgent,
        metadata: { provider: profile.provider },
      });

      return {
        needsLinkConfirmation: true as const,
        linkToken,
        maskedEmail: maskEmail(profile.email),
        provider: profile.provider,
      };
    }
  }

  if (mode === 'login') {
    throw new Error('No account found. Create an account first.');
  }

  const displayName =
    fullName?.givenName || fullName?.familyName
      ? [fullName.givenName, fullName.familyName].filter(Boolean).join(' ').trim()
      : profile.displayName;

  const username = await uniqueUsername(profile.email ?? displayName);

  const insertValues: typeof users.$inferInsert = {
    email: profile.email,
    accountType,
    displayName: displayName.slice(0, 100),
    username,
    authProvider: profile.provider,
    activities: [],
    ...(profile.provider === 'google'
      ? { googleId: profile.providerId }
      : { appleId: profile.providerId }),
  };

  const [newUser] = await db.insert(users).values(insertValues).returning();

  if (!newUser) throw new Error('Failed to create user');

  if (newUser.accountType === 'club') {
    await ensureClubAnnouncementChannel(newUser.id);
  }

  const tokens = await issueTokens(newUser, meta);

  return {
    user: toOwnerUserProfile(newUser),
    ...tokens,
    needsProfile: true,
    needsLinkConfirmation: false as const,
  };
}

/**
 * Second step of the OAuth-account-takeover fix: the user has been shown
 * "an account with this email already exists — link it?" and must now prove
 * ownership of that EXISTING account with its current password before the
 * OAuth identity is attached to it.
 */
export async function confirmAccountLink(params: {
  linkToken: string;
  password: string;
  meta?: RequestMeta;
}) {
  const { linkToken, password, meta = {} } = params;
  const tokenHash = crypto.createHash('sha256').update(linkToken).digest('hex');

  const [record] = await db
    .select()
    .from(accountLinkTokens)
    .where(eq(accountLinkTokens.tokenHash, tokenHash))
    .limit(1);

  if (!record || record.consumedAt || record.expiresAt < new Date()) {
    throw new Error('Link request expired — please try signing in again');
  }

  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.id, record.existingUserId))
    .limit(1);

  if (!existing || !existing.passwordHash) {
    throw new Error('Account not found');
  }

  const validPassword = await comparePassword(password, existing.passwordHash);
  if (!validPassword) {
    throw new Error('Incorrect password');
  }

  const providerColumn = record.provider === 'google' ? 'googleId' : 'appleId';
  const [linked] = await db
    .update(users)
    .set({
      [providerColumn]: record.providerId,
      updatedAt: new Date(),
    })
    .where(eq(users.id, existing.id))
    .returning();

  if (!linked) throw new Error('Failed to link account');

  await db
    .update(accountLinkTokens)
    .set({ consumedAt: new Date() })
    .where(eq(accountLinkTokens.id, record.id));

  await logAuthEvent({
    userId: existing.id,
    eventType: 'account_linked',
    method: record.provider,
    ip: meta.ip,
    userAgent: meta.userAgent,
    metadata: { provider: record.provider, providerId: record.providerId },
  });

  const tokens = await issueTokens(linked, meta);

  return {
    user: toOwnerUserProfile(linked),
    ...tokens,
    needsProfile: !linked.activities?.length || linked.activities.length < 3,
  };
}

export async function completeOAuthProfile(params: {
  userId: string;
  displayName?: string;
  username?: string;
  accountType?: 'personal' | 'club';
  birthdate: string;
  activities: string[];
}) {
  const [user] = await db.select().from(users).where(eq(users.id, params.userId)).limit(1);
  if (!user || !user.isActive) throw new Error('User not found');

  if (params.username && params.username !== user.username) {
    const [taken] = await db
      .select({ id: users.id })
      .from(users)
      .where(or(eq(users.username, params.username)))
      .limit(1);
    if (taken && taken.id !== user.id) throw new Error('Username already taken');
  }

  const [updated] = await db
    .update(users)
    .set({
      displayName: params.displayName?.trim().slice(0, 100) ?? user.displayName,
      username: params.username ?? user.username,
      accountType: params.accountType ?? user.accountType,
      dateOfBirth: new Date(params.birthdate),
      activities: params.activities,
      isVerified: true,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id))
    .returning();

  if (!updated) throw new Error('Failed to update profile');

  if (params.accountType === 'club' && user.accountType !== 'club') {
    await ensureClubAnnouncementChannel(updated.id);
  }

  const tokens = await issueTokens(updated);

  return {
    user: toOwnerUserProfile(updated),
    ...tokens,
    needsProfile: false,
  };
}
