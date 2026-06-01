/** Affichage fil DM — messages type `call` (JSON v1 dans content). */

export type CallLogOutcome = 'completed' | 'missed' | 'declined' | 'cancelled';

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

export function formatCallDurationFr(sec: number): string {
  if (!sec || sec < 1) return '';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m <= 0) return `${s} s`;
  if (s === 0) return `${m} min`;
  return `${m} min ${s} s`;
}

/** Libellé principal centré dans le fil (perspective utilisateur courant). */
export function formatCallLogTitle(meta: CallLogMeta, viewerUserId: string): string {
  const isCaller = viewerUserId === meta.callerId;
  const kind = meta.media === 'video' ? 'Appel vidéo' : 'Appel audio';

  if (meta.outcome === 'completed') {
    return isCaller ? 'Appel sortant' : 'Appel entrant';
  }
  if (meta.outcome === 'missed') {
    return isCaller ? 'Appel manqué' : 'Appel manqué';
  }
  if (meta.outcome === 'declined') {
    return isCaller ? 'Appel refusé' : 'Appel refusé';
  }
  if (meta.outcome === 'cancelled') {
    return isCaller ? 'Appel annulé' : 'Appel manqué';
  }
  return kind;
}

export function formatCallLogSubtitle(meta: CallLogMeta, createdAtIso: string): string {
  const when = new Date(createdAtIso);
  const date = when.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  const time = when.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const dur =
    meta.outcome === 'completed' && meta.durationSec > 0
      ? formatCallDurationFr(meta.durationSec)
      : '';
  return dur ? `${date} · ${time} · ${dur}` : `${date} · ${time}`;
}

export function callLogIconName(meta: CallLogMeta): 'call' | 'videocam' | 'call-outline' {
  if (meta.media === 'video') return 'videocam';
  if (meta.outcome === 'missed' || meta.outcome === 'cancelled') return 'call-outline';
  return 'call';
}

export function callLogTint(meta: CallLogMeta): string {
  if (meta.outcome === 'missed' || meta.outcome === 'declined' || meta.outcome === 'cancelled') {
    return '#EF4444';
  }
  if (meta.outcome === 'completed') return '#10B981';
  return '#94A3B8';
}
