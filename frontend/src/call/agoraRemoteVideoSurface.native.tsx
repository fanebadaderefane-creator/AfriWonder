/**
 * Surface Agora distante — montage stable ; Android TextureView (évite SurfaceView par-dessus PiP).
 */
import React, { memo, useEffect } from 'react';
import { Platform, View, type StyleProp, type ViewStyle } from 'react-native';
import { logAfwCall } from './callDiagnosticLog';

export const AgoraRemoteVideoSurface = memo(function AgoraRemoteVideoSurface({
  remoteUid,
  style,
}: {
  remoteUid: number;
  style?: StyleProp<ViewStyle>;
}) {
  useEffect(() => {
    logAfwCall('REMOTE_RENDERER_ATTACHED', { remoteUid });
    return () => {
      logAfwCall('REMOTE_RENDERER_DETACHED', { remoteUid });
    };
  }, [remoteUid]);

  if (Platform.OS === 'web' || remoteUid == null) {
    return <View style={style} />;
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('react-native-agora') as typeof import('react-native-agora') & {
    RtcTextureView?: React.ComponentType<{
      style?: StyleProp<ViewStyle>;
      canvas?: { uid?: number };
    }>;
  };

  if (Platform.OS === 'android' && mod.RtcTextureView) {
    const { RtcTextureView } = mod;
    return (
      <RtcTextureView
        key={`agora-dm-remote-${remoteUid}`}
        style={style}
        canvas={{ uid: remoteUid }}
      />
    );
  }

  const { RtcSurfaceView } = mod;
  return (
    <RtcSurfaceView
      key={`agora-dm-remote-${remoteUid}`}
      style={style}
      canvas={{ uid: remoteUid }}
    />
  );
});
