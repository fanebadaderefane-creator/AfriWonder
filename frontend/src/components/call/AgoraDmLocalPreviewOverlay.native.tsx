/**
 * Overlay root — unique hôte RtcView (uid 0) pour tout l’appel vidéo.
 * Surface jamais démontée : seuls position/taille changent (plein écran ↔ PiP).
 */
import React, { useCallback, useMemo } from 'react';
import { AppState, Dimensions, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AgoraLocalPreviewSurface } from '../../call/agoraLocalPreviewSurface.native';
import { agoraDmLocalPreviewStyles } from '../../call/agoraDmLocalPreviewStyles';
import { agoraDmEmptyLocalPreview, useAgoraDmCallUiStore } from '../../call/agoraDmCallUiStore';
import { refreshAgoraDmLocalPreviewCanvas } from '../../call/agoraDmLocalPreviewCanvas';
import { logAfwCall } from '../../call/callDiagnosticLog';
import { scheduleAgoraDmLocalPreviewCanvasOnSurfaceLayout } from '../../call/agoraDmLocalPreviewCanvasScheduler';
import { resolveAgoraDmOverlayLocalPreviewLayout } from '../../call/agoraDmLocalPreviewLayout';
import { clampAgoraDmPipDrag } from '../../call/agoraDmPipPosition';
import { shouldMountAgoraDmLocalPreviewOverlay } from '../../call/agoraDmLocalPreviewOverlayGuard';
import { resolveAgoraDmOverlayHostLayout, resolveAgoraDmOverlayLayer } from '../../call/agoraDmOverlayLayer';
import { navigateToActiveAgoraCallScreen } from '../../call/navigateToActiveAgoraCallScreen';
import { useCallScreenSafeEffect } from '../../call/useCallScreenSafeEffect';
import { defaultAgoraDmPipStyle, useAgoraDmPipGestures } from '../../call/useAgoraDmPipGestures';

