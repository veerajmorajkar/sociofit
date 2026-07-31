export type ConversationType = 'dm' | 'group' | 'event_chat' | 'club_announcement';

export type ParticipantRole = 'owner' | 'member' | 'subscriber';

export type DiscussionPhase = 'open' | 'organiser_only' | null;

export interface ConversationPermissions {
  canSend: boolean;
  canAddMembers: boolean;
  canLeave: boolean;
  isReadOnly: boolean;
  discussionPhase: DiscussionPhase;
  role: ParticipantRole;
}

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
  role?: ParticipantRole;
}

export interface ConversationLastMessage {
  content: string | null;
  messageType: string;
  senderId: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  type: ConversationType;
  title: string | null;
  eventId: string | null;
  clubId: string | null;
  lastMessageAt: string | null;
  memberCount: number;
  participants: ConversationParticipant[];
  lastMessage: ConversationLastMessage | null;
  unreadCount: number;
  permissions: ConversationPermissions | null;
}

export interface ConversationDetail extends Conversation {
  createdById: string | null;
  permissions: ConversationPermissions;
}

export interface ClubAnnouncementChannel {
  conversationId: string | null;
  title: string;
  isSubscribed: boolean;
  subscriberCount: number;
  canView: boolean;
}
