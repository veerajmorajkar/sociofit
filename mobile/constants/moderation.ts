import type { ModerationTargetType, ReportReason } from '@/types/moderation';

export const REPORT_REASONS: { id: ReportReason; label: string }[] = [
  { id: 'spam', label: 'Spam or misleading' },
  { id: 'harassment', label: 'Harassment or bullying' },
  { id: 'hate_speech', label: 'Hate speech' },
  { id: 'violence', label: 'Violence or dangerous activity' },
  { id: 'nudity', label: 'Nudity or sexual content' },
  { id: 'misinformation', label: 'False information' },
  { id: 'impersonation', label: 'Impersonation' },
  { id: 'other', label: 'Something else' },
];

export function hideLabelFor(targetType: ModerationTargetType): string {
  switch (targetType) {
    case 'post':
      return 'Hide this post';
    case 'event':
      return 'Hide this event';
    case 'user':
      return 'Hide posts from this user';
  }
}

export function reportLabelFor(targetType: ModerationTargetType): string {
  switch (targetType) {
    case 'post':
      return 'Report post';
    case 'event':
      return 'Report event';
    case 'user':
      return 'Report user';
  }
}
