import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

export type ThemePreference = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'ik-theme';

/** Resolve the effective theme based on user preference + OS media query. */
function resolveTheme(preference: ThemePreference): 'light' | 'dark' {
  if (preference === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return preference;
}

/** Apply or remove the `dark` class on <html>. */
function applyThemeToDOM(resolved: 'light' | 'dark') {
  const el = document.documentElement;
  if (resolved === 'dark') {
    el.classList.add('dark');
  } else {
    el.classList.remove('dark');
  }
}

/** Read persisted preference from localStorage (defaults to 'system'). */
function readStoredPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored;
    }
  } catch {
    // localStorage may be unavailable
  }
  return 'system';
}

/** Subscribe to OS-level color scheme changes. */
function subscribeToMediaQuery(callback: () => void): () => void {
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener('change', callback);
  return () => mq.removeEventListener('change', callback);
}

/** Snapshot for useSyncExternalStore — returns whether OS prefers dark. */
function getSystemDarkSnapshot(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function useTheme() {
  const [preference, setPreferenceState] = useState<ThemePreference>(readStoredPreference);

  // Track OS-level dark mode changes reactively
  const systemIsDark = useSyncExternalStore(subscribeToMediaQuery, getSystemDarkSnapshot);

  const resolvedTheme: 'light' | 'dark' =
    preference === 'system' ? (systemIsDark ? 'dark' : 'light') : preference;

  // Apply theme to DOM whenever resolved theme changes
  useEffect(() => {
    applyThemeToDOM(resolvedTheme);
  }, [resolvedTheme]);

  const setTheme = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // localStorage may be unavailable
    }
  }, []);

  return { theme: preference, resolvedTheme, setTheme } as const;
}
