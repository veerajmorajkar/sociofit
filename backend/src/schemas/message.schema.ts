import { z } from 'zod';
import { GROUP_MEMBER_LIMIT } from '../constants/messaging.js';

export const createDmSchema = z.object({
  recipientId: z.string().uuid(),
});

export const createGroupSchema = z.object({
  title: z.string().trim().min(1).max(200),
  memberIds: z
    .array(z.string().uuid())
    .min(1)
    .max(GROUP_MEMBER_LIMIT - 1),
});

export const addGroupMembersSchema = z.object({
  memberIds: z.array(z.string().uuid()).min(1).max(GROUP_MEMBER_LIMIT),
});

export const sendMessageSchema = z
  .object({
    content: z.string().max(5000).optional(),
    messageType: z.enum(['text', 'image', 'gif']).default('text'),
    mediaUrl: z.string().url().optional(),
  })
  .refine((data) => data.content || data.mediaUrl, {
    message: 'Either content or mediaUrl is required',
  });

export const conversationQuerySchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const muteConversationSchema = z.object({
  muted: z.boolean(),
});

export type CreateDmInput = z.infer<typeof createDmSchema>;
export type CreateGroupInput = z.infer<typeof createGroupSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
