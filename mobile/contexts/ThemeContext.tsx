import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { darkTheme, lightTheme, getTheme, type ThemeType, type ThemeMode } from '@/constants/theme';

const THEME_STORAGE_KEY = 'mfm_theme_mode';

// ─────────────────────────────────────────────
// Context shape
// ─────────────────────────────────────────────

interface ThemeContextValue {
  theme: ThemeType;
  mode: ThemeMode;
  /** Tab / feed screen floor — white in light mode, dark purple in dark mode. */
  pageBg: string;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

// ─────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('light');

  // Load persisted preference once on mount (first install has no saved value → stays light)
  useEffect(() => {
    const load = async () => {
      try {
        const saved = await SecureStore.getItemAsync(THEME_STORAGE_KEY);
        if (saved === 'light' || saved === 'dark') {
          setMode(saved);
        }
      } catch {
        // SecureStore unavailable (web/test) — stay on default light
      }
    };
    void load();
  }, []);

  const toggleTheme = useCallback(() => {
    setMode((prev) => {
      const next: ThemeMode = prev === 'dark' ? 'light' : 'dark';
      // Persist asynchronously — fire and forget
      void SecureStore.setItemAsync(THEME_STORAGE_KEY, next).catch(() => {
        // Ignore persistence errors
      });
      return next;
    });
  }, []);

  const theme = getTheme(mode);
  const value: ThemeContextValue = {
    theme,
    mode,
    pageBg: mode === 'light' ? theme.surface1 : theme.bgPrimary,
    toggleTheme,
    isDark: mode === 'dark',
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// ─────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used inside <ThemeProvider>');
  }
  return ctx;
}

// Re-export types for convenience
export type { ThemeType, ThemeMode };

// Default exports for both themes (useful for static references)
export { darkTheme, lightTheme };
