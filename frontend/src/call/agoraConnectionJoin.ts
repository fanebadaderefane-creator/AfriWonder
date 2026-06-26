/**
 * Helpers join canal Agora — callbacks SDK parfois absents après preview adopté (juin 2026).
 */

/** `ConnectionStateTypeConnected` (react-native-agora 4.x). */
export const AGORA_CONNECTION_STATE_CONNECTED = 3;

export function isAgoraConnectionStateJoined(state: number): boolean {
  return state === AGORA_CONNECTION_STATE_CONNECTED;
}

/** `joinChannel` retourne 0 si la demande est acceptée (succès async via callback). */
export function isAgoraJoinChannelReturnOk(code: unknown): boolean {
  if (code === undefined || code === null) return true;
  const n = Number(code);
  return Number.isFinite(n) && n === 0;
}

export function agoraJoinChannelErrorMessage(code: unknown): string {
  const n = Number(code);
  if (!Number.isFinite(n) || n === 0) return 'Impossible de rejoindre le canal Agora.';
  return `Connexion média refusée (code ${n}). Réessayez.`;
}
