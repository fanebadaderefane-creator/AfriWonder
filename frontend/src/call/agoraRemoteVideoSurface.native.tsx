/**
 * Surface Agora distante — montage stable ; Android TextureView (évite SurfaceView par-dessus PiP).
 */
import React, { memo } from 'react';
import { Platform, View, type StyleProp, type ViewStyle } from 'react-native';
import { logAfwCall } from './callDiagnosticLog';
import { useCallScreenSafeEffect } from './useCallScreenSafeEffect';

export const AgoraRemoteVideoSurface = memo(function AgoraRemoteVideoSurface({
  remoteUid,
  style,
}: {
  remoteUid: number;
  style?: StyleProp<ViewStyle>;
}) {
  useCallScreenSafeEffect(
    'agora_remote_renderer_log',
    () => {
      logAfwCall('REMOTE_RENDERER_ATTACHED', { remoteUid });
      return () => {
        logAfwCall('REMOTE_RENDERER_DETACHED', { remoteUid });
      };
    },
    [remoteUid],
  );

  if (Platform.OS === 'web' || remoteUid == null) {
    return <View style={style} />;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('react-native-agora') as typeof import('react-native-agora') & {
      RtcTextureView?: React.ComponentType<{
        style?: StyleProp<ViewStyle>;
        canvas?: { uid?: number };
      }>;
    };

    if (Platform.OS === 'android' && typeof mod.RtcTextureView === 'function') {
      const { RtcTextureView } = mod;
      return (
        <RtcTextureView
          key={`agora-dm-remote-${remoteUid}`}
          style={style}
          canvas={{ uid: remoteUid }}
        />
      );
    }

    if (typeof mod.RtcSurfaceView !== 'function') {
      logAfwCall('REMOTE_RENDERER_FALLBACK', { remoteUid, reason: 'RtcSurfaceView_missing' });
      return <View style={style} />;
    }

    const { RtcSurfaceView } = mod;
    return (
      <RtcSurfaceView
        key={`agora-dm-remote-${remoteUid}`}
        style={style}
        canvas={{ uid: remoteUid }}
      />
    );
  } catch (e) {
    logAfwCall('REMOTE_RENDERER_FALLBACK', {
      remoteUid,
      reason: 'remote_surface_throw',
      error: String(e),
    });
    return <View style={style} />;
  }
});
