import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { useFocusEffect } from 'expo-router';

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
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    // non-critical
  }
}

export function useSearchHistory() {
  const [history, setHistory] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(() => {
    void load().then((items) => {
      setHistory(items);
      setReady(true);
    });
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const persist = useCallback((items: string[]) => {
    setHistory(items);
    void save(items);
  }, []);

  const addToHistory = useCallback((term: string) => {
    const trimmed = term.trim();
    if (trimmed.length < 1) return;
    setHistory((prev) => {
      const next = [trimmed, ...prev.filter((h) => h !== trimmed)].slice(0, MAX);
      void save(next);
      return next;
    });
  }, []);

  const removeFromHistory = useCallback((term: string) => {
    setHistory((prev) => {
      const next = prev.filter((h) => h !== term);
      void save(next);
      return next;
    });
  }, []);

  const clearHistory = useCallback(() => {
    persist([]);
  }, [persist]);

  return { history, ready, addToHistory, removeFromHistory, clearHistory };
}
