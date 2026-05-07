/**
 * Messages affichés aux utilisateurs (jamais de nom de fournisseur technique type SDK).
 * Si le texte est déjà en français « produit », on le garde ; sinon on masque le jargon.
 */

export function userFacingLiveVideoError(raw: string | null | undefined): string {
  const s = String(raw || '').trim();
  if (!s) return 'Connexion vidéo en cours…';
  const low = s.toLowerCase();
  if (low.includes('agora') || /\bapp_id\b|\bcertificate\b/i.test(low)) {
    return 'Connexion vidéo impossible. Vérifiez votre connexion ou réessayez dans quelques secondes.';
  }
  if (low.includes('rtc') || low.includes('webrtc')) {
    return 'Erreur de diffusion. Réessayez ou redémarrez l’application.';
  }
  return s;
}
