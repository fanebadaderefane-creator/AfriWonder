/**
 * Surface Agora locale (uid 0) — une instance stable par appel (jamais remontée).
 */
import React, { memo, useCallback } from 'react';
import { Platform, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import {
  AGORA_RTC_SURFACE_HOST_BG,
  agoraRtcTextureViewSafeStyle,
} from './agoraRtcTextureViewStyle.native';
import { logAfwCall } from './callDiagnosticLog';
import { useCallScreenSafeEffect } from './useCallScreenSafeEffect';

export const AGORA_LOCAL_PREVIEW_SURFACE_KEY = 'agora-dm-local-preview-surface';

const FALLBACK_PREVIEW_STYLE: ViewStyle = { flex: 1, ...AGORA_RTC_SURFACE_HOST_BG };

function renderNativePreviewSurface(style: StyleProp<ViewStyle> | undefined): React.ReactNode {
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

    const canvas = {
      uid: 0,
      renderMode: mod.RenderModeType?.RenderModeFit ?? 1,
      mirrorMode: mod.VideoMirrorModeType?.VideoMirrorModeEnabled ?? 1,
    };

    const surfaceStyle: StyleProp<ViewStyle> = [FALLBACK_PREVIEW_STYLE, style];
    const textureStyle = agoraRtcTextureViewSafeStyle(style);

    if (Platform.OS === 'android' && mod.RtcTextureView) {
      const { RtcTextureView } = mod;
      return (
        <RtcTextureView
          key={AGORA_LOCAL_PREVIEW_SURFACE_KEY}
          style={textureStyle}
          canvas={canvas}
        />
      );
    }

    const { RtcSurfaceView } = mod;
    if (!RtcSurfaceView) {
      logAfwCall('LOCAL_RENDERER_FALLBACK', { reason: 'RtcSurfaceView_missing' });
      return <View style={surfaceStyle} />;
    }

    return (
      <RtcSurfaceView
        key={AGORA_LOCAL_PREVIEW_SURFACE_KEY}
        style={surfaceStyle}
        canvas={canvas}
        zOrderMediaOverlay
      />
    );
  } catch (e) {
    logAfwCall('LOCAL_RENDERER_FALLBACK', { reason: 'RtcSurfaceView_throw', error: String(e) });
    return <View style={[style, FALLBACK_PREVIEW_STYLE]} />;
  }
}

export const AgoraLocalPreviewSurface = memo(function AgoraLocalPreviewSurface({
  style,
  onSurfaceLayout,
}: {
  style?: StyleProp<ViewStyle>;
  /** Conservé pour compat — n’affecte plus le montage surface. */
  layoutMode?: 'pip' | 'fill';
  /** Sync canvas Agora après layout (Android TextureView). */
  onSurfaceLayout?: (width: number, height: number) => void;
}) {
  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { width, height } = event.nativeEvent.layout;
      logAfwCall('LOCAL_PREVIEW_SURFACE_LAYOUT', { width, height, stable: true });
      onSurfaceLayout?.(width, height);
    },
    [onSurfaceLayout],
  );
  useCallScreenSafeEffect(
    'agora_local_renderer_log',
    () => {
      logAfwCall('LOCAL_RENDERER_ATTACHED', {
        surface: 'RtcView',
        platform: Platform.OS,
        stable: true,
      });
      return () => {
        logAfwCall('LOCAL_RENDERER_DETACHED', {
          surface: 'RtcView',
          platform: Platform.OS,
          stable: true,
        });
      };
    },
    [],
  );

  if (Platform.OS === 'web') {
    return <View style={style} onLayout={handleLayout} />;
  }

  const fillStyle: StyleProp<ViewStyle> = [
    { flex: 1, width: '100%', height: '100%' },
    AGORA_RTC_SURFACE_HOST_BG,
    style,
  ];

  return (
    <View style={fillStyle} onLayout={handleLayout} collapsable={false} pointerEvents="box-none">
      <View style={{ flex: 1, width: '100%', height: '100%' }} pointerEvents="none" collapsable={false}>
        {renderNativePreviewSurface({ flex: 1, width: '100%', height: '100%' })}
      </View>
    </View>
  );
});
