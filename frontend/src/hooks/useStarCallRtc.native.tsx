/**
 * Hook Agora 1-à-1 pour les appels vidéo payants (User ↔ Star).
 * Module ISOLÉ — n'utilise pas le service live. Appelle directement
 * `starsApi.getAgoraToken(bookingId)` et initialise un `ChannelProfileCommunication`.
 *
 * Spécificités :
 *  - Les deux participants publient caméra + micro.
 *  - Fallback audio : si `disableVideo` prolongé (qualité réseau faible),
 *    on coupe la vidéo localement mais on garde l'audio.
 *  - Timer : `remoteJoined` passe à true quand l'autre arrive → l'écran d'appel
 *    déclenche son propre compte à rebours.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, View, StyleProp, ViewStyle } from 'react-native';
import type { IRtcEngine, IRtcEngineEventHandler } from 'react-native-agora';
import starsApi from '../api/starsApi';
import type { StarCallRtcOptions, StarCallRtcResult } from './useStarCallRtc.d';

export function useStarCallRtc(opts: StarCallRtcOptions): StarCallRtcResult {
  const { bookingId, enabled, muted = false, videoEnabled = true, cameraFlipNonce = 0, onRemoteJoined, onRemoteLeft, onError } = opts;
  const engineRef = useRef<IRtcEngine | null>(null);
  const handlerRef = useRef<IRtcEngineEventHandler | null>(null);
  const remoteUidRef = useRef<number | null>(null);
  const [joined, setJoined] = useState(false);
  const [remoteJoined, setRemoteJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioFallback, setAudioFallback] = useState(false);

  useEffect(() => {
    if (!enabled || !bookingId || Platform.OS === 'web') {
      setJoined(false);
      setRemoteJoined(false);
      setError(null);
      return;
    }
    let cancelled = false;

    void (async () => {
      try {
        const [tokenData, mod] = await Promise.all([
          starsApi.getAgoraToken(bookingId),
          import('react-native-agora'),
        ]);
        if (cancelled) return;

        const { createAgoraRtcEngine, ChannelProfileType, ClientRoleType } = mod;
        const engine = createAgoraRtcEngine();
        engineRef.current = engine;
        engine.initialize({ appId: tokenData.app_id });
        engine.setChannelProfile(ChannelProfileType.ChannelProfileCommunication);
        engine.enableAudio();
        if (videoEnabled) engine.enableVideo();
        else engine.disableVideo();
        engine.setDefaultAudioRouteToSpeakerphone(true);
        if (videoEnabled) engine.startPreview();

        const eventHandler: IRtcEngineEventHandler = {
          onJoinChannelSuccess() {
            if (cancelled) return;
            setJoined(true);
            setError(null);
          },
          onError(_conn, errCode) {
            if (cancelled) return;
            const msg = `Erreur appel (code ${errCode}).`;
            setError(msg);
            onError?.(msg);
          },
          onUserJoined(_conn, uid) {
            if (cancelled || uid == null) return;
            remoteUidRef.current = uid;
            setRemoteJoined(true);
            onRemoteJoined?.();
          },
          onUserOffline(_conn, uid) {
            if (cancelled) return;
            if (remoteUidRef.current === uid) {
              remoteUidRef.current = null;
              setRemoteJoined(false);
              onRemoteLeft?.();
            }
          },
          onRemoteVideoStateChanged(_conn, _uid, state) {
            if (state === 0 /* stopped/muted */) setAudioFallback(true);
            else if (state === 2 /* decoding */) setAudioFallback(false);
          },
        };
        engine.registerEventHandler(eventHandler);
        handlerRef.current = eventHandler;

        const options = {
          channelProfile: ChannelProfileType.ChannelProfileCommunication,
          clientRoleType: ClientRoleType.ClientRoleBroadcaster,
          publishCameraTrack: videoEnabled,
          publishMicrophoneTrack: true,
          autoSubscribeAudio: true,
          autoSubscribeVideo: true,
        };
        engine.joinChannel(tokenData.token, tokenData.channel, tokenData.uid, options);
      } catch (e) {
        if (cancelled) return;
        const msg = (e as Error)?.message || 'Impossible d\'initialiser l\'appel.';
        setError(msg);
        onError?.(msg);
      }
    })();

    return () => {
      cancelled = true;
      const engine = engineRef.current;
      const handler = handlerRef.current;
      if (engine && handler) {
        try { engine.unregisterEventHandler(handler); } catch { /* ignore */ }
      }
      try { engine?.leaveChannel(); engine?.release(); } catch { /* ignore */ }
      engineRef.current = null;
      handlerRef.current = null;
      setJoined(false);
      setRemoteJoined(false);
      remoteUidRef.current = null;
    };
  }, [bookingId, enabled, videoEnabled, onRemoteJoined, onRemoteLeft, onError]);

  // Mute audio dynamique
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || !joined) return;
    try { engine.muteLocalAudioStream(!!muted); } catch { /* ignore */ }
  }, [muted, joined]);

  // Toggle vidéo dynamique (fallback audio volontaire)
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || !joined) return;
    try {
      if (videoEnabled) {
        engine.enableLocalVideo(true);
        engine.muteLocalVideoStream(false);
      } else {
        engine.muteLocalVideoStream(true);
        engine.enableLocalVideo(false);
      }
    } catch { /* ignore */ }
  }, [videoEnabled, joined]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || !joined || cameraFlipNonce === 0) return;
    try { engine.switchCamera(); } catch { /* ignore */ }
  }, [cameraFlipNonce, joined]);

  const LocalView = useCallback(({ style }: { style?: StyleProp<ViewStyle> }) => {
    if (Platform.OS === 'web' || !videoEnabled) return <View style={style as ViewStyle} />;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { RtcSurfaceView } = require('react-native-agora') as typeof import('react-native-agora');
    return <RtcSurfaceView style={style} canvas={{ uid: 0 }} />;
  }, [videoEnabled]);

  const RemoteView = useCallback(({ style }: { style?: StyleProp<ViewStyle> }) => {
    const uid = remoteUidRef.current;
    if (Platform.OS === 'web' || uid == null) return <View style={style as ViewStyle} />;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { RtcSurfaceView } = require('react-native-agora') as typeof import('react-native-agora');
    return <RtcSurfaceView style={style} canvas={{ uid }} />;
  }, []);

  return { joined, error, remoteJoined, audioFallback, LocalView, RemoteView };
}