export function AgoraDmLocalPreviewOverlay() {
  const insets = useSafeAreaInsets();
  const callState = useAgoraDmCallUiStore((s) => s.callState);
  const isVideoCall = useAgoraDmCallUiStore((s) => s.isVideoCall);
  const minimized = useAgoraDmCallUiStore((s) => s.minimized);
  const localPreviewPinned = useAgoraDmCallUiStore((s) => s.localPreviewPinned);
  const localPreviewEngineReady = useAgoraDmCallUiStore((s) => s.localPreviewEngineReady);
  const localPreview = useAgoraDmCallUiStore((s) => s.localPreview);
  const pipDragX = useAgoraDmCallUiStore((s) => s.pipDragX);
  const pipDragY = useAgoraDmCallUiStore((s) => s.pipDragY);
  const requestFlipCamera = useAgoraDmCallUiStore((s) => s.requestFlipCamera);
  const toggleVideoFeedsSwap = useAgoraDmCallUiStore((s) => s.toggleVideoFeedsSwap);
  const setPipDrag = useAgoraDmCallUiStore((s) => s.setPipDrag);

  const layout = resolveAgoraDmOverlayLocalPreviewLayout(
    localPreview ?? agoraDmEmptyLocalPreview,
    minimized,
  );
  const styleKey = layout.containerStyle;
  const pipOnChat = minimized && styleKey === 'pip';
  const bottomOffset = pipOnChat ? insets.bottom + 88 : insets.bottom + 108;
  const showVideo = layout.mountSurface && layout.showVideo;
  const isPip = styleKey === 'pip';
  const windowSize = Dimensions.get('window');
  const defaultPipX = windowSize.width - 110 - 16;
  const defaultPipY = windowSize.height - bottomOffset - 156;

  const onSwap = useCallback(() => {
    toggleVideoFeedsSwap();
  }, [toggleVideoFeedsSwap]);

  const onReturnToCall = useCallback(() => {
    navigateToActiveAgoraCallScreen();
  }, []);

  const onSurfaceLayout = useCallback((width: number, height: number) => {
    scheduleAgoraDmLocalPreviewCanvasOnSurfaceLayout(width, height);
  }, []);

  const onFlip = useCallback(() => {
    requestFlipCamera();
  }, [requestFlipCamera]);

  const pipGestures = useAgoraDmPipGestures({
    enabled: isPip && showVideo && !minimized,
    onTap: minimized ? onReturnToCall : undefined,
    onSwap: minimized ? undefined : onSwap,
    setPipDrag,
    dragX: pipDragX,
    dragY: pipDragY,
    defaultX: defaultPipX,
    defaultY: defaultPipY,
  });

  useCallScreenSafeEffect(
    'agora_overlay_canvas_sync',
    () => {
      if (!showVideo || !layout.mountSurface) return;
      const reason = `overlay_layout_${styleKey}_${minimized ? 'min' : 'call'}`;
      logAfwCall('OVERLAY', {
        action: 'canvas_sync',
        styleKey,
        minimized,
        showVideo,
        mountSurface: layout.mountSurface,
        reason,
      });
      if (isPip) {
        logAfwCall('PIP_LAYOUT', {
          styleKey,
          pipDragX,
          pipDragY,
          bottomOffset,
          minimized,
        });
      }
      refreshAgoraDmLocalPreviewCanvas(reason);
    },
    [bottomOffset, isPip, layout.mountSurface, minimized, pipDragX, pipDragY, showVideo, styleKey],
  );

  useCallScreenSafeEffect(
    'agora_overlay_app_foreground',
    () => {
      const sub = AppState.addEventListener('change', (state) => {
        if (state === 'active' && showVideo) {
          logAfwCall('APP_FOREGROUND', { source: 'overlay', styleKey, minimized });
          refreshAgoraDmLocalPreviewCanvas('app_foreground');
        }
      });
      return () => sub.remove();
    },
    [minimized, showVideo, styleKey],
  );

  useCallScreenSafeEffect(
    'agora_overlay_window_resize',
    () => {
      const sub = Dimensions.addEventListener('change', ({ window }) => {
        if (showVideo && isPip) {
          refreshAgoraDmLocalPreviewCanvas('window_resize');
          const cur = useAgoraDmCallUiStore.getState();
          if (cur.pipDragX != null && cur.pipDragY != null) {
            const clamped = clampAgoraDmPipDrag({
              x: cur.pipDragX,
              y: cur.pipDragY,
              windowWidth: window.width,
              windowHeight: window.height,
            });
            cur.setPipDrag(clamped.x, clamped.y);
          }
        }
      });
      return () => sub.remove();
    },
    [isPip, showVideo],
  );

  const containerStyle = useMemo(() => {
    if (styleKey === 'full') {
      return [agoraDmLocalPreviewStyles.full, !showVideo ? agoraDmLocalPreviewStyles.hiddenCam : null];
    }
    if (styleKey === 'pip') {
      return [
        agoraDmLocalPreviewStyles.pipBase,
        defaultAgoraDmPipStyle({
          bottomOffset,
          dragX: pipDragX,
          dragY: pipDragY,
        }),
        !showVideo ? agoraDmLocalPreviewStyles.hiddenCam : null,
      ];
    }
    return [agoraDmLocalPreviewStyles.hidden, !showVideo ? agoraDmLocalPreviewStyles.hiddenCam : null];
  }, [bottomOffset, pipDragX, pipDragY, showVideo, styleKey]);

  const mountOverlay = shouldMountAgoraDmLocalPreviewOverlay({
    callState,
    isVideoCall,
    localPreviewPinned,
    localPreviewEngineReady,
    mountSurface: layout.mountSurface,
    containerStyle: styleKey,
  });

  const surfaceClipStyle = useMemo(
    () => [
      styles.surfaceClip,
      styleKey === 'full' && Platform.OS === 'android' ? styles.surfaceClipFullAndroid : null,
    ],
    [styleKey],
  );

  if (!mountOverlay) {
    return null;
  }

  const overlayLayer = resolveAgoraDmOverlayLayer({
    containerStyle: styleKey,
    minimized,
  });
  const hostLayout = resolveAgoraDmOverlayHostLayout({
    containerStyle: styleKey,
    minimized,
    safeTop: insets.top,
    safeBottom: insets.bottom,
  });

  return (
    <View
      style={[
        hostLayout,
        {
          zIndex: overlayLayer.hostZIndex,
          elevation: overlayLayer.hostElevation,
          pointerEvents: 'box-none',
        },
      ]}
      collapsable={false}
    >
      <View
        style={containerStyle}
        pointerEvents={isPip && showVideo ? 'auto' : overlayLayer.surfacePointerEvents === 'none' ? 'none' : 'auto'}
        collapsable={false}
        accessibilityRole={isPip && showVideo && !minimized ? 'button' : undefined}
        accessibilityLabel={
          isPip && showVideo && !minimized ? 'Inverser les vidéos' : undefined
        }
        {...(isPip && showVideo ? pipGestures.panHandlers : {})}
      >
        <View style={surfaceClipStyle} pointerEvents="none" collapsable={false}>
          <AgoraLocalPreviewSurface
            style={agoraDmLocalPreviewStyles.fill}
            onSurfaceLayout={onSurfaceLayout}
          />
        </View>
        {layout.showPipFlip && showVideo ? (
          <TouchableOpacity
            style={agoraDmLocalPreviewStyles.pipFlipBtn}
            onPress={onFlip}
            accessibilityLabel="Retourner la caméra"
          >
            <Ionicons name="camera-reverse-outline" size={20} color="#FFF" />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  surfaceClip: {
    flex: 1,
    width: '100%',
    height: '100%',
    ...(Platform.OS === 'android' ? null : { overflow: 'hidden' as const }),
    backgroundColor: '#0a0a0a',
  },
  /** Plein écran sonnerie — fond transparent pour ne pas masquer CallScreen. */
  surfaceClipFullAndroid: {
    backgroundColor: 'transparent',
  },
});
