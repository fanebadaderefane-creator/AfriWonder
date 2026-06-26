import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  clearAgoraDmActiveChannel,
  forceLeaveAgoraDmActiveChannel,
  peekAgoraDmActiveChannelCallId,
  registerAgoraDmActiveChannel,
} from './agoraDmActiveChannel';

describe('agoraDmActiveChannel', () => {
  beforeEach(() => {
    clearAgoraDmActiveChannel();
  });

  it('forceLeave quitte et release le moteur enregistré', async () => {
    const leaveChannel = vi.fn(async () => {});
    const release = vi.fn();
    const engine = { leaveChannel, release };
    registerAgoraDmActiveChannel('call-1', engine as never);
    expect(peekAgoraDmActiveChannelCallId()).toBe('call-1');

    const ok = await forceLeaveAgoraDmActiveChannel('test');
    expect(ok).toBe(true);
    expect(leaveChannel).toHaveBeenCalledTimes(1);
    expect(release).toHaveBeenCalledTimes(1);
    expect(peekAgoraDmActiveChannelCallId()).toBeNull();
  });

  it('forceLeave sans moteur retourne false', async () => {
    expect(await forceLeaveAgoraDmActiveChannel('empty')).toBe(false);
  });
});
