/**
 * Explicit response DTOs for user rows. Every route/service that returns
 * user data must build one of these — never spread a raw DB row into a
 * response, since the `users` table also carries password hashes, OAuth
 * provider ids, Strava tokens, and other fields that must never leave the
 * server.
 */

export interface PublicUserProfile {
  id: string;
  accountType: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  bio: string | null;
}

/** Only ever returned to the account owner (post-auth responses, GET /users/me). */
export interface OwnerUserProfile extends PublicUserProfile {
  email: string | null;
  phone: string | null;
}

interface SourceUserRow {
  id: string;
  accountType: string;
  displayName: string;
  username: string;
  avatarUrl?: string | null;
  bio?: string | null;
  email?: string | null;
  phone?: string | null;
}

export function toPublicUserProfile(user: SourceUserRow): PublicUserProfile {
  return {
    id: user.id,
    accountType: user.accountType,
    displayName: user.displayName,
    username: user.username,
    avatarUrl: user.avatarUrl ?? null,
    bio: user.bio ?? null,
  };
}

export function toOwnerUserProfile(user: SourceUserRow): OwnerUserProfile {
  return {
    ...toPublicUserProfile(user),
    email: user.email ?? null,
    phone: user.phone ?? null,
  };
}
