import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'node:crypto';
import { r2Client, R2_BUCKET, R2_PUBLIC_URL } from '../config/r2.js';

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
    throw new Error(`File type ${fileType} is not allowed. Allowed: ${Object.keys(ALLOWED_TYPES).join(', ')}`);
  }

  // Validate file size
  if (fileSize > MAX_FILE_SIZE) {
    throw new Error(`File size ${fileSize} exceeds maximum of ${MAX_FILE_SIZE} bytes (50MB)`);
  }

  // Generate a unique key: folder/userId/uuid.ext
  const key = `${folder}/${userId}/${randomUUID()}.${ext}`;

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    ContentType: fileType,
    ContentLength: fileSize,
  });

  // Pre-signed URL expires in 1 hour
  const uploadUrl = await getSignedUrl(r2Client, command, { expiresIn: 3600 });
  const publicUrl = `${R2_PUBLIC_URL}/${key}`;

  return {
    uploadUrl,
    publicUrl,
    key,
    expiresIn: 3600,
  };
}
