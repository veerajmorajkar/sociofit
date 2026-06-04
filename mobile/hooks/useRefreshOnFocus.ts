import { useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';

/** Refetch when the screen gains focus, throttled to avoid hammering the API. */
export function useRefreshOnFocus(refetch: () => void | Promise<unknown>, minIntervalMs = 45_000) {
  const lastRefetchAt = useRef(0);

  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      if (now - lastRefetchAt.current < minIntervalMs) return;
      lastRefetchAt.current = now;
      void refetch();
    }, [refetch, minIntervalMs]),
  );
}
