export function createPageUrl(pageName: string) {
    return '/' + pageName.replace(/ /g, '-');
}

/**
 * ⚠️ DÉSACTIVÉ - NE PAS UTILISER POUR LES RESSOURCES CDN
 * 
 * Cette fonction était utilisée pour "corriger" l'encodage des URLs,
 * mais elle créait un mismatch entre l'URL demandée et le fichier réel sur le CDN.
 * 
 * ❌ PROBLÈME : Un CDN fonctionne avec des noms de fichiers fixes.
 * Si le fichier s'appelle "Les soninkÃ©.mp4", alors c'est EXACTEMENT cette URL
 * qu'il faut utiliser. "Corriger" l'URL crée une URL vers un fichier inexistant.
 * 
 * ✅ SOLUTION : Corriger le nom du fichier à la source (backend/upload),
 * pas l'URL côté client.
 * 
 * Cette fonction est maintenant une NO-OP pour éviter tout usage accidentel.
 * 
 * @deprecated Ne pas utiliser pour les URLs de ressources CDN (vidéos, images, audio)
 * @param url - L'URL originale (retournée telle quelle)
 * @returns L'URL originale sans modification
 */
export function fixUrlEncoding(url: string): string {
  // NO-OP : retourner l'URL telle quelle
  // Le problème doit être résolu à la source (backend/upload), pas ici
  return url;
}

/**
 * Valide qu'une URL n'est pas un domaine externe non autorisé
 * Le projet utilise sa propre base de données et CDN (R2/Cloudflare)
 */
export function validateUrl(url: string | null | undefined, fieldName: string = 'URL'): void {
  if (!url) return;
  
  if (url.includes('base44') || url.includes('base44.com')) {
    throw new Error(
      `URLs non autorisées pour ${fieldName}. Utilisez uniquement les URLs de votre CDN (R2/Cloudflare).`
    );
  }
}

/**
 * Valide un tableau d'URLs
 */
export function validateUrls(urls: string[] | null | undefined, fieldName: string = 'URLs'): void {
  if (!urls || urls.length === 0) return;
  
  urls.forEach((url, index) => {
    if (url && (url.includes('base44') || url.includes('base44.com'))) {
      throw new Error(
        `URLs non autorisées pour ${fieldName} (index ${index}). Utilisez uniquement les URLs de votre CDN (R2/Cloudflare).`
      );
    }
  });
}