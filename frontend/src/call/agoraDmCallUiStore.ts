import { create } from 'zustand';
import type { AgoraDmLocalPreviewLayout } from './agoraDmLocalPreviewLayout';
import { logAfwCall } from './callDiagnosticLog';
import { resetAgoraDmLocalPreviewCanvasScheduler } from './agoraDmLocalPreviewCanvasScheduler';
import { refreshAgoraDmLocalPreviewCanvas } from './agoraDmLocalPreviewCanvas';
import { resolveAgoraDmOverlayLocalPreviewLayout } from './agoraDmLocalPreviewLayout';

const EMPTY_PREVIEW: AgoraDmLocalPreviewLayout = {
  mountSurface: false,
  containerStyle: 'hidden',
  showVideo: false,
  showPipFlip: false,
  showFullAvatarFallback: false,
};

export type AgoraDmCallUiSnapshot = {
  active: boolean;
  minimized: boolean;
  callId: string;
  otherUserId: string;
  peerName: string;
  peerAvatar: string;
  isVideoCall: boolean;
  role: 'caller' | 'receiver';
  callState: 'ringing' | 'connecting' | 'connected' | 'ended';
  durationSeconds: number;
  /** Layout aperçu caméra — lu par AgoraDmLocalPreviewOverlay (surface unique). */
  localPreview: AgoraDmLocalPreviewLayout;
  flipCameraTick: number;
  /** Tap PiP — local plein écran / distant en PiP (UI seule). */
  videoFeedsSwapped: boolean;
  /** Position PiP glissée — null = coin par défaut. */
  pipDragX: number | null;
  pipDragY: number | null;
  /** Garde l’overlay local monté jusqu’à clearSession (évite démontage React). */
  localPreviewPinned: boolean;
  /** Moteur Agora preview démarré — RtcView autorisé (anti crash 1re frame). */
  localPreviewEngineReady: boolean;
  /** TextureView / RtcView a une taille valide — évite flash noir plein écran sonnerie. */
  localPreviewSurfaceLaidOut: boolean;
};

type AgoraDmCallUiState = AgoraDmCallUiSnapshot & {
  localPreviewRefreshHandler: ((reason: string) => void) | null;
  setSession: (patch: Partial<AgoraDmCallUiSnapshot> & { active: boolean }) => void;
  setMinimized: (minimized: boolean) => void;
  setDuration: (durationSeconds: number) => void;
  setLocalPreview: (localPreview: AgoraDmLocalPreviewLayout) => void;
  setLocalPreviewPinned: (localPreviewPinned: boolean) => void;
  setLocalPreviewEngineReady: (localPreviewEngineReady: boolean) => void;
  setLocalPreviewSurfaceLaidOut: (localPreviewSurfaceLaidOut: boolean) => void;
  registerLocalPreviewRefresh: (handler: ((reason: string) => void) | null) => void;
  requestLocalPreviewRefresh: (reason: string) => void;
  requestFlipCamera: () => void;
  toggleVideoFeedsSwap: () => void;
  setPipDrag: (pipDragX: number, pipDragY: number) => void;
  resetPipDrag: () => void;
  clearSession: () => void;
};

const INITIAL: AgoraDmCallUiSnapshot = {
  active: false,
  minimized: false,
  callId: '',
  otherUserId: '',
  peerName: '',
  peerAvatar: '',
  isVideoCall: false,
  role: 'caller',
  callState: 'ringing',
  durationSeconds: 0,
  localPreview: EMPTY_PREVIEW,
  flipCameraTick: 0,
  videoFeedsSwapped: false,
  pipDragX: null,
  pipDragY: null,
  localPreviewPinned: false,
  localPreviewEngineReady: false,
  localPreviewSurfaceLaidOut: false,
};

export const useAgoraDmCallUiStore = create<AgoraDmCallUiState>((set, get) => ({
  ...INITIAL,
  localPreviewRefreshHandler: null,
  setSession: (patch) => set((s) => ({ ...s, ...patch })),
  setMinimized: (minimized) => {
    const wasMinimized = get().minimized;
    set((s) => {
      if (!minimized) return { minimized };
      return {
        minimized,
        localPreview: resolveAgoraDmOverlayLocalPreviewLayout(s.localPreview, true),
      };
    });
    if (minimized) {
      queueMicrotask(() => refreshAgoraDmLocalPreviewCanvas('minimized'));
    } else if (wasMinimized) {
      queueMicrotask(() => refreshAgoraDmLocalPreviewCanvas('resume_minimized'));
    }
  },
  setDuration: (durationSeconds) => set({ durationSeconds }),
  setLocalPreview: (localPreview) => set({ localPreview }),
  setLocalPreviewPinned: (localPreviewPinned) => set({ localPreviewPinned }),
  setLocalPreviewEngineReady: (localPreviewEngineReady) => set({ localPreviewEngineReady }),
  setLocalPreviewSurfaceLaidOut: (localPreviewSurfaceLaidOut) =>
    set({ localPreviewSurfaceLaidOut }),
  registerLocalPreviewRefresh: (handler) => set({ localPreviewRefreshHandler: handler }),
  requestLocalPreviewRefresh: (reason) => {
    const handler = get().localPreviewRefreshHandler;
    if (typeof handler === 'function') {
      handler(reason);
      return;
    }
    refreshAgoraDmLocalPreviewCanvas(reason);
  },
  requestFlipCamera: () => set((s) => ({ flipCameraTick: s.flipCameraTick + 1 })),
  toggleVideoFeedsSwap: () => {
    set((s) => {
      const next = !s.videoFeedsSwapped;
      logAfwCall('VIDEO_FEEDS_SWAP', {
        feedsSwapped: next,
        pipDragX: s.pipDragX,
        pipDragY: s.pipDragY,
      });
      return { videoFeedsSwapped: next };
    });
    queueMicrotask(() => refreshAgoraDmLocalPreviewCanvas('feeds_swapped'));
  },
  setPipDrag: (pipDragX, pipDragY) => set({ pipDragX, pipDragY }),
  resetPipDrag: () => set({ pipDragX: null, pipDragY: null }),
  clearSession: () => {
    resetAgoraDmLocalPreviewCanvasScheduler();
    set({
      ...INITIAL,
      localPreviewRefreshHandler: null,
      localPreviewPinned: false,
      localPreviewEngineReady: false,
      localPreviewSurfaceLaidOut: false,
    });
  },
}));

export function syncAgoraDmCallUiStore(patch: Partial<AgoraDmCallUiSnapshot>): void {
  useAgoraDmCallUiStore.setState((s) => ({ ...s, ...patch }));
}

export { EMPTY_PREVIEW as agoraDmEmptyLocalPreview };
