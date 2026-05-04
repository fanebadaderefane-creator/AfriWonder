/** Stub Vitest : évite le parse Flow de `react-native` sous Vite. */

export const Platform = {
  OS: 'web' as const,
  select: <T>(spec: { ios?: T; android?: T; web?: T; default?: T }): T | undefined =>
    spec.web ?? spec.default,
};

export const AppState = {
  currentState: 'active' as const,
  addEventListener: (_e: string, _l: () => void) => ({ remove: () => {} }),
};

export const StyleSheet = {
  create: <T extends Record<string, unknown>>(s: T) => s,
};
