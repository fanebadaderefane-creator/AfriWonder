import type { StyleProp, ViewStyle } from 'react-native';
import type { ReactNode } from 'react';

export interface StarCallRtcOptions {
  bookingId: string | null;
  enabled: boolean;
  muted?: boolean;
  videoEnabled?: boolean;
  cameraFlipNonce?: number;
  onRemoteJoined?: () => void;
  onRemoteLeft?: () => void;
  onError?: (msg: string) => void;
}

export interface StarCallRtcResult {
  joined: boolean;
  error: string | null;
  remoteJoined: boolean;
  audioFallback: boolean;
  LocalView: (props: { style?: StyleProp<ViewStyle> }) => ReactNode;
  RemoteView: (props: { style?: StyleProp<ViewStyle> }) => ReactNode;
}

export declare function useStarCallRtc(opts: StarCallRtcOptions): StarCallRtcResult;
