import { eq } from 'drizzle-orm';
import { db } from '../config/database.js';
import { uploads } from '../db/schema.js';
import { R2_PUBLIC_URL } from '../config/r2.js';

type MediaFolder = 'posts' | 'avatars' | 'covers';

function normalizedPublicBase(): string | null {
  const base = R2_PUBLIC_URL?.trim();
  if (!base) return null;
  return base.replace(/\/$/, '');
}

/** True when the URL is on our R2 public origin (safe to server-fetch). */
export function isAllowedR2MediaUrl(url: string): boolean {
  const base = normalizedPublicBase();
  if (!base) return false;
  try {
    const parsed = new URL(url);
    const baseUrl = new URL(base);
    return parsed.origin === baseUrl.origin && url.startsWith(`${base}/`);
  } catch {
    return false;
  }
}

/**
 * Ensures a client-supplied media URL (post/event/profile) belongs to the
 * uploader's own R2 prefix AND corresponds to an object key we actually
 * issued a presigned upload URL for — not just a string that happens to
 * match the expected path shape. Skipped when R2 is not configured (local dev).
 */
export async function assertUserMediaUrl(
  url: string,
  userId: string,
  folder: MediaFolder,
): Promise<void> {
  const base = normalizedPublicBase();
  if (!base) return;

  if (!isAllowedR2MediaUrl(url)) {
    throw new Error('Media must be uploaded through the app');
  }

  const objectKey = url.slice(base.length + 1);
  const expectedPrefix = `${folder}/${userId}/`;
  if (!objectKey.startsWith(expectedPrefix)) {
    throw new Error('Media URL does not belong to this user');
  }

  const [record] = await db
    .select({ id: uploads.id, uploaderId: uploads.uploaderId })
    .from(uploads)
    .where(eq(uploads.objectKey, objectKey))
    .limit(1);

  if (!record || record.uploaderId !== userId) {
    throw new Error('Media must be uploaded through the app');
  }
}

export async function assertOptionalUserMediaUrl(
  url: string | null | undefined,
  userId: string,
  folder: MediaFolder,
): Promise<void> {
  if (!url) return;
  await assertUserMediaUrl(url, userId, folder);
}
