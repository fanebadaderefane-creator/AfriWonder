import { describe, expect, it } from 'vitest';
import {
  buildCallLogContent,
  callLogPreviewLabel,
  formatCallDurationFr,
  parseCallLogContent,
} from '../../utils/callLogPayload.js';

describe('callLogPayload', () => {
  it('round-trip JSON', () => {
    const raw = buildCallLogContent({
      callId: 'x',
      media: 'video',
      outcome: 'declined',
      callerId: 'a',
      receiverId: 'b',
      durationSec: 0,
      startedAt: null,
      endedAt: '2026-06-01T12:00:00.000Z',
    });
    const parsed = parseCallLogContent(raw);
    expect(parsed?.outcome).toBe('declined');
    expect(parsed?.media).toBe('video');
  });

  it('preview label', () => {
    expect(callLogPreviewLabel('missed', 'audio')).toBe('Appel audio manqué');
    expect(callLogPreviewLabel('cancelled', 'video')).toBe('Appel vidéo annulé');
    expect(callLogPreviewLabel('incoming', 'video')).toBe('Appel vidéo entrant');
  });

  it('formatCallDurationFr — style WhatsApp', () => {
    expect(formatCallDurationFr(45)).toBe('45 s');
    expect(formatCallDurationFr(125)).toBe('2 min');
    expect(formatCallDurationFr(8 * 3600 + 27 * 60 + 4)).toBe('8 h et 27 min');
  });
});
