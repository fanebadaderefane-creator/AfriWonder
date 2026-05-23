import axios, { type AxiosError } from 'axios';

/** Directive opérationnelle — jamais afficher de jargon technique à l'utilisateur final. */
export const USER_FACING_GENERIC = 'Une erreur est survenue. Réessayez.';
export const USER_FACING_NETWORK = 'Vérifiez votre connexion internet.';
export const USER_FACING_TIMEOUT =
  'La requête a pris trop de temps. Vérifiez votre connexion et réessayez.';

/**
 * Heuristique : chaîne probablement technique (stack, codes HTTP bruts, Prisma, etc.).
 */
export function looksLikeTechnicalErrorMessage(message: string): boolean {
  const m = message.trim();
  if (m.length < 3) return false;
  return (
    /^(error|err_|undefined|null)$/i.test(m) ||
    /exception|stack trace|ECONN|ETIMEDOUT|ENOTFOUND|socket hang|axioserror|referenceerror|typeerror|syntaxerror|minified react error/i.test(
      m
    ) ||
    /prisma|postgres|sqlstate|mongodb|internal server|at\s+\w+|\.tsx?:\d+|\bP20\d{2}\b/i.test(m) ||
    (/\b(408|502|503|504)\b/.test(m) && /http|status|timeout|request/i.test(m)) ||
    /handlererror|failed to|cannot read prop|is not a function/i.test(m)
  );
}

/**
 * Message prêt à afficher (Alert, Toast) à partir d'une erreur API / réseau.
 */
export function getUserFacingApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const ax = error as AxiosError<{ error?: { message?: string } | string; message?: string; detail?: string }>;
    const code = ax.code;
    const msgLower = String(ax.message || '').toLowerCase();
    if (code === 'ECONNABORTED' || msgLower.includes('timeout')) {
      return USER_FACING_TIMEOUT;
    }
    if (!ax.response) {
      if (/network error|network request failed/i.test(msgLower)) return USER_FACING_NETWORK;
      return USER_FACING_NETWORK;
    }
    const status = ax.response.status;
    if (status === 408 || status === 504) {
      return 'La connexion est trop lente ou interrompue. Réessayez.';
    }
    if (status >= 500) {
      return 'Le service est momentanément indisponible. Réessayez dans quelques instants.';
    }
    const data = ax.response.data as Record<string, unknown> | undefined;
    let serverMsg: string | undefined;
    if (data && typeof data.error === 'object' && data.error !== null && 'message' in data.error) {
      serverMsg = String((data.error as { message?: unknown }).message ?? '').trim();
    } else if (data && typeof data.error === 'string') {
      serverMsg = data.error.trim();
    } else if (data && typeof data.message === 'string') {
      serverMsg = data.message.trim();
    } else if (data && typeof data.detail === 'string') {
      serverMsg = data.detail.trim();
    }
    if (serverMsg && serverMsg.length >= 3) {
      const slice = serverMsg.slice(0, 400);
      if (looksLikeTechnicalErrorMessage(slice)) return USER_FACING_GENERIC;
      return slice;
    }
    if (status === 401) return 'Session expirée. Reconnectez-vous.';
    if (status === 403) return 'Action non autorisée.';
    if (status === 404) return 'Contenu introuvable.';
    return USER_FACING_GENERIC;
  }
  if (error instanceof Error) {
    const m = error.message || '';
    if (/network request failed|network error/i.test(m)) return USER_FACING_NETWORK;
    if (looksLikeTechnicalErrorMessage(m)) return USER_FACING_GENERIC;
    return (m.trim().slice(0, 400) || USER_FACING_GENERIC);
  }
  return USER_FACING_GENERIC;
}

/**
 * Attache le message sur l'erreur Axios pour les écrans qui lisent `err.userFacingMessage`.
 */
export function attachUserFacingApiError(error: unknown): string {
  const msg = getUserFacingApiErrorMessage(error);
  if (axios.isAxiosError(error)) {
    (error as AxiosError).userFacingMessage = msg;
  }
  return msg;
}

/**
 * Texte d’Alert après un `catch` : préfère le message déjà calculé par l’intercepteur Axios.
 */
export function getAlertMessageForCaughtError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const uf = (error as AxiosError).userFacingMessage;
    if (typeof uf === 'string' && uf.trim().length >= 3) return uf.trim();
  }
  return getUserFacingApiErrorMessage(error);
}
