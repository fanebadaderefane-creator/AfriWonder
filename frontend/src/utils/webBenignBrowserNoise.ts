/**
 * Messages navigateur fréquents en dev (vidéo/audio) — pas des bugs applicatifs.
 * Utilisé par `polyfills.ts` pour éviter LogBox / doubles logs « Uncaught Error ».
 */

function messageFromUnknown(raw: unknown): string {
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'object' && raw !== null && 'message' in raw) {
    return String((raw as Error).message ?? '');
  }
  return String(raw ?? '');
}

/** Apostrophe typographique dans certains messages DOM (Safari, etc.). */
export function normalizeWebErrorText(s: string): string {
  return s.replace(/\u2019/g, "'");
}

/** Erreur MIME / decode navigateur quand la source n’est pas une vidéo lisible (souvent corrigée côté UI). */
export function isBenignMediaNotSuitable(raw: unknown): boolean {
  const name =
    typeof raw === 'object' && raw !== null && 'name' in raw
      ? String((raw as { name?: string }).name ?? '')
      : '';
  const text = normalizeWebErrorText(messageFromUnknown(raw)).toLowerCase();
  if (
    name === 'NotSupportedError' &&
    (text.includes('not suitable') ||
      text.includes('media resource') ||
      text.includes('media_err') ||
      text.includes('could not decode') ||
      text.includes('pipe'))
  ) {
    return true;
  }
  return (
    text.includes('was not suitable') ||
    (text.includes('not suitable') && text.includes('media resource')) ||
    text.includes('media_err_src_not_supported')
  );
}

/** Abort chargement média (changement de src, démontage, navigation). */
export function isBenignMediaResourceAbort(raw: unknown): boolean {
  const name =
    typeof raw === 'object' && raw !== null && 'name' in raw
      ? String((raw as { name?: string }).name ?? '')
      : '';
  const text = normalizeWebErrorText(messageFromUnknown(raw)).toLowerCase();
  if (name === 'AbortError' && (text.includes('media') || text.includes('video') || text.includes('fetch'))) {
    return true;
  }
  if (
    text.includes('fetching process') &&
    text.includes('media resource') &&
    (text.includes('abort') || text.includes('aborted'))
  ) {
    return true;
  }
  return (
    text.includes('media resource was aborted') ||
    text.includes('fetching process for the media resource was aborted') ||
    (text.includes('user agent') && text.includes('media') && text.includes('abort'))
  );
}

/** Réduit le bruit console / LogBox pour erreurs média attendues en dev web. */
export function isBenignMediaConsoleNoise(raw: unknown): boolean {
  return isBenignMediaResourceAbort(raw) || isBenignMediaNotSuitable(raw);
}
