import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  clearAgoraDmActiveChannel,
  forceLeaveAgoraDmActiveChannel,
  migrateAgoraDmActiveChannelCallId,
  peekAgoraDmActiveChannelCallId,
  registerAgoraDmActiveChannel,
} from './agoraDmActiveChannel';
import { shouldSuppressCallInterruptedUi } from './callMediaAliveRegistry';

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
    expect(shouldSuppressCallInterruptedUi()).toBe(false);
  });

  it('forceLeave sans moteur retourne false', async () => {
    expect(await forceLeaveAgoraDmActiveChannel('empty')).toBe(false);
  });

  it('migrate realigne le callId sans quitter le canal', () => {
    const engine = { leaveChannel: vi.fn(), release: vi.fn() };
    registerAgoraDmActiveChannel('local-id', engine as never);
    expect(migrateAgoraDmActiveChannelCallId('local-id', 'server-id')).toBe(true);
    expect(peekAgoraDmActiveChannelCallId()).toBe('server-id');
    expect(migrateAgoraDmActiveChannelCallId('wrong', 'other')).toBe(false);
  });
});
