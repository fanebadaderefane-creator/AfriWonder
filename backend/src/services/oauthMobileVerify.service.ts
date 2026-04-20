import * as jose from 'jose';

export type GoogleUserProfile = { id: string; email: string; name?: string; picture?: string };
export type FacebookUserProfile = { id: string; email: string; name?: string; picture?: string };
export type AppleUserProfile = { sub: string; email?: string };

export async function fetchGoogleUserFromAccessToken(accessToken: string): Promise<GoogleUserProfile> {
  const r = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken.trim()}` },
  });
  if (!r.ok) {
    const err: Error & { statusCode?: number } = new Error('Token Google invalide ou expiré');
    err.statusCode = 401;
    throw err;
  }
  const j = (await r.json()) as { id?: string; email?: string; name?: string; picture?: string };
  if (!j.id || !j.email) {
    const err: Error & { statusCode?: number } = new Error('Profil Google incomplet (email requis)');
    err.statusCode = 400;
    throw err;
  }
  return { id: j.id, email: j.email, name: j.name, picture: j.picture };
}

export async function fetchFacebookUserFromAccessToken(accessToken: string): Promise<FacebookUserProfile> {
  const url = new URL('https://graph.facebook.com/v18.0/me');
  url.searchParams.set('fields', 'id,name,email,picture.type(large)');
  url.searchParams.set('access_token', accessToken.trim());
  const r = await fetch(url.toString());
  if (!r.ok) {
    const err: Error & { statusCode?: number } = new Error('Token Facebook invalide ou expiré');
    err.statusCode = 401;
    throw err;
  }
  const j = (await r.json()) as {
    id?: string;
    name?: string;
    email?: string;
    picture?: { data?: { url?: string } };
  };
  if (!j.id) {
    const err: Error & { statusCode?: number } = new Error('Profil Facebook incomplet');
    err.statusCode = 400;
    throw err;
  }
  const email = j.email || `${j.id}@facebook.com`;
  return { id: j.id, email, name: j.name, picture: j.picture?.data?.url };
}

const APPLE_JWKS = jose.createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));

/**
 * Vérifie l’`identity_token` Apple (Sign in with Apple).
 * `audiences` : bundle id iOS (`com.afriwonder.app`) et/ou Services ID web si vous le réutilisez.
 */
export async function verifyAppleIdentityToken(
  identityToken: string,
  audiences: string[],
): Promise<AppleUserProfile> {
  const audList = [...new Set(audiences.map((a) => a.trim()).filter(Boolean))];
  if (!audList.length) {
    const err: Error & { statusCode?: number } = new Error(
      'Configuration Apple manquante : définissez APPLE_IOS_CLIENT_ID ou APPLE_CLIENT_ID dans backend/.env',
    );
    err.statusCode = 503;
    throw err;
  }
  try {
    const { payload } = await jose.jwtVerify(identityToken.trim(), APPLE_JWKS, {
      issuer: 'https://appleid.apple.com',
      audience: audList,
    });
    const sub = typeof payload.sub === 'string' ? payload.sub : '';
    if (!sub) {
      const err: Error & { statusCode?: number } = new Error('Jeton Apple invalide');
      err.statusCode = 401;
      throw err;
    }
    const email = typeof payload.email === 'string' ? payload.email : undefined;
    return { sub, email };
  } catch (e: unknown) {
    if (e && typeof e === 'object' && 'statusCode' in e) throw e;
    const err: Error & { statusCode?: number } = new Error('Jeton Apple invalide ou expiré');
    err.statusCode = 401;
    throw err;
  }
}

/** Email technique unique si Apple ne renvoie pas d’email (connexions suivantes). */
export function syntheticAppleEmail(sub: string): string {
  const safe = sub.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `apple_${safe}@signin.afriwonder.invalid`;
}
