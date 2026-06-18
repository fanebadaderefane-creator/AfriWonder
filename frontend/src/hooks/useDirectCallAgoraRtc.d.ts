import type { StyleProp, ViewStyle } from 'react-native';
import type { ReactNode } from 'react';

export interface DirectCallAgoraRtcOptions {
  callId: string | null;
  enabled: boolean;
  audioOnly: boolean;
  muted?: boolean;
  videoEnabled?: boolean;
  cameraFlipNonce?: number;
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
  toggleMic: () => void;
  toggleCam: () => void;
  leave: () => Promise<void>;
  LocalView: (props: { style?: StyleProp<ViewStyle> }) => ReactNode;
  RemoteView: (props: { style?: StyleProp<ViewStyle> }) => ReactNode;
}

export declare function useDirectCallAgoraRtc(
  opts: DirectCallAgoraRtcOptions,
): DirectCallAgoraRtcResult;
