import { radius } from '@/constants/theme';

export type ChatBubbleShape = {
  borderRadius: number;
  paddingHorizontal: number;
  paddingVertical: number;
};

/** Rough line estimate before onTextLayout runs — avoids a pill flash on long text */
export function estimateChatLineCount(text: string): number {
  const len = text.trim().length;
  if (len <= 0) return 1;
  if (len <= 48) return 1;
  if (len <= 110) return 2;
  return Math.min(8, Math.ceil(len / 36));
}

/**
 * Short messages stay pill-shaped; longer copy uses softer card radii and tighter padding.
 */
export function getChatBubbleShape(lineCount: number, textLength: number): ChatBubbleShape {
  const lines = Math.max(1, lineCount);
  const len = Math.max(0, textLength);

  if (lines === 1 && len <= 52) {
    return { borderRadius: radius.full, paddingHorizontal: 16, paddingVertical: 11 };
  }

  if (lines <= 2 && len <= 140) {
    return { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10 };
  }

  return { borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 9 };
}
