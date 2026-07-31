import { formatChatDayLabel, getChatDayKey } from '@/utils/formatDate';
import type { Message } from '@/types/message';

export type ChatListItem =
  | { kind: 'day'; id: string; label: string }
  | { kind: 'message'; id: string; message: Message; messageIndex: number };

export function buildChatListItems(messages: Message[]): ChatListItem[] {
  const items: ChatListItem[] = [];
  let lastDayKey = '';

  messages.forEach((message, messageIndex) => {
    const dayKey = getChatDayKey(message.createdAt);
    if (dayKey !== lastDayKey) {
      items.push({
        kind: 'day',
        id: `day-${dayKey}`,
        label: formatChatDayLabel(message.createdAt),
      });
      lastDayKey = dayKey;
    }
    items.push({
      kind: 'message',
      id: message.id,
      message,
      messageIndex,
    });
  });

  return items;
}
