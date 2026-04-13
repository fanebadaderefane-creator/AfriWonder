/**
 * Web : pas de react-native-agora (modules natifs / codegen). Même API que .native pour les écrans live.
 */
import React, { useCallback } from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';

export type AgoraLiveRole = 'host' | 'audience';

export function useAgoraLiveRtc(_opts: {
  liveId: string | null;
  role: AgoraLiveRole;
  enabled: boolean;
  muted?: boolean;
  cameraFlipNonce?: number;
}) {
  const AgoraLocalView = useCallback(({ style }: { style?: StyleProp<ViewStyle> }) => null, []);
  const AgoraRemoteView = useCallback(
    ({ style }: { style?: StyleProp<ViewStyle> }) => <View style={style as ViewStyle} />,
    []
  );

  return {
    agoraJoined: false,
    agoraError: null as string | null,
    remoteUid: null as number | null,
    AgoraLocalView,
    AgoraRemoteView,
  };
}
