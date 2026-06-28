import type { StyleProp, ViewStyle } from 'react-native';
import type { ReactNode } from 'react';
import type { ConnectionQualityDisplay } from '../call/webrtcConnectionQuality';

export interface DirectCallAgoraRtcOptions {
  callId: string | null;
  enabled: boolean;
  audioOnly: boolean;
  role?: 'caller' | 'receiver';
  muted?: boolean;
  cameraFlipNonce?: number;
  speakerOn?: boolean;
  /** true dès finishCall — annule join/token Agora en vol. */
  callAbortedRef?: { current: boolean };
  onRemoteJoined?: () => void;
  onRemoteLeft?: () => void;
  onError?: (msg: string) => void;
}

export interface DirectCallAgoraRtcResult {
  joined: boolean;
  error: string | null;
  remoteJoined: boolean;
  remoteEverJoined: boolean;
  micOn: boolean;
  camOn: boolean;
  screenSharing: boolean;
  connectionDisplay: ConnectionQualityDisplay;
  videoPublished: boolean;
  previewActive: boolean;
  toggleMic: () => void;
  toggleCam: () => void;
  toggleScreenShare: () => Promise<{ ok: boolean; on?: boolean; message?: string }>;
  upgradeToVideo: () => Promise<{ ok: boolean; message?: string }>;
  leave: () => Promise<void>;
  refreshLocalPreview: (reason: string) => void;
  LocalView: (props: { style?: StyleProp<ViewStyle> }) => ReactNode;
  RemoteView: (props: { style?: StyleProp<ViewStyle> }) => ReactNode;
}

export declare function useDirectCallAgoraRtc(
  opts: DirectCallAgoraRtcOptions,
): DirectCallAgoraRtcResult;
