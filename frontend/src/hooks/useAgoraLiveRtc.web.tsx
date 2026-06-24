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
  videoQuality?: import('../live/liveVideoQuality').LiveVideoQuality;
  beautyEnabled?: boolean;
  initialCameraFront?: boolean;
}) {
  const AgoraLocalView = useCallback(({ style: _style }: { style?: StyleProp<ViewStyle> }) => null, []);
  const AgoraRemoteView = useCallback(
    ({ style }: { style?: StyleProp<ViewStyle> }) => <View style={style as ViewStyle} />,
    []
  );
  const AgoraRemoteGrid = useCallback(
    ({ style }: { style?: StyleProp<ViewStyle>; uids?: number[]; maxCells?: number }) => (
      <View style={style as ViewStyle} />
    ),
    []
  );

  const toggleScreenShare = useCallback(async () => {
    return { ok: false as const, message: "Partage d'écran : application native (hôte) uniquement." };
  }, []);

  return {
    agoraJoined: false,
    agoraPreviewReady: false,
    agoraError: null as string | null,
    remoteUids: [] as number[],
    AgoraLocalView,
    AgoraRemoteView,
    AgoraRemoteGrid,
    toggleScreenShare,
  };
}
