import { describe, expect, it } from 'vitest';

import { shouldSyncAgoraDmLocalPreviewCanvas } from './agoraDmLocalPreviewCanvasPolicy';

describe('agoraDmLocalPreviewCanvas', () => {
  it('sync canvas si appel actif et callId aligné sur le canal', () => {
    expect(
      shouldSyncAgoraDmLocalPreviewCanvas({
        active: true,
        callId: 'c1',
        activeChannelCallId: 'c1',
      }),
    ).toBe(true);
    expect(
      shouldSyncAgoraDmLocalPreviewCanvas({
        active: true,
        callId: 'c1',
        activeChannelCallId: 'c2',
      }),
    ).toBe(false);
    expect(
      shouldSyncAgoraDmLocalPreviewCanvas({
        active: false,
        callId: 'c1',
        activeChannelCallId: 'c1',
      }),
    ).toBe(false);
  });

  it('sync canvas en phase preview avant join (moteur preview vivant)', () => {
    expect(
      shouldSyncAgoraDmLocalPreviewCanvas({
        active: true,
        callId: 'c1',
        activeChannelCallId: null,
        previewEngineAlive: true,
      }),
    ).toBe(true);
  });
});
