import { api } from './api';
import type { AppNotification } from '@/types/notification';

export async function getNotifications(): Promise<AppNotification[]> {
  const res = await api.get<AppNotification[]>('/notifications?limit=50');
  return res.data ?? [];
}

export async function markAllNotificationsRead(): Promise<void> {
  const res = await api.patch<{ read: boolean }>('/notifications/read-all', {});
  if (!res.success) throw new Error(res.error ?? 'Failed to mark notifications read');
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  const res = await api.patch<{ read: boolean }>(`/notifications/${notificationId}/read`, {});
  if (!res.success) throw new Error(res.error ?? 'Failed to mark notification read');
}
