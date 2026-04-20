import type { AuthSessionResult } from 'expo-auth-session';

/** Access token après échange (Google) ou flux implicit (Facebook). */
export function extractOAuthAccessToken(result: AuthSessionResult | null): string | null {
  if (!result || result.type !== 'success') return null;
  if ('authentication' in result && result.authentication?.accessToken) {
    return result.authentication.accessToken;
  }
  if ('params' in result && result.params && typeof result.params.access_token === 'string') {
    return result.params.access_token;
  }
  return null;
}
