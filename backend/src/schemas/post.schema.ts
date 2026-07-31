import { z } from 'zod';

export const createPostSchema = z.object({
  postType: z.enum(['photo', 'video', 'text', 'link', 'event_invite', 'route']),
  caption: z.string().max(2200).optional(),
  mediaUrls: z
    .array(
      z.object({
        url: z.string().url(),
        mediaType: z.enum(['image', 'video']),
        thumbnailUrl: z.string().url().optional(),
        width: z.number().int().positive().optional(),
        height: z.number().int().positive().optional(),
        durationMs: z.number().int().positive().optional(),
      }),
    )
    .max(10)
    .optional(),
  linkUrl: z.string().url().optional(),
  categoryId: z.string().uuid().optional(),
  locationName: z.string().max(255).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  taggedUsernames: z
    .array(
      z
        .string()
        .min(1)
        .max(50)
        .transform((s) => s.replace(/^@/, '').toLowerCase()),
    )
    .max(10)
    .optional(),
});

export const feedQuerySchema = z.object({
  cursor: z.string().min(1).max(128).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const commentSchema = z.object({
  content: z.string().min(1).max(1000),
  parentId: z.string().uuid().optional(),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;
export type FeedQueryInput = z.infer<typeof feedQuerySchema>;
export type CommentInput = z.infer<typeof commentSchema>;
