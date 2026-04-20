import { paletteDark, type AppPalette } from './themePalettes';

/** Palette par défaut (mode sombre / feed vidéo). Pour l’UI dynamique clair/sombre : `useAppTheme().colors`. */
export const Colors: AppPalette = { ...paletteDark };

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 20,
  xl: 24,
  pill: 50,
  full: 9999,
};

export const FontSizes = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
  xxl: 20,
  xxxl: 24,
  display: 28,
};
