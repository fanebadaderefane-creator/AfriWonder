import { describe, expect, it, beforeEach } from 'vitest';
import { useAgoraDmCallUiStore } from './agoraDmCallUiStore';

describe('agoraDmCallUiStore', () => {
  beforeEach(() => {
    useAgoraDmCallUiStore.getState().clearSession();
  });

  it('active + minimized pour bandeau flottant', () => {
    useAgoraDmCallUiStore.getState().setSession({
      active: true,
      minimized: true,
      callId: 'c1',
      otherUserId: 'u2',
      peerName: 'Aboubacar',
      peerAvatar: '',
      isVideoCall: false,
      callState: 'connected',
      durationSeconds: 4,
      role: 'caller',
    });
    const s = useAgoraDmCallUiStore.getState();
    expect(s.active && s.minimized).toBe(true);
    expect(s.durationSeconds).toBe(4);
  });

  it('clearSession remet l’état initial', () => {
    useAgoraDmCallUiStore.getState().setSession({
      active: true,
      minimized: true,
      callId: 'c1',
      otherUserId: 'u2',
      peerName: 'X',
      peerAvatar: '',
      isVideoCall: false,
      callState: 'connected',
      durationSeconds: 1,
      role: 'receiver',
    });
    useAgoraDmCallUiStore.getState().clearSession();
    expect(useAgoraDmCallUiStore.getState().active).toBe(false);
  });
});
