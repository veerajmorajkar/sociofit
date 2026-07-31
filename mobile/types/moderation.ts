export type ModerationTargetType = 'post' | 'user' | 'event';

export type ReportReason =
  | 'spam'
  | 'harassment'
  | 'hate_speech'
  | 'violence'
  | 'nudity'
  | 'misinformation'
  | 'impersonation'
  | 'other';

export interface ReportPayload {
  targetType: ModerationTargetType;
  targetId: string;
  reason: ReportReason;
  description?: string;
}

export interface HidePayload {
  targetType: ModerationTargetType;
  targetId: string;
}

export interface ReportRecord {
  id: string;
  targetType: ModerationTargetType;
  targetId: string;
  reason: ReportReason;
  status: string;
  createdAt: string;
}
