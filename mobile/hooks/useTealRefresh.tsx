import { useCallback, useMemo, useRef, useState } from 'react';
import { Platform, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { TealRefreshHeader, TEAL_REFRESH_SCROLL_PROPS } from '@/components/ui/TealRefreshControl';

type RefetchFn = () => void | Promise<unknown>;

const PULL_PREVIEW_OFFSET = 28;
const PULL_TRIGGER_OFFSET = 56;

/**
 * Custom teal pull-to-refresh — no native RefreshControl.
 * Pull → slot opens → refresh holds offset → slot closes when done.
 */
export function useTealRefresh(refetch: RefetchFn) {
  const [refreshing, setRefreshing] = useState(false);
  const [pulling, setPulling] = useState(false);
  const busyRef = useRef(false);

  const showIndicator = pulling || refreshing;

  const runRefresh = useCallback(async () => {
    if (busyRef.current) return;

    busyRef.current = true;
    setPulling(false);
    setRefreshing(true);

    try {
      await refetch();
    } finally {
      busyRef.current = false;
      setRefreshing(false);
    }
  }, [refetch]);

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (busyRef.current) return;

    const offsetY = e.nativeEvent.contentOffset.y;
    if (offsetY < -PULL_PREVIEW_OFFSET) {
      setPulling(true);
    } else if (offsetY > -4) {
      setPulling(false);
    }
  }, []);

  const onReleasePull = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetY = e.nativeEvent.contentOffset.y;
      if (offsetY < -PULL_TRIGGER_OFFSET) {
        void runRefresh();
      } else if (!busyRef.current) {
        setPulling(false);
      }
    },
    [runRefresh],
  );

  const refreshListProps = useMemo(
    () => ({
      ...TEAL_REFRESH_SCROLL_PROPS,
      scrollEventThrottle: 16 as const,
      onScroll,
      onScrollEndDrag: onReleasePull,
      onMomentumScrollEnd: Platform.OS === 'ios' ? onReleasePull : undefined,
      ListHeaderComponent: () => <TealRefreshHeader active={showIndicator} />,
    }),
    [onScroll, onReleasePull, showIndicator],
  );

  return { refreshing, pulling, runRefresh, refreshListProps };
}
