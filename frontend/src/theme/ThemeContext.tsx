import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../store/authStore';
import { STORAGE_APP_THEME } from '../constants/storageKeys';
import { paletteDark, paletteLight, type AppPalette } from './themePalettes';

type ThemeMode = 'light' | 'dark';

function resolveMode(userTheme: string | null | undefined, system: string | null): ThemeMode {
  if (userTheme === 'dark') return 'dark';
  if (userTheme === 'light') return 'light';
  /** `system`, absent ou inconnu → suit l’OS. */
  return system === 'light' ? 'light' : 'dark';
}

interface ThemeContextValue {
  mode: ThemeMode;
  colors: AppPalette;
  /** Fil vidéo : toujours fond noir pour immersion. */
  videoBackground: string;
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: 'dark',
  colors: paletteDark,
  videoBackground: '#000000',
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const userTheme = useAuthStore((s) => s.user?.theme);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [cachedTheme, setCachedTheme] = useState<string | null>(null);

  useEffect(() => {
    void AsyncStorage.getItem(STORAGE_APP_THEME).then((raw) => {
      const v = String(raw || '').trim();
      if (v === 'dark' || v === 'light' || v === 'system') setCachedTheme(v);
    });
  }, []);

  /** Après logout : recharger le thème disque pour que l’app reste cohérente hors session. */
  useEffect(() => {
    if (isAuthenticated) return;
    void AsyncStorage.getItem(STORAGE_APP_THEME).then((raw) => {
      const v = String(raw || '').trim();
      if (v === 'dark' || v === 'light' || v === 'system') setCachedTheme(v);
      else setCachedTheme(null);
    });
  }, [isAuthenticated]);

  const value = useMemo((): ThemeContextValue => {
    const fromUser = userTheme && String(userTheme).trim() !== '' ? String(userTheme).trim() : null;
    const resolved = fromUser ?? cachedTheme;
    const mode = resolveMode(resolved, systemScheme ?? 'dark');
    const colors = mode === 'light' ? paletteLight : paletteDark;
    return {
      mode,
      colors,
      videoBackground: '#000000',
    };
  }, [userTheme, cachedTheme, systemScheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  return useContext(ThemeContext);
}
