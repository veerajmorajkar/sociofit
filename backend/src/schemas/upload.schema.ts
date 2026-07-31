import { z } from 'zod';

export const presignedUrlSchema = z.object({
  fileName: z.string().min(1),
  fileType: z.enum([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'video/mp4',
    'video/quicktime',
  ]),
  fileSize: z
    .number()
    .int()
    .positive()
    .max(50 * 1024 * 1024, 'Max file size is 50MB'),
  folder: z.enum(['posts', 'avatars', 'covers']).default('posts'),
});

export type PresignedUrlInput = z.infer<typeof presignedUrlSchema>;

export const confirmUploadSchema = z.object({
  key: z.string().min(1).max(500),
});

export type ConfirmUploadInput = z.infer<typeof confirmUploadSchema>;
