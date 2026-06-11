import type { GroupCallRtcOptions, GroupCallRtcResult } from './useGroupCallRtc.d';

const noopView = () => null;

export function useGroupCallRtc(_opts: GroupCallRtcOptions): GroupCallRtcResult {
  return {
    joined: false,
    error: 'Appels groupe disponibles sur l’application mobile installée.',
    remoteUids: [],
    micOn: true,
    camOn: true,
    toggleMic: () => {},
    toggleCam: () => {},
    leave: async () => {},
    AgoraLocalView: noopView,
    AgoraRemoteGrid: noopView,
  };
}
