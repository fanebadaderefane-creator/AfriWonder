/**
 * URI de redirection OAuth recommandée par Google pour les apps iOS / Android installées
 * (évite `invalid_request` si seule l’ancienne forme `com.package.name:/oauthredirect` est enregistrée).
 *
 * @see https://developers.google.com/identity/protocols/oauth2/native-app
 */
export function googleNativeReverseClientRedirectUri(googleOAuthClientId: string): string | null {
  const s = String(googleOAuthClientId || '').trim();
  const m = s.match(/^([0-9]+-[a-zA-Z0-9_-]+)\.apps\.googleusercontent\.com$/);
  if (!m?.[1]) return null;
  return `com.googleusercontent.apps.${m[1]}:/oauthredirect`;
}
