import { describe, expect, it } from 'vitest';
import { ANDROID_INCOMING_CALL_VIBRATION_PATTERN, INCOMING_CALL_RING_VOLUME } from './callIncomingAlerts';
import { ringPulseTiming } from './callRingtoneTiming';

describe('callIncomingAlerts', () => {
  it('ring volume is moderate (not max)', () => {
    expect(INCOMING_CALL_RING_VOLUME).toBeLessThanOrEqual(0.85);
    expect(INCOMING_CALL_RING_VOLUME).toBeGreaterThan(0.5);
  });

  it('android notification vibration has a pause longer than buzz', () => {
    const pause = ANDROID_INCOMING_CALL_VIBRATION_PATTERN[2];
    const buzz = ANDROID_INCOMING_CALL_VIBRATION_PATTERN[1];
    expect(pause).toBeGreaterThan(buzz);
  });

  it('vibration cycle matches incoming ring timing', () => {
    const t = ringPulseTiming('incoming');
    const cycle = t.burstMs + t.pauseMs;
    expect(ANDROID_INCOMING_CALL_VIBRATION_PATTERN[2]).toBeGreaterThanOrEqual(t.pauseMs - 200);
    expect(cycle).toBeGreaterThan(3000);
  });
});
