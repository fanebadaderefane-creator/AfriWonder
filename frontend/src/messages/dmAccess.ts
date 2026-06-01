import { Alert } from 'react-native';
import axios, { type AxiosError } from 'axios';
import { getUserFacingApiErrorMessage } from '../utils/userFacingError';

export type DmAccessDenialKind = 'friends_required' | 'no_one' | 'blocked' | 'unknown';

export type DmAccessPeerContext = {
  peerName?: string;
  /** Je suis dans le Wonder de cette personne */
  isFollowing?: boolean;
  /** Cette personne est dans mon Wonder */
  isFollowingMe?: boolean;
};

function extractServerMessage(error: unknown): string {
  if (!axios.isAxiosError(error)) return '';
  const data = error.response?.data as Record<string, unknown> | undefined;
  if (data && typeof data.error === 'object' && data.error !== null && 'message' in data.error) {
    return String((data.error as { message?: unknown }).message ?? '').trim();
  }
  if (data && typeof data.error === 'string') return data.error.trim();
  if (data && typeof data.message === 'string') return data.message.trim();
  return '';
}

/** Déduit la raison d’un refus MP (403) à partir de la réponse API. */
export function parseDmAccessDenial(error: unknown): DmAccessDenialKind {
  if (!axios.isAxiosError(error) || error.response?.status !== 403) return 'unknown';
  const msg = extractServerMessage(error).toLowerCase();
  if (msg.includes('amis') || msg.includes('friends') || msg.includes('mutual')) {
    return 'friends_required';
  }
  if (msg.includes("n'accepte pas") || msg.includes('no_one') || msg.includes('pas les messages')) {
    return 'no_one';
  }
  if (msg.includes('bloqu') || msg.includes('block')) return 'blocked';
  return 'unknown';
}

export function getDmAccessDeniedTitle(kind: DmAccessDenialKind): string {
  switch (kind) {
    case 'friends_required':
      return 'Wonder mutuel requis';
    case 'no_one':
      return 'Messages désactivés';
    case 'blocked':
      return 'Message impossible';
    default:
      return 'Message impossible';
  }
}

export function getDmAccessDeniedMessage(kind: DmAccessDenialKind, ctx: DmAccessPeerContext = {}): string {
  const name = (ctx.peerName || 'cette personne').trim() || 'cette personne';
  if (kind === 'no_one') {
    return `${name} n'accepte pas les messages privés pour le moment.`;
  }
  if (kind === 'blocked') {
    return `Vous ne pouvez pas envoyer de message à ${name}.`;
  }
  if (kind === 'friends_required') {
    if (ctx.isFollowing && !ctx.isFollowingMe) {
      return `Vous suivez déjà ${name}. Pour échanger en privé, demandez-lui d'ouvrir votre profil et d'appuyer sur Wonder.`;
    }
    if (!ctx.isFollowing && ctx.isFollowingMe) {
      return `${name} vous suit déjà. Appuyez sur Wonder sur son profil pour devenir amis et envoyer des messages.`;
    }
    if (!ctx.isFollowing) {
      return `Pour envoyer un message à ${name}, devenez amis : appuyez sur Wonder, puis demandez-lui de vous suivre en retour.`;
    }
    return `Pour envoyer un message à ${name}, vous devez vous suivre mutuellement (Wonder des deux côtés).`;
  }
  return getUserFacingApiErrorMessage(errorFromKind(kind));
}

function errorFromKind(_kind: DmAccessDenialKind): unknown {
  return new Error('Action non autorisée.');
}

export type AlertDmAccessDeniedOptions = DmAccessPeerContext & {
  error: unknown;
  onPressWonder?: () => void;
};

/** Alerte explicite quand l’ouverture ou l’envoi d’un MP est refusé. */
export function alertDmAccessDenied(options: AlertDmAccessDeniedOptions): void {
  const kind = parseDmAccessDenial(options.error);
  const title = getDmAccessDeniedTitle(kind);
  const message =
    kind === 'unknown'
      ? getUserFacingApiErrorMessage(options.error)
      : getDmAccessDeniedMessage(kind, options);

  const canWonder =
    kind === 'friends_required' && typeof options.onPressWonder === 'function' && !options.isFollowing;

  if (canWonder) {
    Alert.alert(title, message, [
      { text: 'Plus tard', style: 'cancel' },
      { text: 'Wonder', onPress: options.onPressWonder },
    ]);
    return;
  }

  Alert.alert(title, message, [{ text: 'OK' }]);
}

export function isDmAccessDeniedError(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 403 && parseDmAccessDenial(error) !== 'unknown';
}

/** Alerte après échec d’envoi d’un message (chat ou pendant un appel). */
export function showMessageSendError(error: unknown, ctx: DmAccessPeerContext = {}): void {
  if (isDmAccessDeniedError(error)) {
    alertDmAccessDenied({ error, ...ctx });
    return;
  }
  Alert.alert('Message', getUserFacingApiErrorMessage(error));
}
