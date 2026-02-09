/**
 * Utilitaire pour valider et rejeter les URLs Base44
 * Le projet utilise sa propre base de données et CDN (R2/Cloudflare)
 * Les URLs Base44 ne sont PAS autorisées
 */

/**
 * Vérifie si une URL contient une référence à Base44
 */
export function isBase44Url(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.includes('base44') || url.includes('base44.com');
}

/**
 * Valide une URL et rejette les URLs Base44
 * @param url - L'URL à valider
 * @param fieldName - Le nom du champ (pour le message d'erreur)
 * @throws Error si l'URL est une URL Base44
 */
export function validateUrl(url: string | null | undefined, fieldName: string = 'URL'): void {
  if (url && isBase44Url(url)) {
    const error: any = new Error(
      `Les URLs Base44 ne sont pas autorisées pour ${fieldName}. Utilisez uniquement les URLs de votre CDN (R2/Cloudflare)`
    );
    error.statusCode = 400;
    throw error;
  }
}

/**
 * Valide un tableau d'URLs
 * @param urls - Le tableau d'URLs à valider
 * @param fieldName - Le nom du champ (pour le message d'erreur)
 * @throws Error si une URL est une URL Base44
 */
export function validateUrls(urls: string[] | null | undefined, fieldName: string = 'URLs'): void {
  if (!urls || urls.length === 0) return;
  
  urls.forEach((url, index) => {
    if (isBase44Url(url)) {
      const error: any = new Error(
        `Les URLs Base44 ne sont pas autorisées pour ${fieldName} (index ${index}). Utilisez uniquement les URLs de votre CDN (R2/Cloudflare)`
      );
      error.statusCode = 400;
      throw error;
    }
  });
}

