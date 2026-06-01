import { describe, expect, it } from 'vitest';
import {
  callLogBubbleIsMine,
  callLogCanCallBack,
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

  it('alignement bulles WhatsApp (sortant à droite)', () => {
    const m = parseCallLogContent(SAMPLE)!;
    expect(callLogBubbleIsMine(m, 'user-a')).toBe(true);
    expect(callLogBubbleIsMine(m, 'user-b')).toBe(false);
    expect(formatCallLogTitle(m, 'user-a')).toBe('Appel vocal');
    expect(formatCallLogTitle(m, 'user-b')).toBe('Appel vocal');
  });

  it('appel manqué côté destinataire', () => {
    const missed = parseCallLogContent(
      JSON.stringify({ ...JSON.parse(SAMPLE), outcome: 'missed', durationSec: 0 }),
    )!;
    expect(formatCallLogTitle(missed, 'user-b')).toBe('Appel vocal manqué');
    expect(formatCallLogSubtitle(missed, 'user-b')).toBe('Cliquez pour rappeler');
    expect(callLogCanCallBack(missed, 'user-b')).toBe(true);
    expect(callLogBubbleIsMine(missed, 'user-b')).toBe(false);

    expect(formatCallLogTitle(missed, 'user-a')).toBe('Appel vocal');
    expect(formatCallLogSubtitle(missed, 'user-a')).toBe('Sans réponse');
    expect(callLogBubbleIsMine(missed, 'user-a')).toBe(true);
  });

  it('durée style WhatsApp', () => {
    expect(formatCallDurationFr(1)).toBe('1 seconde');
    expect(formatCallDurationFr(20)).toBe('20 secondes');
    expect(formatCallDurationFr(60)).toBe('1 minute');
    expect(formatCallDurationFr(125)).toBe('2 min 5 s');

    const m = parseCallLogContent(SAMPLE)!;
    expect(formatCallLogSubtitle(m, 'user-b')).toBe('2 min 5 s');
  });
});
