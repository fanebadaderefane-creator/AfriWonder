/**
 * Preview caméra avant acceptation — appel vidéo entrant (parité WhatsApp).
 * Réutilise agoraDmPreviewSession — pas de release à l’acceptation.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Platform, View, type StyleProp, type ViewStyle } from 'react-native';
import {
  activateAgoraDmVideoPreview,
  isAgoraDmPreviewHandoffPending,
  releaseAgoraDmPreviewSession,
  setAgoraDmPreviewVideoEnabled,
} from '../call/agoraDmPreviewSession';
import { logAfwCall } from '../call/callDiagnosticLog';

export function useIncomingCallVideoPreview(opts: { callId: string; enabled: boolean }) {
  const { callId, enabled } = opts;
  const [previewOn, setPreviewOn] = useState(true);
  const [ready, setReady] = useState(false);

  const stopPreview = useCallback(async () => {
    await releaseAgoraDmPreviewSession('incoming_overlay_stop');
    setReady(false);
  }, []);

  useEffect(() => {
    if (!enabled || !callId || Platform.OS === 'web') {
      if (callId && !isAgoraDmPreviewHandoffPending(callId)) {
        void releaseAgoraDmPreviewSession('incoming_overlay_disabled');
      }
      setReady(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      const ok = await activateAgoraDmVideoPreview(callId);
      if (!cancelled) {
        setReady(ok);
        if (ok) logAfwCall('incoming_preview_started', { callId });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [callId, enabled]);

  const togglePreview = useCallback(() => {
    if (!ready || !callId) return;
    const next = !previewOn;
    setAgoraDmPreviewVideoEnabled(callId, next);
    setPreviewOn(next);
  }, [callId, previewOn, ready]);

  const PreviewView = useCallback(
    ({ style }: { style?: StyleProp<ViewStyle> }) => {
      /** Une seule RtcTextureView — overlay root après acceptation (évite double bind / noir). */
      if (!ready || !previewOn || Platform.OS === 'web') {
        return <View style={[style, { backgroundColor: '#101822' }]} />;
      }
      return <View style={[style, { backgroundColor: '#101822' }]} />;
    },
    [previewOn, ready],
  );

  return { PreviewView, previewOn, togglePreview, ready, stopPreview };
}
