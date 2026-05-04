/**
 * Parser pur pour les QR codes AfriWonder. Sépare la logique de routing du
 * composant `<ProfileQrScreen />` pour la rendre testable sans charger la lib
 * native de scan.
 */

export type AfriWonderQrAction =
  | { kind: 'open_user_by_id'; id: string }
  | { kind: 'open_user_by_handle'; handle: string }
  | { kind: 'unknown'; raw: string };

const APP_LINK_REGEX = /afriwonder:\/\/user\/([A-Za-z0-9-_]+)/i;
const WEB_USER_REGEX = /\/user\/([A-Za-z0-9_.-]+)(?:[/?#]|$)/i;
const PROFILE_PARAM_REGEX = /_userId=([A-Za-z0-9-_]+)/i;

const MAX_RAW_LEN = 4096;

export function parseAfriWonderQrCode(raw: unknown): AfriWonderQrAction {
  if (typeof raw !== 'string') return { kind: 'unknown', raw: '' };
  const trimmed = raw.trim().slice(0, MAX_RAW_LEN);
  if (!trimmed) return { kind: 'unknown', raw: '' };

  const matchApp = trimmed.match(APP_LINK_REGEX);
  if (matchApp) return { kind: 'open_user_by_id', id: matchApp[1] };

  const matchProfile = trimmed.match(PROFILE_PARAM_REGEX);
  if (matchProfile) return { kind: 'open_user_by_id', id: matchProfile[1] };

  const matchWeb = trimmed.match(WEB_USER_REGEX);
  if (matchWeb) return { kind: 'open_user_by_handle', handle: matchWeb[1] };

  return { kind: 'unknown', raw: trimmed };
}

/**
 * Indique si le QR est exploitable (ouvre quelque chose dans l'app).
 */
export function isActionableQrCode(action: AfriWonderQrAction): boolean {
  return action.kind === 'open_user_by_id' || action.kind === 'open_user_by_handle';
}
