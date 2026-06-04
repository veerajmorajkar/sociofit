export interface MessageSender {
  id: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string | null;
  messageType: string;
  mediaUrl: string | null;
  isDeleted: boolean;
  createdAt: string;
  sender: MessageSender;
}

export interface ConversationParticipant {
  id: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  accountType: 'personal' | 'club';
}

export interface ConversationLastMessage {
  content: string | null;
  messageType: string;
  senderId: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  type: string;
  title: string | null;
  lastMessageAt: string | null;
  participants: ConversationParticipant[];
  lastMessage: ConversationLastMessage | null;
  unreadCount: number;
}
