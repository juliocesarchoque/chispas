import { useCallback, useEffect, useState } from 'react';
import { setMeta } from '../db/dexie';

export type ThemeMode = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'chispa-theme';

function getSystemIsDark(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyThemeToDom(mode: ThemeMode) {
  const isDark = mode === 'dark' || (mode === 'system' && getSystemIsDark());
  const bgColor = isDark ? '#161513' : '#F6F4EF';
  const root = document.documentElement;
  root.classList.toggle('dark', isDark);
  root.style.colorScheme = isDark ? 'dark' : 'light';
  root.style.backgroundColor = bgColor;

  if (document.body) {
    document.body.style.backgroundColor = bgColor;
  }

  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.setAttribute('content', bgColor);
  }

  const metaScheme = document.querySelector('meta[name="color-scheme"]');
  if (metaScheme) {
    metaScheme.setAttribute('content', isDark ? 'dark' : 'light');
  }

  const metaApple = document.querySelector(
    'meta[name="apple-mobile-web-app-status-bar-style"]'
  );
  if (metaApple) {
    metaApple.setAttribute('content', isDark ? 'black-translucent' : 'default');
  }
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') return 'system';
    const saved = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
    if (saved === 'light' || saved === 'dark' || saved === 'system') {
      return saved;
    }
    return 'system';
  });

  const [resolvedDark, setResolvedDark] = useState<boolean>(() => {
    return theme === 'dark' || (theme === 'system' && getSystemIsDark());
  });

  useEffect(() => {
    applyThemeToDom(theme);
    setResolvedDark(theme === 'dark' || (theme === 'system' && getSystemIsDark()));

    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      applyThemeToDom('system');
      setResolvedDark(mq.matches);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [theme]);

  const setTheme = useCallback((next: ThemeMode) => {
    localStorage.setItem(STORAGE_KEY, next);
    void setMeta('theme', next);
    setThemeState(next);
  }, []);

  const toggleLightDark = useCallback(() => {
    const currentlyDark =
      theme === 'dark' || (theme === 'system' && getSystemIsDark());
    setTheme(currentlyDark ? 'light' : 'dark');
  }, [theme, setTheme]);

  return {
    theme,
    isDark: resolvedDark,
    setTheme,
    toggleLightDark,
  };
}
