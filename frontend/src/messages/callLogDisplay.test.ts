import { describe, expect, it } from 'vitest';
import {
  callLogBubbleIsMine,
  callLogCanCallBack,
  callLogIconDirection,
  callLogTitleIsAlert,
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
    expect(formatCallLogSubtitle(missed, 'user-b')).toBe('');
    expect(callLogCanCallBack(missed, 'user-b')).toBe(true);
    expect(callLogBubbleIsMine(missed, 'user-b')).toBe(false);

    expect(formatCallLogTitle(missed, 'user-a')).toBe('Appel vocal');
    expect(formatCallLogSubtitle(missed, 'user-a')).toBe('Sans réponse');
    expect(callLogBubbleIsMine(missed, 'user-a')).toBe(true);
  });

  it('durée style WhatsApp', () => {
    expect(formatCallDurationFr(1)).toBe('1 s');
    expect(formatCallDurationFr(45)).toBe('45 s');
    expect(formatCallDurationFr(60)).toBe('1 min');
    expect(formatCallDurationFr(125)).toBe('2 min');
    expect(formatCallDurationFr(46 * 60)).toBe('46 min');
    expect(formatCallDurationFr(3600 + 27 * 60)).toBe('1 h et 27 min');
    expect(formatCallDurationFr(8 * 3600 + 27 * 60 + 4)).toBe('8 h et 27 min');

    const m = parseCallLogContent(SAMPLE)!;
    expect(formatCallLogSubtitle(m, 'user-b')).toBe('2 min');
  });

  it('icône direction et titre alerte', () => {
    const missed = parseCallLogContent(
      JSON.stringify({ ...JSON.parse(SAMPLE), outcome: 'missed', durationSec: 0 }),
    )!;
    expect(callLogIconDirection(missed, 'user-a')).toBe('outgoing');
    expect(callLogIconDirection(missed, 'user-b')).toBe('missed');
    expect(callLogTitleIsAlert(missed, 'user-b')).toBe(true);
    expect(callLogTitleIsAlert(missed, 'user-a')).toBe(false);

    const m = parseCallLogContent(SAMPLE)!;
    expect(callLogIconDirection(m, 'user-a')).toBe('outgoing');
    expect(callLogIconDirection(m, 'user-b')).toBe('incoming');
  });
});
