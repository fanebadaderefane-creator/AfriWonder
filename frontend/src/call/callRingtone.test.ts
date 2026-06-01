import { describe, expect, it } from 'vitest';
import { ringPulseTiming } from './callRingtoneTiming';

describe('callRingtone', () => {
  it('incoming ring uses burst then pause (not continuous loop)', () => {
    const t = ringPulseTiming('incoming');
    expect(t.burstMs).toBeGreaterThan(0);
    expect(t.pauseMs).toBeGreaterThan(t.burstMs);
  });

  it('outgoing ringback has longer pause than burst', () => {
    const t = ringPulseTiming('outgoing');
    expect(t.pauseMs).toBeGreaterThanOrEqual(t.burstMs);
  });
});
