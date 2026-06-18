import React, { useCallback } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import type { DirectCallAgoraRtcOptions, DirectCallAgoraRtcResult } from './useDirectCallAgoraRtc.d';

/** Expo web : jamais monté en prod (`shouldUseAgoraDmCalls` = false sur web). Stub no-op sans message UI. */
export function useDirectCallAgoraRtc(_opts: DirectCallAgoraRtcOptions): DirectCallAgoraRtcResult {
  const noopView = useCallback(({ style }: { style?: StyleProp<ViewStyle> }) => <View style={style} />, []);
  const noop = useCallback(async () => {}, []);
  const noopShare = useCallback(async () => ({ ok: false as const, message: 'Non disponible sur web.' }), []);
  return {
    joined: false,
    error: null,
    remoteJoined: false,
    micOn: true,
    camOn: false,
    screenSharing: false,
    connectionDisplay: { quality: 'fair' as const, labelFr: 'Connexion…', bars: 2 as const },
    videoPublished: false,
    toggleMic: () => {},
    toggleCam: () => {},
    toggleScreenShare: noopShare,
    upgradeToVideo: noopShare,
    leave: noop,
    LocalView: noopView,
    RemoteView: noopView,
  };
}
