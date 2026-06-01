import { describe, expect, it } from 'vitest';
import {
  formatCallDurationFr,
  formatCallLogSubtitle,
  formatCallLogTitle,
  parseCallLogContent,
} from './callLogDisplay';

const SAMPLE = JSON.stringify({
  v: 1,
  callId: 'c1',
  media: 'audio',
  outcome: 'completed',
  callerId: 'user-a',
  receiverId: 'user-b',
  durationSec: 125,
  startedAt: '2026-06-01T10:00:00.000Z',
  endedAt: '2026-06-01T10:02:05.000Z',
});

describe('callLogDisplay', () => {
  it('parse JSON v1', () => {
    const m = parseCallLogContent(SAMPLE);
    expect(m?.callId).toBe('c1');
    expect(m?.durationSec).toBe(125);
  });

  it('titres entrant / sortant', () => {
    const m = parseCallLogContent(SAMPLE)!;
    expect(formatCallLogTitle(m, 'user-a')).toBe('Appel sortant');
    expect(formatCallLogTitle(m, 'user-b')).toBe('Appel entrant');
  });

  it('appel manqué et annulé', () => {
    const missed = parseCallLogContent(
      JSON.stringify({ ...JSON.parse(SAMPLE), outcome: 'missed', durationSec: 0 }),
    )!;
    expect(formatCallLogTitle(missed, 'user-a')).toBe('Appel manqué');

    const cancelled = parseCallLogContent(
      JSON.stringify({ ...JSON.parse(SAMPLE), outcome: 'cancelled', durationSec: 0 }),
    )!;
    expect(formatCallLogTitle(cancelled, 'user-a')).toBe('Appel annulé');
    expect(formatCallLogTitle(cancelled, 'user-b')).toBe('Appel manqué');
  });

  it('durée et sous-titre', () => {
    expect(formatCallDurationFr(125)).toBe('2 min 5 s');
    const m = parseCallLogContent(SAMPLE)!;
    expect(formatCallLogSubtitle(m, '2026-06-01T10:02:05.000Z')).toMatch(/· 2 min 5 s$/);
  });
});
