export type CallRingPreset = 'incoming' | 'outgoing';

/** Motif « tiiii — silence — tiiii » calqué sur WhatsApp / Instagram. */
export const RING_PULSE_MS: Record<CallRingPreset, { burstMs: number; pauseMs: number }> = {
  /** Destinataire : sonnerie longue (~2 s) puis pause (~2,8 s). */
  incoming: { burstMs: 2000, pauseMs: 2800 },
  /** Appelant : ringback court (~1,2 s) puis pause (~3,5 s). */
  outgoing: { burstMs: 1200, pauseMs: 3500 },
};

export function ringPulseTiming(preset: CallRingPreset): { burstMs: number; pauseMs: number } {
  return { ...RING_PULSE_MS[preset] };
}
