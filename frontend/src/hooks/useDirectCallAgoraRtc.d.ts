import type { StyleProp, ViewStyle } from 'react-native';
import type { ReactNode } from 'react';
import type { ConnectionQualityDisplay } from '../call/webrtcConnectionQuality';

export interface DirectCallAgoraRtcOptions {
  callId: string | null;
  enabled: boolean;
  audioOnly: boolean;
  muted?: boolean;
  cameraFlipNonce?: number;
  speakerOn?: boolean;
  onRemoteJoined?: () => void;
  onRemoteLeft?: () => void;
  onError?: (msg: string) => void;
}

export interface DirectCallAgoraRtcResult {
  joined: boolean;
  error: string | null;
  remoteJoined: boolean;
  micOn: boolean;
  camOn: boolean;
  screenSharing: boolean;
  connectionDisplay: ConnectionQualityDisplay;
  videoPublished: boolean;
  toggleMic: () => void;
  toggleCam: () => void;
  toggleScreenShare: () => Promise<{ ok: boolean; on?: boolean; message?: string }>;
  upgradeToVideo: () => Promise<{ ok: boolean; message?: string }>;
  leave: () => Promise<void>;
  LocalView: (props: { style?: StyleProp<ViewStyle> }) => ReactNode;
  RemoteView: (props: { style?: StyleProp<ViewStyle> }) => ReactNode;
}

export declare function useDirectCallAgoraRtc(
  opts: DirectCallAgoraRtcOptions,
): DirectCallAgoraRtcResult;
