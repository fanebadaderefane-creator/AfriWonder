export type CallRingPreset = 'incoming' | 'outgoing';

/** Motif « ti — ti — pause » calqué sur WhatsApp (durées alignées sur les WAV générés). */
export const RING_PULSE_MS: Record<CallRingPreset, { burstMs: number; pauseMs: number }> = {
  /** Destinataire : double chime ~2 s puis pause ~2,6 s. */
  incoming: { burstMs: 2000, pauseMs: 2600 },
  /** Appelant : ringback dual-tone ~1,15 s puis pause ~3,6 s. */
  outgoing: { burstMs: 1150, pauseMs: 3600 },
};

export function ringPulseTiming(preset: CallRingPreset): { burstMs: number; pauseMs: number } {
  return { ...RING_PULSE_MS[preset] };
}
