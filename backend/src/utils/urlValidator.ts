/**
 * Utilitaire pour valider et rejeter les URLs de domaines externes non autorisés
 * Le projet utilise sa propre base de données et CDN (R2/Cloudflare)
 */

/**
 * Vérifie si une URL est un domaine bloqué (externe non autorisé)
 */
export function isBlockedUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.includes('base44') || url.includes('base44.com');
}

/**
 * Valide une URL et rejette les URLs de domaines non autorisés
 */
export function validateUrl(url: string | null | undefined, fieldName: string = 'URL'): void {
  if (url && isBlockedUrl(url)) {
    const error: any = new Error(
      `URLs non autorisées pour ${fieldName}. Utilisez uniquement les URLs de votre CDN (R2/Cloudflare).`
    );
    error.statusCode = 400;
    throw error;
  }
}

/**
 * Valide un tableau d'URLs
 */
export function validateUrls(urls: string[] | null | undefined, fieldName: string = 'URLs'): void {
  if (!urls || urls.length === 0) return;

  urls.forEach((url, index) => {
    if (isBlockedUrl(url)) {
      const error: any = new Error(
        `URLs non autorisées pour ${fieldName} (index ${index}). Utilisez uniquement les URLs de votre CDN (R2/Cloudflare).`
      );
      error.statusCode = 400;
      throw error;
    }
  });
}

