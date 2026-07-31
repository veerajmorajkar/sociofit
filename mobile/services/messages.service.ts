import { api } from './api';
import type {
  ClubAnnouncementChannel,
  Conversation,
  ConversationDetail,
  ConversationPermissions,
  Message,
} from '@/types/message';

export async function getConversations(): Promise<Conversation[]> {
  const res = await api.get<Conversation[]>('/messages/conversations?limit=50');
  return res.data ?? [];
}

export async function getConversation(conversationId: string): Promise<ConversationDetail> {
  const res = await api.get<ConversationDetail>(`/messages/conversations/${conversationId}`);
  if (!res.success || !res.data) throw new Error(res.error ?? 'Conversation not found');
  return res.data;
}

export async function getMessages(
  conversationId: string,
): Promise<{ messages: Message[]; permissions?: ConversationPermissions }> {
  const res = await api.get<Message[]>(
    `/messages/conversations/${conversationId}/messages?limit=50`,
  );
  return {
    messages: res.data ?? [],
    permissions: res.meta?.permissions as ConversationPermissions | undefined,
  };
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

export async function setConversationMuted(conversationId: string, muted: boolean): Promise<void> {
  const res = await api.patch<{ muted: boolean }>(
    `/messages/conversations/${conversationId}/mute`,
    { muted },
  );
  if (!res.success) throw new Error(res.error ?? 'Failed to update mute');
}

export async function startDm(recipientId: string): Promise<string> {
  const res = await api.post<{ conversationId: string; created: boolean }>(
    '/messages/conversations',
    { recipientId },
  );
  if (!res.success) throw new Error(res.error ?? 'Failed to start conversation');
  return res.data.conversationId;
}

export async function createGroup(
  title: string,
  memberIds: string[],
): Promise<{ conversationId: string; memberCount: number }> {
  const res = await api.post<{ conversationId: string; memberCount: number }>(
    '/messages/conversations/groups',
    { title, memberIds },
  );
  if (!res.success) throw new Error(res.error ?? 'Failed to create group');
  return res.data;
}

export async function addGroupMembers(conversationId: string, memberIds: string[]): Promise<void> {
  const res = await api.post<{ added: number }>(
    `/messages/conversations/${conversationId}/members`,
    { memberIds },
  );
  if (!res.success) throw new Error(res.error ?? 'Failed to add members');
}

export async function leaveConversation(conversationId: string): Promise<void> {
  const res = await api.post<{ left: boolean }>(`/messages/conversations/${conversationId}/leave`);
  if (!res.success) throw new Error(res.error ?? 'Failed to leave conversation');
}

export async function getClubAnnouncement(clubId: string): Promise<ClubAnnouncementChannel> {
  const res = await api.get<ClubAnnouncementChannel>(`/messages/clubs/${clubId}/announcement`);
  if (!res.success || !res.data) throw new Error(res.error ?? 'Announcement channel not found');
  return res.data;
}

export async function joinClubAnnouncement(
  clubId: string,
): Promise<{ conversationId: string; joined: boolean }> {
  const res = await api.post<{ conversationId: string; joined: boolean }>(
    `/messages/clubs/${clubId}/announcement/join`,
  );
  if (!res.success) throw new Error(res.error ?? 'Failed to join announcement channel');
  return res.data;
}
