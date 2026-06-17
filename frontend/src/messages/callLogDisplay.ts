/** Affichage fil DM — messages type `call` (JSON v1 dans content), style WhatsApp. */

export type CallLogOutcome = 'incoming' | 'completed' | 'missed' | 'declined' | 'cancelled';

export type CallLogMeta = {
  callId: string;
  media: 'audio' | 'video';
  outcome: CallLogOutcome;
  callerId: string;
  receiverId: string;
  durationSec: number;
  startedAt: string | null;
  endedAt: string | null;
};

export function parseCallLogContent(raw: string): CallLogMeta | null {
  if (!raw?.trim()) return null;
  try {
    const o = JSON.parse(raw) as Partial<CallLogMeta & { v?: number }>;
    if (o.v !== 1 || !o.callId || !o.outcome) return null;
    return {
      callId: String(o.callId),
      media: o.media === 'video' ? 'video' : 'audio',
      outcome: o.outcome as CallLogOutcome,
      callerId: String(o.callerId || ''),
      receiverId: String(o.receiverId || ''),
      durationSec: Math.max(0, Number(o.durationSec) || 0),
      startedAt: o.startedAt ? String(o.startedAt) : null,
      endedAt: o.endedAt ? String(o.endedAt) : null,
    };
  } catch {
    return null;
  }
}

function callKindLabel(media: 'audio' | 'video'): string {
  return media === 'video' ? 'Appel vidéo' : 'Appel vocal';
}

/**
 * Durée style WhatsApp FR — « 45 s », « 2 min », « 1 h et 27 min » (pas « 507 min 4 s »).
 */
export function formatCallDurationFr(sec: number): string {
  const total = Math.max(0, Math.floor(Number(sec) || 0));
  if (total < 1) return '';
  if (total < 60) return total === 1 ? '1 s' : `${total} s`;

  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);

  if (h > 0) {
    if (m <= 0) return h === 1 ? '1 h' : `${h} h`;
    return h === 1 ? `1 h et ${m} min` : `${h} h et ${m} min`;
  }

  return m === 1 ? '1 min' : `${m} min`;
}

/** Aperçu inbox pour un message type `call`. */
export function callLogInboxPreview(content: string, viewerUserId: string): string {
  const meta = parseCallLogContent(content);
  if (!meta) return 'Appel';
  const title = formatCallLogTitle(meta, viewerUserId);
  const sub = formatCallLogSubtitle(meta, viewerUserId);
  return sub ? `${title} · ${sub}` : title;
}

/** Bulle à droite (sortant) ou à gauche (reçu / manqué) — comme WhatsApp. */
export function callLogBubbleIsMine(meta: CallLogMeta, viewerUserId: string): boolean {
  return viewerUserId === meta.callerId;
}

/** Appel manqué côté destinataire (bulle gauche + icône rouge). */
export function callLogIsMissedForViewer(meta: CallLogMeta, viewerUserId: string): boolean {
  const isReceiver = viewerUserId === meta.receiverId;
  if (!isReceiver) return false;
  return meta.outcome === 'missed' || meta.outcome === 'cancelled';
}

/** Titre rouge (appel manqué côté destinataire). */
export function callLogTitleIsAlert(meta: CallLogMeta, viewerUserId: string): boolean {
  return callLogIsMissedForViewer(meta, viewerUserId);
}

/** Direction de la petite flèche sur l’icône (style WhatsApp). */
export function callLogIconDirection(
  meta: CallLogMeta,
  viewerUserId: string,
): 'outgoing' | 'incoming' | 'missed' {
  if (callLogIsMissedForViewer(meta, viewerUserId)) return 'missed';
  if (callLogBubbleIsMine(meta, viewerUserId)) return 'outgoing';
  return 'incoming';
}

/** Touche pour relancer un appel (appels manqués / annulés côté destinataire). */
export function callLogCanCallBack(meta: CallLogMeta, viewerUserId: string): boolean {
  return callLogIsMissedForViewer(meta, viewerUserId);
}

/** Titre principal dans la bulle (ex. « Appel vocal », « Appel vocal manqué »). */
export function formatCallLogTitle(meta: CallLogMeta, viewerUserId: string): string {
  const kind = callKindLabel(meta.media);
  if (callLogIsMissedForViewer(meta, viewerUserId)) {
    return meta.media === 'video' ? 'Appel vidéo manqué' : 'Appel vocal manqué';
  }
  if (meta.outcome === 'declined') {
    return viewerUserId === meta.callerId ? `${kind} refusé` : kind;
  }
  return kind;
}

/** Sous-titre (durée, « Cliquez pour rappeler », etc.). */
export function formatCallLogSubtitle(meta: CallLogMeta, viewerUserId: string): string {
  if (callLogIsMissedForViewer(meta, viewerUserId)) {
    return '';
  }
  if (meta.outcome === 'completed' && meta.durationSec > 0) {
    return formatCallDurationFr(meta.durationSec);
  }
  if (meta.outcome === 'missed' && viewerUserId === meta.callerId) {
    return 'Sans réponse';
  }
  if (meta.outcome === 'cancelled' && viewerUserId === meta.callerId) {
    return 'Annulé';
  }
  if (meta.outcome === 'declined' && viewerUserId === meta.callerId) {
    return 'Refusé';
  }
  if (meta.outcome === 'incoming' && viewerUserId === meta.receiverId) {
    return 'Appel entrant…';
  }
  if (meta.outcome === 'incoming' && viewerUserId === meta.callerId) {
    return 'Sonnerie…';
  }
  return '';
}

/** Touche sur la bulle → relancer le même type d’appel (comme WhatsApp). */
export function callLogTapToRedial(_meta: CallLogMeta, _viewerUserId: string): boolean {
  return true;
}

export function callLogIconName(
  meta: CallLogMeta,
  viewerUserId: string,
): 'call' | 'videocam' | 'call-outline' | 'arrow-redo' {
  if (meta.media === 'video') return 'videocam';
  if (callLogIsMissedForViewer(meta, viewerUserId)) return 'call-outline';
  if (callLogBubbleIsMine(meta, viewerUserId)) return 'arrow-redo';
  return 'call';
}

/** Couleur de l’icône téléphone dans la bulle. */
export function callLogTint(meta: CallLogMeta, viewerUserId: string): string {
  if (callLogIsMissedForViewer(meta, viewerUserId)) return '#F15C6D';
  if (meta.outcome === 'declined') return '#F15C6D';
  return 'rgba(255,255,255,0.85)';
}
