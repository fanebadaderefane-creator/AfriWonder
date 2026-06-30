/**
 * Surface Agora distante — montage stable ; Android TextureView (évite SurfaceView par-dessus PiP).
 */
import React, { memo } from 'react';
import { Platform, View, type StyleProp, type ViewStyle } from 'react-native';
import {
  AGORA_RTC_SURFACE_HOST_BG,
  agoraRtcTextureViewSafeStyle,
} from './agoraRtcTextureViewStyle.native';
import { logAfwCall } from './callDiagnosticLog';
import { useCallScreenSafeEffect } from './useCallScreenSafeEffect';

export const AGORA_REMOTE_VIDEO_SURFACE_KEY = 'agora-dm-remote-surface';

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
      logAfwCall('REMOTE_RENDERER_ATTACHED', { remoteUid, stable: true });
      return () => {
        logAfwCall('REMOTE_RENDERER_DETACHED', { remoteUid, stable: true });
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
      RtcSurfaceView?: React.ComponentType<{
        style?: StyleProp<ViewStyle>;
        canvas?: { uid?: number };
      }>;
    };

    if (Platform.OS === 'android' && typeof mod.RtcTextureView === 'function') {
      const { RtcTextureView } = mod;
      return (
        <View style={[style, AGORA_RTC_SURFACE_HOST_BG]} collapsable={false} pointerEvents="box-none">
          <View style={{ flex: 1, width: '100%', height: '100%' }} pointerEvents="none" collapsable={false}>
            <RtcTextureView
              key={`${AGORA_REMOTE_VIDEO_SURFACE_KEY}-${remoteUid}`}
              style={agoraRtcTextureViewSafeStyle(style)}
              canvas={{ uid: remoteUid }}
            />
          </View>
        </View>
      );
    }

    if (typeof mod.RtcSurfaceView !== 'function') {
      logAfwCall('REMOTE_RENDERER_FALLBACK', { remoteUid, reason: 'RtcSurfaceView_missing' });
      return <View style={style} />;
    }

    const { RtcSurfaceView } = mod;
    return (
      <RtcSurfaceView
        key={`${AGORA_REMOTE_VIDEO_SURFACE_KEY}-${remoteUid}`}
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
