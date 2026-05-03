import type { AuthSessionResult } from 'expo-auth-session';

function parseTokenParamsFromUrl(url: string): { access_token?: string; id_token?: string } {
  const out: { access_token?: string; id_token?: string } = {};
  const hashIdx = url.indexOf('#');
  const qIdx = url.indexOf('?');
  const qsParts: string[] = [];
  if (hashIdx >= 0) qsParts.push(url.slice(hashIdx + 1));
  if (qIdx >= 0) {
    const beforeHash = hashIdx >= 0 ? url.slice(qIdx + 1, hashIdx) : url.slice(qIdx + 1);
    if (beforeHash) qsParts.push(beforeHash);
  }
  for (const part of qsParts) {
    const sp = new URLSearchParams(part);
    if (!out.access_token && sp.get('access_token')) out.access_token = sp.get('access_token') || undefined;
    if (!out.id_token && sp.get('id_token')) out.id_token = sp.get('id_token') || undefined;
  }
  return out;
}

/**
 * Google (expo-auth-session) : peut exposer `accessToken` / `idToken` dans `authentication`,
 * dans `params`, ou seulement dans le fragment du `url` après le retour Custom Tabs.
 */
export function extractGoogleOAuthTokens(result: AuthSessionResult | null): {
  accessToken: string | null;
  idToken: string | null;
} {
  if (!result || result.type !== 'success') return { accessToken: null, idToken: null };
  let accessToken: string | null = null;
  let idToken: string | null = null;

  if ('authentication' in result && result.authentication && typeof result.authentication === 'object') {
    const a = result.authentication as { accessToken?: string; idToken?: string };
    if (typeof a.accessToken === 'string' && a.accessToken) accessToken = a.accessToken;
    if (typeof a.idToken === 'string' && a.idToken) idToken = a.idToken;
  }
  if ('params' in result && result.params && typeof result.params === 'object') {
    const p = result.params as Record<string, unknown>;
    if (!accessToken && typeof p.access_token === 'string') accessToken = p.access_token;
    if (!idToken && typeof p.id_token === 'string') idToken = p.id_token;
  }
  if ('url' in result && typeof (result as { url?: string }).url === 'string') {
    const parsed = parseTokenParamsFromUrl((result as { url: string }).url);
    if (!accessToken && parsed.access_token) accessToken = parsed.access_token;
    if (!idToken && parsed.id_token) idToken = parsed.id_token;
  }

  return { accessToken, idToken };
}

/**
 * Access token (Facebook flux implicit, etc.) : souvent dans le **fragment** `url`
 * (`fbAPPID://authorize#access_token=…`) après Custom Tabs — ne pas s’arrêter à `params` seul.
 */
export function extractOAuthAccessToken(result: AuthSessionResult | null): string | null {
  if (!result || result.type !== 'success') return null;
  if ('authentication' in result && result.authentication?.accessToken) {
    return result.authentication.accessToken;
  }
  if ('params' in result && result.params && typeof result.params.access_token === 'string') {
    return result.params.access_token;
  }
  if ('url' in result && typeof (result as { url?: string }).url === 'string') {
    const parsed = parseTokenParamsFromUrl((result as { url: string }).url);
    if (parsed.access_token) return parsed.access_token;
  }
  return null;
}
