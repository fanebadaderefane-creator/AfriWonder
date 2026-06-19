/**
 * Surface Agora locale (uid 0) — une instance stable par appel.
 * Android PiP : dimensions explicites + zOrderMediaOverlay sur SurfaceView.
 */
import React, { memo, useEffect } from 'react';
import { Platform, View, type StyleProp, type ViewStyle } from 'react-native';
import { logAfwCall } from './callDiagnosticLog';

export const AGORA_LOCAL_PREVIEW_SURFACE_KEY = 'agora-dm-local-preview-surface';

export const AGORA_DM_LOCAL_PIP_WIDTH = 110;
export const AGORA_DM_LOCAL_PIP_HEIGHT = 156;

export const AgoraLocalPreviewSurface = memo(function AgoraLocalPreviewSurface({
  style,
  layoutMode = 'fill',
}: {
  style?: StyleProp<ViewStyle>;
  /** pip = taille fixe (évite re-bind Agora au resize full→pip). */
  layoutMode?: 'pip' | 'fill';
}) {
  useEffect(() => {
    logAfwCall('LOCAL_RENDERER_ATTACHED', {
      surface: 'RtcView',
      platform: Platform.OS,
      layoutMode,
    });
    return () => {
      logAfwCall('LOCAL_RENDERER_DETACHED', {
        surface: 'RtcView',
        platform: Platform.OS,
        layoutMode,
      });
    };
  }, [layoutMode]);

  if (Platform.OS === 'web') {
    return <View style={style} />;
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('react-native-agora') as typeof import('react-native-agora') & {
    RtcTextureView?: React.ComponentType<{
      style?: StyleProp<ViewStyle>;
      canvas?: { uid?: number; renderMode?: number; mirrorMode?: number };
      zOrderMediaOverlay?: boolean;
    }>;
    RenderModeType?: { RenderModeFit?: number };
    VideoMirrorModeType?: { VideoMirrorModeEnabled?: number };
  };

  const pipSizedStyle: StyleProp<ViewStyle> =
    layoutMode === 'pip'
      ? { width: AGORA_DM_LOCAL_PIP_WIDTH, height: AGORA_DM_LOCAL_PIP_HEIGHT }
      : style;

  const canvas = {
    uid: 0,
    renderMode: mod.RenderModeType?.RenderModeFit ?? 1,
    mirrorMode: mod.VideoMirrorModeType?.VideoMirrorModeEnabled ?? 1,
  };

  if (Platform.OS === 'android') {
    const { RtcSurfaceView } = mod;
    return (
      <RtcSurfaceView
        key={AGORA_LOCAL_PREVIEW_SURFACE_KEY}
        style={pipSizedStyle}
        canvas={canvas}
        zOrderMediaOverlay
      />
    );
  }

  const { RtcSurfaceView } = mod;
  return (
    <RtcSurfaceView
      key={AGORA_LOCAL_PREVIEW_SURFACE_KEY}
      style={pipSizedStyle}
      canvas={canvas}
      zOrderMediaOverlay
    />
  );
});
