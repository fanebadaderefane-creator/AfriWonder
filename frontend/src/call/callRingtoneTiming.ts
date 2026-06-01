export type CallRingPreset = 'incoming' | 'outgoing';

/** Motif « tiiii — silence — tiiii » (style WhatsApp). */
export const RING_PULSE_MS: Record<CallRingPreset, { burstMs: number; pauseMs: number }> = {
  incoming: { burstMs: 1100, pauseMs: 2600 },
  outgoing: { burstMs: 1200, pauseMs: 2800 },
};

export function ringPulseTiming(preset: CallRingPreset): { burstMs: number; pauseMs: number } {
  return { ...RING_PULSE_MS[preset] };
}
