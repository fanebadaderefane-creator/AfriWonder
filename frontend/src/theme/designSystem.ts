/**
 * Phase 8 — Design system AfriWonder (mobile Expo).
 * Source unique pour espacements / touch / typo : importer depuis ici ou `colors.ts`.
 */
import { Colors, Spacing, FontSizes, BorderRadius } from './colors';

/** Zone tactile minimale recommandée (Apple HIG / Material). */
export const MIN_TOUCH_TARGET = 44;

/** Icônes : Ionicons (@expo/vector-icons) — seul système officiel Phase 8. */
export const ICON_SYSTEM = 'Ionicons' as const;

export const Typography = {
  /** Corps lisible ≥ 16px (Phase 8 accessibilité). */
  body: { fontSize: FontSizes.lg, lineHeight: 22 },
  bodySecondary: { fontSize: FontSizes.md, lineHeight: 20, color: Colors.textSecondary },
  title: { fontSize: FontSizes.xxl, fontWeight: '700' as const },
  caption: { fontSize: FontSizes.sm, color: Colors.textMuted },
};

export { Colors, Spacing, FontSizes, BorderRadius };
