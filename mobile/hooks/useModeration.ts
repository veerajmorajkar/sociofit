import { useMutation, useQueryClient } from '@tanstack/react-query';
import { hideContent, submitReport } from '@/services/moderation.service';
import type { HidePayload, ReportPayload } from '@/types/moderation';

function invalidateAfterModeration(
  queryClient: ReturnType<typeof useQueryClient>,
  payload: HidePayload | ReportPayload,
) {
  void queryClient.invalidateQueries({ queryKey: ['feed'] });
  void queryClient.invalidateQueries({ queryKey: ['events'] });
  void queryClient.invalidateQueries({ queryKey: ['events', 'joined'] });
  void queryClient.invalidateQueries({ queryKey: ['events', 'hosted'] });

  if (payload.targetType === 'post') {
    void queryClient.invalidateQueries({ queryKey: ['post', payload.targetId] });
    void queryClient.invalidateQueries({ queryKey: ['posts'] });
  }
  if (payload.targetType === 'event') {
    void queryClient.invalidateQueries({ queryKey: ['event', payload.targetId] });
  }
  if (payload.targetType === 'user') {
    void queryClient.invalidateQueries({ queryKey: ['profile', payload.targetId] });
  }
}

export function useReportContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ReportPayload) => submitReport(payload),
    onSuccess: (_data, variables) => {
      invalidateAfterModeration(queryClient, variables);
    },
  });
}

export function useHideContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: HidePayload) => hideContent(payload),
    onSuccess: (_data, variables) => {
      invalidateAfterModeration(queryClient, variables);
    },
  });
}
