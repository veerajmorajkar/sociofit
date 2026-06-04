import { api } from './api';
import type { Conversation, Message } from '@/types/message';

export async function getConversations(): Promise<Conversation[]> {
  const res = await api.get<Conversation[]>('/messages/conversations?limit=50');
  return res.data ?? [];
}

export async function getMessages(conversationId: string): Promise<Message[]> {
  const res = await api.get<Message[]>(
    `/messages/conversations/${conversationId}/messages?limit=50`,
  );
  return res.data ?? [];
}

export async function sendMessage(conversationId: string, content: string): Promise<Message> {
  const res = await api.post<Message>(`/messages/conversations/${conversationId}/messages`, {
    content,
    messageType: 'text',
  });
  if (!res.success) throw new Error(res.error ?? 'Failed to send message');
  return res.data;
}

export async function markConversationRead(conversationId: string): Promise<void> {
  const res = await api.patch<{ updated: boolean }>(
    `/messages/conversations/${conversationId}/read`,
  );
  if (!res.success) throw new Error(res.error ?? 'Failed to mark as read');
}

export async function startDm(recipientId: string): Promise<string> {
  const res = await api.post<{ conversationId: string; created: boolean }>(
    '/messages/conversations',
    { recipientId },
  );
  if (!res.success) throw new Error(res.error ?? 'Failed to start conversation');
  return res.data.conversationId;
}
