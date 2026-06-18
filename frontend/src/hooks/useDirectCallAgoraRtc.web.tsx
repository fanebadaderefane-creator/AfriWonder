import React, { useCallback } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import type { DirectCallAgoraRtcOptions, DirectCallAgoraRtcResult } from './useDirectCallAgoraRtc.d';

/** Expo web : appels DM restent sur WebRTC (`call.tsx` inner). */
export function useDirectCallAgoraRtc(_opts: DirectCallAgoraRtcOptions): DirectCallAgoraRtcResult {
  const noopView = useCallback(({ style }: { style?: StyleProp<ViewStyle> }) => <View style={style} />, []);
  const noop = useCallback(async () => {}, []);
  return {
    joined: false,
    error: 'Agora DM — utilisez l’application mobile.',
    remoteJoined: false,
    micOn: true,
    camOn: false,
    toggleMic: () => {},
    toggleCam: () => {},
    leave: noop,
    LocalView: noopView,
    RemoteView: noopView,
  };
}
