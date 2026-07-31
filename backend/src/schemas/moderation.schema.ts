import { z } from 'zod';

export const MODERATION_TARGET_TYPES = ['post', 'user', 'event'] as const;

export const REPORT_REASONS = [
  'spam',
  'harassment',
  'hate_speech',
  'violence',
  'nudity',
  'misinformation',
  'impersonation',
  'other',
] as const;

export const createReportSchema = z.object({
  targetType: z.enum(MODERATION_TARGET_TYPES),
  targetId: z.string().uuid(),
  reason: z.enum(REPORT_REASONS),
  description: z.string().max(1000).optional(),
});

export const hideContentSchema = z.object({
  targetType: z.enum(MODERATION_TARGET_TYPES),
  targetId: z.string().uuid(),
});

export type CreateReportInput = z.infer<typeof createReportSchema>;
export type HideContentInput = z.infer<typeof hideContentSchema>;
