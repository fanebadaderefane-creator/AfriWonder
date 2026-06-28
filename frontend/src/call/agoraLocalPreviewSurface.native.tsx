/**
 * Surface Agora locale (uid 0) — une instance stable par appel.
 * Android PiP : dimensions explicites + zOrderMediaOverlay sur SurfaceView.
 */
import React, { memo } from 'react';
import { Platform, View, type StyleProp, type ViewStyle } from 'react-native';
import { logAfwCall } from './callDiagnosticLog';
import { useCallScreenSafeEffect } from './useCallScreenSafeEffect';

export const AGORA_LOCAL_PREVIEW_SURFACE_KEY = 'agora-dm-local-preview-surface';

export const AGORA_DM_LOCAL_PIP_WIDTH = 110;
export const AGORA_DM_LOCAL_PIP_HEIGHT = 156;

const FALLBACK_PREVIEW_STYLE: ViewStyle = { flex: 1, backgroundColor: '#0a0a0a' };

function renderNativePreviewSurface(
  layoutMode: 'pip' | 'fill',
  style: StyleProp<ViewStyle> | undefined,
): React.ReactNode {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('react-native-agora') as typeof import('react-native-agora') & {
      RtcSurfaceView?: React.ComponentType<{
        style?: StyleProp<ViewStyle>;
        canvas?: { uid?: number; renderMode?: number; mirrorMode?: number };
        zOrderMediaOverlay?: boolean;
      }>;
      RtcTextureView?: React.ComponentType<{
        style?: StyleProp<ViewStyle>;
        canvas?: { uid?: number; renderMode?: number; mirrorMode?: number };
      }>;
      RenderModeType?: { RenderModeFit?: number };
      VideoMirrorModeType?: { VideoMirrorModeEnabled?: number };
    };

    const { RtcSurfaceView } = mod;
    if (!RtcSurfaceView) {
      logAfwCall('LOCAL_RENDERER_FALLBACK', { reason: 'RtcSurfaceView_missing' });
      return <View style={[style, FALLBACK_PREVIEW_STYLE]} />;
    }

    const pipSizedStyle: StyleProp<ViewStyle> =
      layoutMode === 'pip'
        ? { width: AGORA_DM_LOCAL_PIP_WIDTH, height: AGORA_DM_LOCAL_PIP_HEIGHT }
        : style;

    const canvas = {
      uid: 0,
      renderMode: mod.RenderModeType?.RenderModeFit ?? 1,
      mirrorMode: mod.VideoMirrorModeType?.VideoMirrorModeEnabled ?? 1,
    };

    /** Android : TextureView respecte le z-order React (SurfaceView recouvre le dock). */
    if (Platform.OS === 'android' && mod.RtcTextureView) {
      const { RtcTextureView } = mod;
      return (
        <RtcTextureView
          key={`${AGORA_LOCAL_PREVIEW_SURFACE_KEY}-${layoutMode}`}
          style={pipSizedStyle}
          canvas={canvas}
        />
      );
    }

    return (
      <RtcSurfaceView
        key={AGORA_LOCAL_PREVIEW_SURFACE_KEY}
        style={pipSizedStyle}
        canvas={canvas}
        zOrderMediaOverlay={layoutMode === 'pip'}
      />
    );
  } catch (e) {
    logAfwCall('LOCAL_RENDERER_FALLBACK', { reason: 'RtcSurfaceView_throw', error: String(e) });
    return <View style={[style, FALLBACK_PREVIEW_STYLE]} />;
  }
}

export const AgoraLocalPreviewSurface = memo(function AgoraLocalPreviewSurface({
  style,
  layoutMode = 'fill',
}: {
  style?: StyleProp<ViewStyle>;
  layoutMode?: 'pip' | 'fill';
}) {
  useCallScreenSafeEffect(
    'agora_local_renderer_log',
    () => {
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
    },
    [layoutMode],
  );

  if (Platform.OS === 'web') {
    return <View style={style} />;
  }

  return renderNativePreviewSurface(layoutMode, style);
});
