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

  it('setMinimized force le PiP local en chat (pas plein écran)', () => {
    useAgoraDmCallUiStore.getState().setLocalPreview({
      mountSurface: true,
      containerStyle: 'full',
      showVideo: true,
      showPipFlip: false,
      showFullAvatarFallback: false,
    });
    useAgoraDmCallUiStore.getState().setMinimized(true);
    const s = useAgoraDmCallUiStore.getState();
    expect(s.minimized).toBe(true);
    expect(s.localPreview.containerStyle).toBe('pip');
    expect(s.localPreview.showPipFlip).toBe(true);
  });

  it('toggleVideoFeedsSwap conserve la position PiP', () => {
    useAgoraDmCallUiStore.getState().setPipDrag(42, 88);
    useAgoraDmCallUiStore.getState().toggleVideoFeedsSwap();
    const s = useAgoraDmCallUiStore.getState();
    expect(s.videoFeedsSwapped).toBe(true);
    expect(s.pipDragX).toBe(42);
    expect(s.pipDragY).toBe(88);
    useAgoraDmCallUiStore.getState().toggleVideoFeedsSwap();
    expect(useAgoraDmCallUiStore.getState().videoFeedsSwapped).toBe(false);
  });
});
