import { OAuth2Client } from 'google-auth-library';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { eq, or } from 'drizzle-orm';
import crypto from 'node:crypto';
import { db } from '../config/database.js';
import { users, refreshTokens } from '../db/schema.js';
import { signAccessToken, signRefreshToken } from '../utils/jwt.js';
import { ensureClubAnnouncementChannel } from './messaging-club.service.js';
import { env } from '../config/env.js';

const googleClient = new OAuth2Client();
const appleJwks = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));

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
    email: payload.email ?? null,
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

  const email = typeof payload.email === 'string' ? payload.email : null;

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

async function issueTokens(userId: string, accountType: string) {
  const accessToken = signAccessToken({ userId, accountType });
  const refreshToken = signRefreshToken(userId);
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await db.insert(refreshTokens).values({ userId, tokenHash, expiresAt });

  return { accessToken, refreshToken };
}

function publicUser(user: {
  id: string;
  email: string | null;
  phone: string | null;
  accountType: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  bio: string | null;
}) {
  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    accountType: user.accountType,
    displayName: user.displayName,
    username: user.username,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
  };
}

export async function authenticateOAuthUser(params: {
  profile: OAuthProfile;
  mode: 'login' | 'signup';
  accountType?: 'personal' | 'club';
  fullName?: { givenName?: string; familyName?: string };
}) {
  const { profile, mode, accountType = 'personal', fullName } = params;

  const idColumn = profile.provider === 'google' ? users.googleId : users.appleId;

  const [byProvider] = await db
    .select()
    .from(users)
    .where(eq(idColumn, profile.providerId))
    .limit(1);
  if (byProvider) {
    if (!byProvider.isActive) throw new Error('Account is deactivated');

    const tokens = await issueTokens(byProvider.id, byProvider.accountType);
    const needsProfile = !byProvider.activities?.length || byProvider.activities.length < 3;

    return {
      user: publicUser(byProvider),
      ...tokens,
      needsProfile,
    };
  }

  if (profile.email) {
    const [byEmail] = await db.select().from(users).where(eq(users.email, profile.email)).limit(1);
    if (byEmail) {
      await db
        .update(users)
        .set({
          [profile.provider === 'google' ? 'googleId' : 'appleId']: profile.providerId,
          authProvider: profile.provider,
          updatedAt: new Date(),
        })
        .where(eq(users.id, byEmail.id));

      const tokens = await issueTokens(byEmail.id, byEmail.accountType);
      return {
        user: publicUser(byEmail),
        ...tokens,
        needsProfile: !byEmail.activities?.length || byEmail.activities.length < 3,
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

  const [newUser] = await db.insert(users).values(insertValues).returning({
    id: users.id,
    email: users.email,
    phone: users.phone,
    accountType: users.accountType,
    displayName: users.displayName,
    username: users.username,
    avatarUrl: users.avatarUrl,
    bio: users.bio,
  });

  if (!newUser) throw new Error('Failed to create user');

  if (newUser.accountType === 'club') {
    await ensureClubAnnouncementChannel(newUser.id);
  }

  const tokens = await issueTokens(newUser.id, newUser.accountType);

  return {
    user: publicUser(newUser),
    ...tokens,
    needsProfile: true,
  };
}

export async function completeOAuthProfile(params: {
  userId: string;
  username?: string;
  accountType?: 'personal' | 'club';
  birthdate?: string;
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
      username: params.username ?? user.username,
      accountType: params.accountType ?? user.accountType,
      dateOfBirth: params.birthdate ? new Date(params.birthdate) : user.dateOfBirth,
      activities: params.activities,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id))
    .returning({
      id: users.id,
      email: users.email,
      phone: users.phone,
      accountType: users.accountType,
      displayName: users.displayName,
      username: users.username,
      avatarUrl: users.avatarUrl,
      bio: users.bio,
    });

  if (!updated) throw new Error('Failed to update profile');

  if (params.accountType === 'club' && user.accountType !== 'club') {
    await ensureClubAnnouncementChannel(updated.id);
  }

  const tokens = await issueTokens(updated.id, updated.accountType);

  return {
    user: publicUser(updated),
    ...tokens,
    needsProfile: false,
  };
}
