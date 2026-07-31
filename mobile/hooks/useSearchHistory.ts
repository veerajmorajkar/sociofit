import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const KEY = '@mfm_search_history';
const LEGACY_SECURE_KEY = 'mfm_search_history';
const MAX = 10;

function parseHistory(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((t): t is string => typeof t === 'string' && t.trim().length > 0);
  } catch {
    return [];
  }
}

async function load(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const fromAsync = parseHistory(raw);
    if (fromAsync.length > 0) return fromAsync;

    const legacy = await SecureStore.getItemAsync(LEGACY_SECURE_KEY);
    const fromLegacy = parseHistory(legacy);
    if (fromLegacy.length > 0) {
      await AsyncStorage.setItem(KEY, JSON.stringify(fromLegacy));
    }
    return fromLegacy;
  } catch {
    return [];
  }
}

async function save(items: string[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(items));
}

export function useSearchHistory() {
  const [history, setHistory] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const historyRef = useRef<string[]>([]);
  const loadSeq = useRef(0);

  const applyHistory = useCallback((items: string[]) => {
    historyRef.current = items;
    setHistory(items);
  }, []);

  const refresh = useCallback(() => {
    const seq = ++loadSeq.current;
    void load()
      .then((items) => {
        if (seq !== loadSeq.current) return;
        applyHistory(items);
        setReady(true);
      })
      .catch(() => {
        if (seq !== loadSeq.current) return;
        setReady(true);
      });
  }, [applyHistory]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const persist = useCallback(
    async (items: string[]) => {
      applyHistory(items);
      try {
        await save(items);
      } catch {
        // non-critical
      }
    },
    [applyHistory],
  );

  const addToHistory = useCallback(
    (term: string) => {
      const trimmed = term.trim();
      if (trimmed.length < 1) return;

      const next = [trimmed, ...historyRef.current.filter((h) => h !== trimmed)].slice(0, MAX);
      void persist(next);
    },
    [persist],
  );

  const removeFromHistory = useCallback(
    (term: string) => {
      const next = historyRef.current.filter((h) => h !== term);
      void persist(next);
    },
    [persist],
  );

  const clearHistory = useCallback(() => {
    void persist([]);
  }, [persist]);

  return { history, ready, addToHistory, removeFromHistory, clearHistory };
}
