/** Conversation container kinds */
export const CONVERSATION_TYPES = {
  DM: 'dm',
  GROUP: 'group',
  EVENT_CHAT: 'event_chat',
  CLUB_ANNOUNCEMENT: 'club_announcement',
} as const;

export type ConversationType = (typeof CONVERSATION_TYPES)[keyof typeof CONVERSATION_TYPES];

/** Participant roles — drives send / admin permissions */
export const PARTICIPANT_ROLES = {
  OWNER: 'owner',
  MEMBER: 'member',
  SUBSCRIBER: 'subscriber',
} as const;

export type ParticipantRole = (typeof PARTICIPANT_ROLES)[keyof typeof PARTICIPANT_ROLES];

export const GROUP_MEMBER_LIMIT = 50;

/** Hours after event end before general members lose send access */
export const EVENT_DISCUSSION_GRACE_HOURS = 24;
