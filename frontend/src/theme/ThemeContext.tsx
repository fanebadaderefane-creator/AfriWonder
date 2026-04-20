import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { paletteDark, paletteLight, type AppPalette } from './themePalettes';

type ThemeMode = 'light' | 'dark';

function resolveMode(userTheme: string | null | undefined, system: string | null): ThemeMode {
  if (userTheme === 'dark') return 'dark';
  if (userTheme === 'light') return 'light';
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

  const value = useMemo((): ThemeContextValue => {
    const mode = resolveMode(userTheme ?? null, systemScheme ?? 'dark');
    const colors = mode === 'light' ? paletteLight : paletteDark;
    return {
      mode,
      colors,
      videoBackground: '#000000',
    };
  }, [userTheme, systemScheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  return useContext(ThemeContext);
}
