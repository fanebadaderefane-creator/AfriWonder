import { describe, expect, it } from 'vitest';

import {
  canConsumePreviewEngine,
  canMarkPreviewHandoff,
  shouldBlockPreviewSessionRelease,
} from './agoraDmPreviewHandoff';

describe('agoraDmPreviewHandoff', () => {
  it('bloque release pendant handoff sur le même callId', () => {
    expect(
      shouldBlockPreviewSessionRelease({ callId: 'call-1', previewActive: true }, 'call-1'),
    ).toBe(true);
    expect(shouldBlockPreviewSessionRelease(null, 'call-1')).toBe(false);
    expect(
      shouldBlockPreviewSessionRelease({ callId: 'call-2', previewActive: true }, 'call-1'),
    ).toBe(false);
  });

  it('autorise handoff uniquement si la session correspond', () => {
    expect(canMarkPreviewHandoff('call-1', 'call-1')).toBe(true);
    expect(canMarkPreviewHandoff('call-1', 'call-2')).toBe(false);
    expect(canMarkPreviewHandoff('', 'call-1')).toBe(false);
  });

  it('consomme le moteur uniquement pour le callId actif', () => {
    expect(canConsumePreviewEngine('call-1', 'call-1')).toBe(true);
    expect(canConsumePreviewEngine('call-1', null)).toBe(false);
    expect(canConsumePreviewEngine('call-2', 'call-1')).toBe(false);
  });
});
