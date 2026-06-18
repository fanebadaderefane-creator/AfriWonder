/**
 * Preview caméra avant acceptation — appel vidéo entrant (parité WhatsApp).
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, View, type StyleProp, type ViewStyle } from 'react-native';
import apiClient from '../api/client';
import { requestNativeCallPermissions } from '../call/callNativeMedia';
import { logAfwCall } from '../call/callDiagnosticLog';

async function fetchAgoraAppId(callId: string): Promise<string | null> {
  const res = await apiClient.get(`/calls/${encodeURIComponent(callId)}/agora-token`);
  const agora = res.data?.data?.agora ?? res.data?.agora;
  const appId = agora?.appId;
  return appId ? String(appId) : null;
}

export function useIncomingCallVideoPreview(opts: { callId: string; enabled: boolean }) {
  const { callId, enabled } = opts;
  const engineRef = useRef<ReturnType<
    typeof import('react-native-agora').createAgoraRtcEngine
  > | null>(null);
  const [previewOn, setPreviewOn] = useState(true);
  const [ready, setReady] = useState(false);

  const stopPreview = useCallback(async () => {
    const engine = engineRef.current;
    engineRef.current = null;
    setReady(false);
    if (!engine) return;
    try {
      engine.stopPreview();
      engine.release();
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!enabled || !callId || Platform.OS === 'web') {
      void stopPreview();
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const permitted = await requestNativeCallPermissions(true);
        if (!permitted || cancelled) return;
        const appId = await fetchAgoraAppId(callId);
        if (!appId || cancelled) return;
        const mod = await import('react-native-agora');
        const engine = mod.createAgoraRtcEngine();
        engineRef.current = engine;
        engine.initialize({ appId });
        engine.enableVideo();
        engine.enableLocalVideo(true);
        engine.startPreview();
        if (!cancelled) {
          setReady(true);
          logAfwCall('incoming_preview_started', { callId });
        }
      } catch (e) {
        logAfwCall('incoming_preview_failed', { callId, error: String(e) });
      }
    })();
    return () => {
      cancelled = true;
      void stopPreview();
    };
  }, [callId, enabled, stopPreview]);

  const togglePreview = useCallback(() => {
    const engine = engineRef.current;
    if (!engine || !ready) return;
    const next = !previewOn;
    try {
      if (next) {
        engine.enableLocalVideo(true);
        engine.startPreview();
        engine.muteLocalVideoStream(false);
      } else {
        engine.muteLocalVideoStream(true);
        engine.stopPreview();
      }
    } catch {
      /* ignore */
    }
    setPreviewOn(next);
  }, [previewOn, ready]);

  const PreviewView = useCallback(
    ({ style }: { style?: StyleProp<ViewStyle> }) => {
      if (!ready || !previewOn || Platform.OS === 'web') return <View style={style} />;
      const { RtcSurfaceView } = require('react-native-agora') as typeof import('react-native-agora');
      return <RtcSurfaceView style={style} canvas={{ uid: 0 }} zOrderMediaOverlay={false} />;
    },
    [previewOn, ready],
  );

  return { PreviewView, previewOn, togglePreview, ready, stopPreview };
}
