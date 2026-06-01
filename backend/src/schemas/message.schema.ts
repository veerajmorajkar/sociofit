import { z } from 'zod';

export const createDmSchema = z.object({
  recipientId: z.string().uuid(),
});

export const sendMessageSchema = z.object({
  content: z.string().max(5000).optional(),
  messageType: z.enum(['text', 'image', 'gif']).default('text'),
  mediaUrl: z.string().url().optional(),
}).refine((data) => data.content || data.mediaUrl, {
  message: 'Either content or mediaUrl is required',
});

export const conversationQuerySchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type CreateDmInput = z.infer<typeof createDmSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
