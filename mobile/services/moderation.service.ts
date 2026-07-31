import { api } from './api';
import type { HidePayload, ReportPayload, ReportRecord } from '@/types/moderation';

export async function submitReport(payload: ReportPayload): Promise<ReportRecord> {
  const res = await api.post<ReportRecord>('/moderation/reports', payload);
  if (!res.success) throw new Error(res.error ?? 'Failed to submit report');
  return res.data;
}

export async function hideContent(
  payload: HidePayload,
): Promise<{ hidden: boolean; alreadyHidden: boolean }> {
  const res = await api.post<{ hidden: boolean; alreadyHidden: boolean }>(
    '/moderation/hides',
    payload,
  );
  if (!res.success) throw new Error(res.error ?? 'Failed to hide content');
  return res.data;
}
