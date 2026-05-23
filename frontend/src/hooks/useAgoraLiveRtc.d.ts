import type { StyleProp, ViewStyle } from 'react-native';
import type { LiveVideoQuality } from '../live/liveVideoQuality';

export type AgoraLiveRole = 'host' | 'audience';

export type AgoraRemoteGridProps = {
  style?: StyleProp<ViewStyle>;
  uids?: number[];
  maxCells?: number;
};

export declare function useAgoraLiveRtc(opts: {
  liveId: string | null;
  role: AgoraLiveRole;
  enabled: boolean;
  muted?: boolean;
  cameraFlipNonce?: number;
  videoQuality?: LiveVideoQuality;
  /** CDC 6.2 — beauté (natif uniquement ; no-op sur web). */
  beautyEnabled?: boolean;
}): {
  agoraJoined: boolean;
  agoraError: string | null;
  remoteUids: number[];
  AgoraLocalView: (props: { style?: StyleProp<ViewStyle> }) => JSX.Element | null;
  AgoraRemoteView: (props: { style?: StyleProp<ViewStyle> }) => JSX.Element | null;
  AgoraRemoteGrid: (props: AgoraRemoteGridProps) => JSX.Element | null;
  toggleScreenShare: () => Promise<{ ok: boolean; on?: boolean; message?: string }>;
};
