/** Utilitaires URL sans dépendance React Native — testables en Node (Vitest). */
export function stripTrailingSlash(url: string): string {
  return (url || '').trim().replace(/\/+$/, '');
}

export function stripApiSuffix(origin: string): string {
  let u = stripTrailingSlash(origin);
  if (u.endsWith('/api')) u = u.slice(0, -4);
  return u;
}
