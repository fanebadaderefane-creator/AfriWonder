/**
 * Phase 8 — Palettes clair / sombre (marque AfriWonder : sombre par défaut).
 */
export type AppPalette = {
  primary: string;
  primaryDark: string;
  primaryLight: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  card: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  success: string;
  error: string;
  warning: string;
  info: string;
  overlay: string;
  overlayLight: string;
  border: string;
  borderLight: string;
  like: string;
  live: string;
  tabBar: string;
};

export const paletteDark: AppPalette = {
  primary: '#FF6B00',
  primaryDark: '#E65A00',
  primaryLight: '#FF8533',
  secondary: '#1A1A1A',
  accent: '#FFD700',
  background: '#000000',
  surface: '#1E1E1E',
  card: '#262626',
  text: '#FFFFFF',
  textSecondary: '#A0A0A0',
  textMuted: '#666666',
  success: '#FF8A3D',
  error: '#FF7043',
  warning: '#FFB74D',
  info: '#FF9E57',
  overlay: 'rgba(0,0,0,0.5)',
  overlayLight: 'rgba(0,0,0,0.3)',
  border: '#333333',
  borderLight: '#444444',
  like: '#FF7A1A',
  live: '#FF6B00',
  tabBar: '#0A0A0A',
};

/** Mode clair — contrastes visés ≥ AA pour texte principal sur fond. */
export const paletteLight: AppPalette = {
  primary: '#E65A00',
  primaryDark: '#CC5200',
  primaryLight: '#FF8533',
  secondary: '#F5F5F5',
  accent: '#C9A000',
  background: '#FAFAFA',
  surface: '#FFFFFF',
  card: '#F0F0F0',
  text: '#121212',
  textSecondary: '#5C5C5C',
  textMuted: '#757575',
  success: '#E67A2E',
  error: '#D65F3D',
  warning: '#E67A00',
  info: '#D9741E',
  overlay: 'rgba(0,0,0,0.4)',
  overlayLight: 'rgba(0,0,0,0.15)',
  border: '#E0E0E0',
  borderLight: '#EEEEEE',
  like: '#E66A00',
  live: '#E65A00',
  tabBar: '#FFFFFF',
};
