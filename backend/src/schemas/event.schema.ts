import { z } from 'zod';

export const createEventSchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().max(2000).optional(),
  categoryId: z.string().uuid(),
  coverImageUrl: z.string().url().optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  locationName: z.string().min(1).max(255),
  locationAddress: z.string().max(500).optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  maxCapacity: z.number().int().positive().optional(),
  priceInr: z.number().int().min(0).default(0),
});

export const updateEventSchema = z.object({
  title: z.string().min(5).max(200).optional(),
  description: z.string().max(2000).optional(),
  coverImageUrl: z.string().url().optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  locationName: z.string().min(1).max(255).optional(),
  locationAddress: z.string().max(500).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  maxCapacity: z.number().int().positive().optional(),
  priceInr: z.number().int().min(0).optional(),
  status: z.enum(['draft', 'upcoming', 'live', 'completed', 'cancelled']).optional(),
});

export const eventQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  /** Single category slug (legacy) */
  category: z.string().optional(),
  /** Comma-separated category slugs for multi-filter, e.g. running,cycling */
  categories: z
    .string()
    .optional()
    .transform((val) => {
      if (!val?.trim()) return undefined;
      const slugs = val
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      return slugs.length > 0 ? slugs : undefined;
    }),
  status: z.enum(['upcoming', 'live']).optional(),
  priceType: z.enum(['free', 'paid']).optional(),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
  radiusKm: z.coerce.number().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  search: z.string().optional(),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export type EventQueryInput = z.infer<typeof eventQuerySchema>;
