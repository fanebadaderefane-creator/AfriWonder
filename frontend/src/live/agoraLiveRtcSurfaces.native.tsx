/**
 * Surfaces Agora live — RtcSurfaceView protégé (uid local 0 ou distant).
 */
import React, { memo, useEffect } from 'react';
import { Platform, View, type StyleProp, type ViewStyle } from 'react-native';
import {
  shouldMountAgoraLiveLocalSurface,
  shouldMountAgoraLiveRemoteSurface,
} from './agoraLiveSurfaceGuard';

const FALLBACK_STYLE: ViewStyle = { flex: 1, backgroundColor: '#0a0a0a' };

function renderRtcSurface(
  uid: number,
  style: StyleProp<ViewStyle> | undefined,
  zOrderMediaOverlay?: boolean,
): React.ReactNode {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('react-native-agora') as typeof import('react-native-agora') & {
      RtcSurfaceView?: React.ComponentType<{
        style?: StyleProp<ViewStyle>;
        canvas?: { uid?: number; renderMode?: number; mirrorMode?: number };
        zOrderMediaOverlay?: boolean;
      }>;
      RenderModeType?: { RenderModeFit?: number };
      VideoMirrorModeType?: { VideoMirrorModeEnabled?: number };
    };
    const { RtcSurfaceView } = mod;
    if (!RtcSurfaceView) {
      return <View style={[style, FALLBACK_STYLE]} />;
    }
    const canvas = {
      uid,
      renderMode: mod.RenderModeType?.RenderModeFit ?? 1,
      mirrorMode:
        uid === 0
          ? (mod.VideoMirrorModeType?.VideoMirrorModeEnabled ?? 1)
          : (mod.VideoMirrorModeType?.VideoMirrorModeDisabled ?? 0),
    };
    return (
      <RtcSurfaceView
        style={style}
        canvas={canvas}
        zOrderMediaOverlay={zOrderMediaOverlay ?? uid === 0}
      />
    );
  } catch {
    return <View style={[style, FALLBACK_STYLE]} />;
  }
}

export const AgoraLiveLocalSurface = memo(function AgoraLiveLocalSurface({
  style,
  role,
  previewReady,
}: {
  style?: StyleProp<ViewStyle>;
  role: 'host' | 'audience';
  previewReady: boolean;
}) {
  const mount = shouldMountAgoraLiveLocalSurface({
    platform: Platform.OS,
    role,
    previewReady,
  });

  useEffect(() => {
    if (!mount) return;
    return () => {
      /* detach */
    };
  }, [mount]);

  if (!mount) return null;
  return renderRtcSurface(0, style, true);
});

export const AgoraLiveRemoteSurface = memo(function AgoraLiveRemoteSurface({
  style,
  uid,
  joined,
}: {
  style?: StyleProp<ViewStyle>;
  uid: number | null;
  joined: boolean;
}) {
  const mount = shouldMountAgoraLiveRemoteSurface({
    platform: Platform.OS,
    joined,
    remoteUid: uid,
  });
  if (!mount || uid == null) return <View style={style as ViewStyle} />;
  return renderRtcSurface(uid, style, false);
});

export const AgoraLiveRemoteGridSurface = memo(function AgoraLiveRemoteGridSurface({
  uids,
  style,
  maxCells = 5,
  joined,
}: {
  uids: number[];
  style?: StyleProp<ViewStyle>;
  maxCells?: number;
  joined: boolean;
}) {
  const list = uids.slice(0, Math.max(1, Math.min(6, maxCells)));
  if (Platform.OS === 'web' || !joined || list.length === 0) return null;

  const { Dimensions } = require('react-native') as typeof import('react-native');
  const w = Dimensions.get('window').width;
  const gap = 6;
  const pad = 8;
  const inner = w - pad * 2;
  const cellW = list.length === 1 ? inner : (inner - gap) / 2;
  const cellH = Math.round(list.length === 1 ? inner * 0.52 : cellW * 1.12);

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap,
          justifyContent: 'center',
          paddingHorizontal: pad,
        },
        style as ViewStyle,
      ]}
    >
      {list.map((uid) => (
        <View key={uid} style={{ width: cellW, height: cellH, borderRadius: 10, overflow: 'hidden' }}>
          {renderRtcSurface(uid, { width: cellW, height: cellH }, false)}
        </View>
      ))}
    </View>
  );
});
