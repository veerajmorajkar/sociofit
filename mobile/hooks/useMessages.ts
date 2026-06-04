import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useIsFocused } from '@react-navigation/native';
import {
  getConversations,
  getMessages,
  sendMessage,
  startDm,
  markConversationRead,
} from '@/services/messages.service';

export function useConversations() {
  return useQuery({
    queryKey: ['conversations'],
    queryFn: getConversations,
    staleTime: 1000 * 60,
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
