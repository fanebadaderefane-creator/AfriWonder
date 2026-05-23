import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

const ThemeContext = createContext({
  theme: 'system',
  setTheme: () => {},
  resolvedTheme: 'dark',
  systemTheme: 'dark',
});

export function AfriWonderThemeProvider({
  children,
  storageKey = 'afriwonder-theme',
  defaultTheme = 'system',
  ...rest
}) {
  void rest;

  const [systemTheme, setSystemTheme] = useState(() => {
    if (typeof window === 'undefined') return 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  });

  const [theme, setThemeState] = useState(() => {
    try {
      const v = localStorage.getItem(storageKey);
      if (v === 'light' || v === 'dark' || v === 'system') return v;
      return defaultTheme;
    } catch {
      return defaultTheme;
    }
  });

  const resolvedTheme = useMemo(
    () =>
      theme === 'system'
        ? systemTheme
        : theme === 'light'
          ? 'light'
          : 'dark',
    [theme, systemTheme]
  );

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () =>
      setSystemTheme(mq.matches ? 'dark' : 'light');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(resolvedTheme);
  }, [resolvedTheme]);

  const setTheme = useCallback(
    (value) => {
      const next = typeof value === 'function' ? value(theme) : value;
      if (next !== 'light' && next !== 'dark' && next !== 'system') return;
      setThemeState(next);
      try {
        localStorage.setItem(storageKey, next);
      } catch {
        // ignore
      }
    },
    [storageKey, theme]
  );

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      resolvedTheme,
      systemTheme,
    }),
    [theme, setTheme, resolvedTheme, systemTheme]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
