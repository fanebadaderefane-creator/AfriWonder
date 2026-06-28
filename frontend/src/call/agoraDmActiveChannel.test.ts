import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  clearAgoraDmActiveChannel,
  forceLeaveAgoraDmActiveChannel,
  forceLeaveAgoraDmActiveChannelIfStale,
  migrateAgoraDmActiveChannelCallId,
  peekAgoraDmActiveChannelCallId,
  touchAgoraDmActiveChannelCallState,
  registerAgoraDmActiveChannel,
} from './agoraDmActiveChannel';
import { shouldSuppressCallInterruptedUi, peekCallMediaAliveSnapshot } from './callMediaAliveRegistry';

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

  it('forceLeaveIfStale ne quitte pas le même callId', async () => {
    const leaveChannel = vi.fn(async () => {});
    const engine = { leaveChannel, release: vi.fn() };
    registerAgoraDmActiveChannel('call-1', engine as never);
    expect(await forceLeaveAgoraDmActiveChannelIfStale('call-1', 'same_call')).toBe(false);
    expect(leaveChannel).not.toHaveBeenCalled();
    expect(peekAgoraDmActiveChannelCallId()).toBe('call-1');
  });

  it('forceLeaveIfStale quitte un autre callId', async () => {
    const leaveChannel = vi.fn(async () => {});
    const engine = { leaveChannel, release: vi.fn() };
    registerAgoraDmActiveChannel('call-old', engine as never);
    expect(await forceLeaveAgoraDmActiveChannelIfStale('call-new', 'stale')).toBe(true);
    expect(leaveChannel).toHaveBeenCalledTimes(1);
    expect(peekAgoraDmActiveChannelCallId()).toBeNull();
  });

  it('migrate realigne le callId sans quitter le canal', () => {
    const engine = { leaveChannel: vi.fn(), release: vi.fn() };
    registerAgoraDmActiveChannel('local-id', engine as never);
    expect(migrateAgoraDmActiveChannelCallId('local-id', 'server-id')).toBe(true);
    expect(peekAgoraDmActiveChannelCallId()).toBe('server-id');
    expect(migrateAgoraDmActiveChannelCallId('wrong', 'other')).toBe(false);
  });

  it('touchAgoraDmActiveChannelCallState met à jour le snapshot média', () => {
    const engine = { leaveChannel: vi.fn(), release: vi.fn() };
    registerAgoraDmActiveChannel('call-1', engine as never, 'connecting');
    touchAgoraDmActiveChannelCallState('call-1', 'connected');
    expect(shouldSuppressCallInterruptedUi()).toBe(true);
    expect(peekCallMediaAliveSnapshot().callState).toBe('connected');
    touchAgoraDmActiveChannelCallState('call-other', 'connected');
    expect(peekCallMediaAliveSnapshot().callState).toBe('connected');
  });
});
