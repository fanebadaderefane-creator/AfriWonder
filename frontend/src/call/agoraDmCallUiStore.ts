import { create } from 'zustand';

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
};

type AgoraDmCallUiState = AgoraDmCallUiSnapshot & {
  setSession: (patch: Partial<AgoraDmCallUiSnapshot> & { active: boolean }) => void;
  setMinimized: (minimized: boolean) => void;
  setDuration: (durationSeconds: number) => void;
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
};

export const useAgoraDmCallUiStore = create<AgoraDmCallUiState>((set) => ({
  ...INITIAL,
  setSession: (patch) => set((s) => ({ ...s, ...patch })),
  setMinimized: (minimized) => set({ minimized }),
  setDuration: (durationSeconds) => set({ durationSeconds }),
  clearSession: () => set({ ...INITIAL }),
}));

export function syncAgoraDmCallUiStore(patch: Partial<AgoraDmCallUiSnapshot>): void {
  useAgoraDmCallUiStore.setState((s) => ({ ...s, ...patch }));
}
