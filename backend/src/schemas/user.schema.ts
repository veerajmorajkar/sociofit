import { z } from 'zod';
import { displayNameSchema, emailSchema, phoneSchema } from '../utils/auth-validation.js';

export const requestEmailChangeSchema = z.object({
  email: emailSchema,
});

export const confirmEmailChangeSchema = z.object({
  code: z
    .string()
    .length(6)
    .regex(/^\d{6}$/),
});

export const requestPhoneChangeSchema = z.object({
  phone: phoneSchema,
});

export const confirmPhoneChangeSchema = z.object({
  code: z
    .string()
    .length(6)
    .regex(/^\d{6}$/),
});

export const updateProfileSchema = z.object({
  displayName: displayNameSchema.optional(),
  bio: z.string().max(500).optional(),
  email: emailSchema.optional(),
  phone: phoneSchema.optional(),
  avatarUrl: z.string().url().optional().nullable(),
  coverPhotoUrl: z.string().url().optional().nullable(),
  websiteUrl: z.string().url().optional().nullable(),
  city: z.string().max(100).optional(),
  neighbourhood: z.string().max(100).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  activities: z.array(z.string().min(1).max(50)).optional(),
});

export const paginationSchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
