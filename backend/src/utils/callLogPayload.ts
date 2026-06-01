/** Métadonnées JSON persistées dans Message.content pour type = call. */
export type CallLogOutcome = 'completed' | 'missed' | 'declined' | 'cancelled';

export type CallLogContentV1 = {
  v: 1;
  callId: string;
  media: 'audio' | 'video';
  outcome: CallLogOutcome;
  callerId: string;
  receiverId: string;
  durationSec: number;
  startedAt: string | null;
  endedAt: string | null;
};

export function buildCallLogContent(input: Omit<CallLogContentV1, 'v'>): string {
  const payload: CallLogContentV1 = { v: 1, ...input };
  return JSON.stringify(payload);
}

export function parseCallLogContent(raw: string | null | undefined): CallLogContentV1 | null {
  if (!raw || typeof raw !== 'string') return null;
  try {
    const o = JSON.parse(raw) as Partial<CallLogContentV1>;
    if (o.v !== 1 || !o.callId || !o.outcome || !o.callerId || !o.receiverId) return null;
    return {
      v: 1,
      callId: String(o.callId),
      media: o.media === 'video' ? 'video' : 'audio',
      outcome: o.outcome as CallLogOutcome,
      callerId: String(o.callerId),
      receiverId: String(o.receiverId),
      durationSec: Math.max(0, Number(o.durationSec) || 0),
      startedAt: o.startedAt ? String(o.startedAt) : null,
      endedAt: o.endedAt ? String(o.endedAt) : null,
    };
  } catch {
    return null;
  }
}

export function callLogPreviewLabel(outcome: CallLogOutcome, media: 'audio' | 'video'): string {
  const kind = media === 'video' ? 'Appel vidéo' : 'Appel audio';
  switch (outcome) {
    case 'completed':
      return kind;
    case 'missed':
      return `${kind} manqué`;
    case 'declined':
      return `${kind} refusé`;
    case 'cancelled':
      return `${kind} annulé`;
    default:
      return kind;
  }
}
