/**
 * Overlay root — unique hôte RtcView (uid 0) pour tout l’appel vidéo.
 * Surface jamais démontée entre plein écran (sonnerie) et PiP (connecté).
 */
import React, { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AgoraLocalPreviewSurface } from '../../call/agoraLocalPreviewSurface.native';
import { agoraDmLocalPreviewStyles } from '../../call/agoraDmLocalPreviewStyles';
import { agoraDmEmptyLocalPreview, useAgoraDmCallUiStore } from '../../call/agoraDmCallUiStore';
import { shouldMountAgoraDmLocalPreviewOverlay } from '../../call/agoraDmLocalPreviewOverlayGuard';

export function AgoraDmLocalPreviewOverlay() {
  const insets = useSafeAreaInsets();
  const callState = useAgoraDmCallUiStore((s) => s.callState);
  const isVideoCall = useAgoraDmCallUiStore((s) => s.isVideoCall);
  const minimized = useAgoraDmCallUiStore((s) => s.minimized);
  const localPreviewPinned = useAgoraDmCallUiStore((s) => s.localPreviewPinned);
  const localPreviewEngineReady = useAgoraDmCallUiStore((s) => s.localPreviewEngineReady);
  const localPreview = useAgoraDmCallUiStore((s) => s.localPreview);
  const requestFlipCamera = useAgoraDmCallUiStore((s) => s.requestFlipCamera);
  const requestLocalPreviewRefresh = useAgoraDmCallUiStore((s) => s.requestLocalPreviewRefresh);

  const prevLayoutRef = useRef(localPreview?.containerStyle ?? 'hidden');

  useEffect(() => {
    const next = localPreview?.containerStyle ?? 'hidden';
    if (prevLayoutRef.current !== next) {
      prevLayoutRef.current = next;
      requestLocalPreviewRefresh(`layout_${next}`);
    }
  }, [localPreview?.containerStyle, requestLocalPreviewRefresh]);

  const onFlip = useCallback(() => {
    requestFlipCamera();
  }, [requestFlipCamera]);

  const layout = localPreview ?? agoraDmEmptyLocalPreview;
  const mountSurface = layout.mountSurface;

  if (
    !shouldMountAgoraDmLocalPreviewOverlay({
      callState,
      isVideoCall,
      localPreviewPinned,
      localPreviewEngineReady,
      mountSurface,
    })
  ) {
    return null;
  }

  const styleKey = layout.containerStyle;
  const baseStyle =
    styleKey === 'pip'
      ? agoraDmLocalPreviewStyles.pip
      : styleKey === 'full'
        ? agoraDmLocalPreviewStyles.full
        : agoraDmLocalPreviewStyles.hidden;

  const pipOnChat = minimized && styleKey === 'pip';
  const bottomOffset = pipOnChat ? insets.bottom + 88 : 108;
  const showVideo = layout.mountSurface && layout.showVideo;
  const surfaceLayoutMode = styleKey === 'pip' ? 'pip' : 'fill';

  return (
    <View style={[styles.host, { pointerEvents: 'box-none' }]} collapsable={false}>
      <View
        style={[
          baseStyle,
          styleKey === 'pip' ? { bottom: bottomOffset } : null,
          !showVideo ? agoraDmLocalPreviewStyles.hiddenCam : null,
        ]}
        pointerEvents={layout.showPipFlip && showVideo && !minimized ? 'auto' : 'none'}
        collapsable={false}
      >
        <View style={styles.surfaceClip} collapsable={false}>
          <AgoraLocalPreviewSurface
            layoutMode={surfaceLayoutMode}
            style={agoraDmLocalPreviewStyles.fill}
          />
        </View>
        {layout.showPipFlip && showVideo && !minimized ? (
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
  host: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9996,
    elevation: 9996,
  },
  surfaceClip: {
    flex: 1,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    backgroundColor: '#0a0a0a',
  },
});
