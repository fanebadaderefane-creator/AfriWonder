/** Accusés de lecture DM — ne marquer « lu » que si le correspondant a ouvert le fil. */

export function extractMessageReadReaderId(data: unknown): string {
  if (!data || typeof data !== 'object') return '';
  const row = data as Record<string, unknown>;
  return String(row.userId || row.user_id || '').trim();
}

/** Vrai quand l’événement socket (lecture / distribution) concerne le correspondant, pas nous. */
export function shouldApplyPeerReceiptEvent(actorUserId: string, currentUserId: string): boolean {
  if (!actorUserId || !currentUserId) return false;
  return actorUserId !== currentUserId;
}

/** @deprecated alias — même logique pour lecture et distribution. */
export const shouldMarkOutgoingAsRead = shouldApplyPeerReceiptEvent;

export function mapApiMessageStatus(raw: unknown): 'read' | 'delivered' | 'sent' | 'failed' | 'sending' {
  const s = String(raw || '').toLowerCase();
  if (s === 'read') return 'read';
  if (s === 'sent') return 'sent';
  if (s === 'failed') return 'failed';
  if (s === 'sending') return 'sending';
  return 'delivered';
}
