import * as jose from 'jose';

const GOOGLE_OAUTH_JWKS = jose.createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));

/** Audiences `aud` acceptées pour les `id_token` Google (Web + Android + iOS), séparées par des virgules. */
export function resolveGoogleOAuthAudiences(): string[] {
  const extra = String(process.env.GOOGLE_OAUTH_AUDIENCES || '')
    .split(',')
    .map((s) => s.trim().replace(/^["']|["']$/g, ''))
    .filter(Boolean);
  if (extra.length) return [...new Set(extra)];
  const web = String(process.env.GOOGLE_CLIENT_ID || '')
    .trim()
    .replace(/^["']|["']$/g, '');
  return web ? [web] : [];
}

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

/**
 * Mobile / PKCE : Google renvoie souvent un `id_token` (OpenID) — à vérifier serveur (signature + `aud`),
 * comme pour Apple. Évite de dépendre uniquement de l’échange `access_token` + userinfo lorsque le retour
 * d’app (Custom Tabs) ne restitue que le fragment avec `id_token`.
 */
export async function verifyGoogleIdToken(idToken: string): Promise<GoogleUserProfile> {
  const audiences = resolveGoogleOAuthAudiences();
  if (!audiences.length) {
    const err: Error & { statusCode?: number } = new Error(
      'Configuration Google manquante : définissez GOOGLE_CLIENT_ID ou GOOGLE_OAUTH_AUDIENCES (IDs Web / Android / iOS) dans backend/.env',
    );
    err.statusCode = 503;
    throw err;
  }
  try {
    const { payload } = await jose.jwtVerify(idToken.trim(), GOOGLE_OAUTH_JWKS, {
      issuer: ['https://accounts.google.com', 'accounts.google.com'],
      audience: audiences,
    });
    const sub = typeof payload.sub === 'string' ? payload.sub : '';
    const email = typeof payload.email === 'string' ? payload.email : '';
    if (payload.email_verified === false) {
      const err: Error & { statusCode?: number } = new Error('E-mail Google non vérifié');
      err.statusCode = 400;
      throw err;
    }
    if (!sub || !email) {
      const err: Error & { statusCode?: number } = new Error('Jeton Google incomplet (sub / email requis)');
      err.statusCode = 400;
      throw err;
    }
    return {
      id: sub,
      email,
      name: typeof payload.name === 'string' ? payload.name : undefined,
      picture: typeof payload.picture === 'string' ? payload.picture : undefined,
    };
  } catch (e: unknown) {
    if (e && typeof e === 'object' && 'statusCode' in e) throw e;
    const err: Error & { statusCode?: number } = new Error('Jeton Google invalide ou expiré');
    err.statusCode = 401;
    throw err;
  }
}

/**
 * Vérifie auprès de Meta que le jeton utilisateur est valide et émis pour notre application
 * (`debug_token`). En production, FACEBOOK_APP_ID + FACEBOOK_APP_SECRET sont requis.
 */
export async function assertFacebookUserTokenForOurApp(userAccessToken: string): Promise<void> {
  const appId = String(process.env.FACEBOOK_APP_ID || '')
    .trim()
    .replace(/^["']|["']$/g, '');
  const secret = String(process.env.FACEBOOK_APP_SECRET || '')
    .trim()
    .replace(/^["']|["']$/g, '');
  if (!appId || !secret) {
    if (process.env.NODE_ENV === 'production') {
      const err: Error & { statusCode?: number } = new Error(
        'Configuration Facebook incomplète : FACEBOOK_APP_ID et FACEBOOK_APP_SECRET sont requis en production pour valider les jetons',
      );
      err.statusCode = 503;
      throw err;
    }
    return;
  }
  const debugUrl = new URL('https://graph.facebook.com/v18.0/debug_token');
  debugUrl.searchParams.set('input_token', userAccessToken.trim());
  debugUrl.searchParams.set('access_token', `${appId}|${secret}`);
  const dr = await fetch(debugUrl.toString());
  const dj = (await dr.json()) as {
    data?: { is_valid?: boolean; app_id?: string | number };
    error?: { message?: string };
  };
  if (dj.error) {
    const err: Error & { statusCode?: number } = new Error('Impossible de valider le jeton Facebook');
    err.statusCode = 401;
    throw err;
  }
  const valid = dj.data?.is_valid === true;
  const tokenApp = dj.data?.app_id != null ? String(dj.data.app_id) : '';
  if (!valid || tokenApp !== String(appId)) {
    const err: Error & { statusCode?: number } = new Error(
      'Jeton Facebook invalide ou non émis pour cette application',
    );
    err.statusCode = 401;
    throw err;
  }
}

export async function fetchFacebookUserFromAccessToken(accessToken: string): Promise<FacebookUserProfile> {
  await assertFacebookUserTokenForOurApp(accessToken);
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
