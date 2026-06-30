import { describe, expect, it } from 'vitest';
import {
  AGORA_RTC_SURFACE_HOST_BG,
  agoraRtcTextureViewSafeStyle,
} from './agoraRtcTextureViewStyle.native';

describe('agoraRtcTextureViewSafeStyle', () => {
  it('garde flex/layout sans backgroundColor', () => {
    const safe = agoraRtcTextureViewSafeStyle({
      flex: 1,
      backgroundColor: '#0a0a0a',
      width: '100%',
    });
    expect(safe.flex).toBe(1);
    expect(safe.width).toBe('100%');
    expect(safe).not.toHaveProperty('backgroundColor');
  });

  it('expose le fond hôte séparément', () => {
    expect(AGORA_RTC_SURFACE_HOST_BG.backgroundColor).toBe('#0a0a0a');
  });
});
