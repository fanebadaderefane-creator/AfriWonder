import { create } from 'zustand';
import type { AgoraDmLocalPreviewLayout } from './agoraDmLocalPreviewLayout';

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
  /** Garde l’overlay local monté jusqu’à clearSession (évite démontage React). */
  localPreviewPinned: boolean;
  /** Moteur Agora preview démarré — RtcView autorisé (anti crash 1re frame). */
  localPreviewEngineReady: boolean;
};

type AgoraDmCallUiState = AgoraDmCallUiSnapshot & {
  localPreviewRefreshHandler: ((reason: string) => void) | null;
  setSession: (patch: Partial<AgoraDmCallUiSnapshot> & { active: boolean }) => void;
  setMinimized: (minimized: boolean) => void;
  setDuration: (durationSeconds: number) => void;
  setLocalPreview: (localPreview: AgoraDmLocalPreviewLayout) => void;
  setLocalPreviewPinned: (localPreviewPinned: boolean) => void;
  setLocalPreviewEngineReady: (localPreviewEngineReady: boolean) => void;
  registerLocalPreviewRefresh: (handler: ((reason: string) => void) | null) => void;
  requestLocalPreviewRefresh: (reason: string) => void;
  requestFlipCamera: () => void;
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
  localPreviewPinned: false,
  localPreviewEngineReady: false,
};

export const useAgoraDmCallUiStore = create<AgoraDmCallUiState>((set, get) => ({
  ...INITIAL,
  localPreviewRefreshHandler: null,
  setSession: (patch) => set((s) => ({ ...s, ...patch })),
  setMinimized: (minimized) => set({ minimized }),
  setDuration: (durationSeconds) => set({ durationSeconds }),
  setLocalPreview: (localPreview) => set({ localPreview }),
  setLocalPreviewPinned: (localPreviewPinned) => set({ localPreviewPinned }),
  setLocalPreviewEngineReady: (localPreviewEngineReady) => set({ localPreviewEngineReady }),
  registerLocalPreviewRefresh: (handler) => set({ localPreviewRefreshHandler: handler }),
  requestLocalPreviewRefresh: (reason) => {
    const handler = get().localPreviewRefreshHandler;
    if (typeof handler === 'function') {
      handler(reason);
    }
  },
  requestFlipCamera: () => set((s) => ({ flipCameraTick: s.flipCameraTick + 1 })),
  clearSession: () =>
    set({ ...INITIAL, localPreviewRefreshHandler: null, localPreviewPinned: false, localPreviewEngineReady: false }),
}));

export function syncAgoraDmCallUiStore(patch: Partial<AgoraDmCallUiSnapshot>): void {
  useAgoraDmCallUiStore.setState((s) => ({ ...s, ...patch }));
}

export { EMPTY_PREVIEW as agoraDmEmptyLocalPreview };
