import { describe, expect, it } from 'vitest';
import { buildCallLogContent, callLogPreviewLabel, parseCallLogContent } from '../../utils/callLogPayload.js';

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
  });
});
