import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useIsFocused } from '@react-navigation/native';
import {
  getConversations,
  getConversation,
  getMessages,
  sendMessage,
  startDm,
  markConversationRead,
  createGroup,
  joinClubAnnouncement,
  setConversationMuted,
} from '@/services/messages.service';
import type { ConversationPermissions } from '@/types/message';

export function useConversations() {
  return useQuery({
    queryKey: ['conversations'],
    queryFn: getConversations,
    staleTime: 1000 * 60,
  });
}

export function useConversation(conversationId: string) {
  return useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: () => getConversation(conversationId),
    enabled: !!conversationId,
    staleTime: 1000 * 30,
  });
}

export function useChatMessages(conversationId: string) {
  const isFocused = useIsFocused();

  return useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () => getMessages(conversationId),
    enabled: !!conversationId,
    staleTime: 1000 * 10,
    refetchInterval: isFocused ? 1000 * 12 : false,
  });
}

export function useMarkConversationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markConversationRead,
    onSuccess: (_data, conversationId) => {
      queryClient.setQueryData<Awaited<ReturnType<typeof getConversations>>>(
        ['conversations'],
        (old) => (old ?? []).map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c)),
      );
    },
  });
}

export function useSendMessage(conversationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (content: string) => sendMessage(conversationId, content),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      void queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
      void queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

export function useStartDm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (recipientId: string) => startDm(recipientId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

export function useCreateGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ title, memberIds }: { title: string; memberIds: string[] }) =>
      createGroup(title, memberIds),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

export function useJoinClubAnnouncement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (clubId: string) => joinClubAnnouncement(clubId),
    onSuccess: (_data, clubId) => {
      void queryClient.invalidateQueries({ queryKey: ['conversations'] });
      void queryClient.invalidateQueries({ queryKey: ['profile', clubId] });
    },
  });
}

export function useSetConversationMuted(conversationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (muted: boolean) => setConversationMuted(conversationId, muted),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
    },
  });
}

export type ChatPermissions = ConversationPermissions;
