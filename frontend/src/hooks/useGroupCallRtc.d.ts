import type { StyleProp, ViewStyle } from 'react-native';

export type GroupCallRtcOptions = {
  callId: string | null;
  enabled: boolean;
  audioOnly: boolean;
};

export type GroupCallRtcResult = {
  joined: boolean;
  error: string | null;
  remoteUids: number[];
  micOn: boolean;
  camOn: boolean;
  toggleMic: () => void;
  toggleCam: () => void;
  leave: () => Promise<void>;
  AgoraLocalView: React.ComponentType<{ style?: StyleProp<ViewStyle> }>;
  AgoraRemoteGrid: React.ComponentType<{ style?: StyleProp<ViewStyle>; uids?: number[] }>;
};
