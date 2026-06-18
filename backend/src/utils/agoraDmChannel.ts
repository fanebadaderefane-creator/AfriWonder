/**
 * Nom de canal Agora RTC pour appels DM 1:1 (communication profile).
 * Contraintes Agora : [a-zA-Z0-9 _!#$%&()+\-:;<=.>?@]{1,64}
 */
export function agoraDmChannelFromCallId(callId: string): string {
  const raw = String(callId || '').trim();
  const safe = raw.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 48);
  const base = safe || `dm_${Date.now()}`;
  return `dm_${base}`.slice(0, 64);
}
