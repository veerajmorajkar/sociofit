import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'node:crypto';
import { eq, and } from 'drizzle-orm';
import { r2Client, R2_BUCKET, R2_PUBLIC_URL } from '../config/r2.js';
import { db } from '../config/database.js';
import { uploads } from '../db/schema.js';

// Allowed MIME types and their extensions
const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
};

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

interface PresignedUrlResult {
  uploadUrl: string;
  publicUrl: string;
  key: string;
  expiresIn: number;
}

export async function generatePresignedUrl(
  userId: string,
  fileType: string,
  fileSize: number,
  folder: 'posts' | 'avatars' | 'covers' = 'posts',
): Promise<PresignedUrlResult> {
  // Validate file type
  const ext = ALLOWED_TYPES[fileType];
  if (!ext) {
    throw new Error(
      `File type ${fileType} is not allowed. Allowed: ${Object.keys(ALLOWED_TYPES).join(', ')}`,
    );
  }

  // Validate file size
  if (fileSize > MAX_FILE_SIZE) {
    throw new Error(`File size ${fileSize} exceeds maximum of ${MAX_FILE_SIZE} bytes (50MB)`);
  }

  // Generate a unique key: folder/userId/uuid.ext
  const key = `${folder}/${userId}/${randomUUID()}.${ext}`;

  // Do not bind ContentLength into the signature — mobile must send exact bytes and
  // estimates (width×height, missing MediaLibrary fileSize) cause R2 to return 403.
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    ContentType: fileType,
  });

  // Pre-signed URL expires in 1 hour
  const uploadUrl = await getSignedUrl(r2Client, command, { expiresIn: 3600 });
  const publicUrl = `${R2_PUBLIC_URL}/${key}`;

  // Record the issuance so downstream services (posts/events/profile) can verify
  // any mediaUrl they're handed actually corresponds to an upload we authorised
  // for this exact user, rather than trusting the URL shape alone.
  await db.insert(uploads).values({
    uploaderId: userId,
    objectKey: key,
    folder,
    contentType: fileType,
    sizeBytes: fileSize,
  });

  return {
    uploadUrl,
    publicUrl,
    key,
    expiresIn: 3600,
  };
}

/**
 * Marks an upload as confirmed once the client has finished the direct-to-R2
 * PUT. Not yet enforced as a hard gate on media acceptance (see media-url.ts)
 * to avoid breaking the existing mobile upload flow before it adopts this
 * call, but the timestamp is recorded for audit/anti-abuse purposes now.
 */
export async function confirmUpload(userId: string, objectKey: string): Promise<void> {
  const [record] = await db
    .select({ id: uploads.id, uploaderId: uploads.uploaderId })
    .from(uploads)
    .where(eq(uploads.objectKey, objectKey))
    .limit(1);

  if (!record || record.uploaderId !== userId) {
    throw new Error('Upload record not found');
  }

  await db
    .update(uploads)
    .set({ confirmedAt: new Date() })
    .where(and(eq(uploads.objectKey, objectKey), eq(uploads.uploaderId, userId)));
}
