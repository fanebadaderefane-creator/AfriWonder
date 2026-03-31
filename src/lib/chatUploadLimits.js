/**
 * Limites d’upload messagerie — alignées par défaut sur le backend
 * (`UPLOAD_MAX_MEDIA_MB`, `UPLOAD_MAX_DOCUMENT_MB` dans upload.routes.ts).
 * Optionnel : surcharger côté client avec VITE_UPLOAD_MAX_MEDIA_MB / VITE_UPLOAD_MAX_DOCUMENT_MB
 * pour afficher le même plafond que la prod si tu changes les variables serveur.
 */

const BYTES_PER_MB = 1024 * 1024;
const HARD_CAP_MB = 2048;

function parseClientMb(envKey, defaultMb) {
  if (typeof import.meta === 'undefined' || !import.meta.env?.[envKey]) return defaultMb;
  const n = Number(import.meta.env[envKey]);
  if (!Number.isFinite(n) || n < 1) return defaultMb;
  return Math.min(Math.round(n), HARD_CAP_MB);
}

/** Taille max photos / vidéos / audio vocaux (Mo), défaut 600 comme le backend. */
export function getMaxMediaMb() {
  return parseClientMb('VITE_UPLOAD_MAX_MEDIA_MB', 600);
}

/** Taille max documents messagerie (Mo), défaut 300 comme le backend. */
export function getMaxDocumentMb() {
  return parseClientMb('VITE_UPLOAD_MAX_DOCUMENT_MB', 300);
}

export function getMaxMediaBytes() {
  return getMaxMediaMb() * BYTES_PER_MB;
}

export function getMaxDocumentBytes() {
  return getMaxDocumentMb() * BYTES_PER_MB;
}

/**
 * @param {File|Blob} file
 * @returns {{ ok: true } | { ok: false, maxMb: number }}
 */
export function assertChatMediaFile(file) {
  const size = file?.size ?? 0;
  if (!size) return { ok: true };
  const max = getMaxMediaBytes();
  if (size > max) return { ok: false, maxMb: getMaxMediaMb() };
  return { ok: true };
}

/**
 * @param {File|Blob} file
 * @returns {{ ok: true } | { ok: false, maxMb: number }}
 */
export function assertChatDocumentFile(file) {
  const size = file?.size ?? 0;
  if (!size) return { ok: true };
  const max = getMaxDocumentBytes();
  if (size > max) return { ok: false, maxMb: getMaxDocumentMb() };
  return { ok: true };
}

/** Détecte une réponse type « fichier trop gros » (multer / proxy). */
export function isPayloadTooLargeError(err) {
  const status = err?.response?.status;
  if (status === 413) return true;
  const msg = String(err?.response?.data?.message ?? err?.response?.data?.error?.message ?? err?.message ?? '');
  if (/too large|file too big|request entity too large|limit.*size|LIMIT_FILE_SIZE/i.test(msg)) return true;
  const code = err?.response?.data?.error?.code;
  if (code === 'LIMIT_FILE_SIZE' || code === 'PAYLOAD_TOO_LARGE') return true;
  return false;
}
