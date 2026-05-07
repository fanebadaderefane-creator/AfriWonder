import { getPostAuthRoute } from './onboardingFlow';

function normalizeReturnTo(value: unknown): string | null {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw) return null;
  // Security: keep navigation internal to app routes only.
  if (!raw.startsWith('/') || raw.startsWith('//')) return null;
  // Avoid redirect loops to auth screens.
  if (raw.startsWith('/(auth)')) return null;
  return raw;
}

export async function resolvePostAuthRedirect(returnToParam: unknown): Promise<string> {
  const safe = normalizeReturnTo(returnToParam);
  if (safe) return safe;
  return getPostAuthRoute();
}
