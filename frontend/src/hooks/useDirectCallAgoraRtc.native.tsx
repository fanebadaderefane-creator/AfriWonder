/**
 * Appel DM 1:1 — média Agora RTC (remplace WebRTC/TURN sur natif).
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, View, type StyleProp, type ViewStyle } from 'react-native';
import type { IRtcEngine, IRtcEngineEventHandler } from 'react-native-agora';
import apiClient from '../api/client';
import type { DirectCallAgoraRtcOptions, DirectCallAgoraRtcResult } from './useDirectCallAgoraRtc.d';

type AgoraTokenPayload = {
  appId: string;
  channel: string;
  token: string;
  uid: number;
};

async function fetchDirectCallAgoraToken(callId: string): Promise<AgoraTokenPayload | null> {
  const res = await apiClient.get(`/calls/${encodeURIComponent(callId)}/agora-token`);
  const data = res.data?.data ?? res.data;
  const agora = data?.agora;
  if (!agora?.appId || !agora?.channel || !agora?.token) return null;
  return {
    appId: String(agora.appId),
    channel: String(agora.channel),
    token: String(agora.token),
    uid: Number(agora.uid ?? 0),
  };
}

export function useDirectCallAgoraRtc(opts: DirectCallAgoraRtcOptions): DirectCallAgoraRtcResult {
  const {
    callId,
    enabled,
    audioOnly,
    muted = false,
    videoEnabled = true,
    cameraFlipNonce = 0,
    onRemoteJoined,
    onRemoteLeft,
    onError,
  } = opts;

  const engineRef = useRef<IRtcEngine | null>(null);
  const handlerRef = useRef<IRtcEngineEventHandler | null>(null);
  const remoteUidRef = useRef<number | null>(null);
  const [remoteUid, setRemoteUid] = useState<number | null>(null);

  const [joined, setJoined] = useState(false);
  const [remoteJoined, setRemoteJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(!audioOnly && videoEnabled);

  const leave = useCallback(async () => {
    const engine = engineRef.current;
    const handler = handlerRef.current;
    engineRef.current = null;
    handlerRef.current = null;
    remoteUidRef.current = null;
    setRemoteUid(null);
    if (engine) {
      try {
        if (handler) engine.unregisterEventHandler(handler);
        await engine.leaveChannel();
        engine.release();
      } catch {
        /* ignore */
      }
    }
    setJoined(false);
    setRemoteJoined(false);
  }, []);

  const toggleMic = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    const next = !micOn;
    engine.muteLocalAudioStream(!next);
    setMicOn(next);
  }, [micOn]);

  const toggleCam = useCallback(() => {
    if (audioOnly) return;
    const engine = engineRef.current;
    if (!engine) return;
    const next = !camOn;
    engine.muteLocalVideoStream(!next);
    setCamOn(next);
  }, [audioOnly, camOn]);

  useEffect(() => {
    if (!enabled || !callId || Platform.OS === 'web') {
      void leave();
      return;
    }
    let cancelled = false;

    void (async () => {
      try {
        setError(null);
        const tokenData = await fetchDirectCallAgoraToken(callId);
        if (cancelled) return;
        if (!tokenData) {
          const msg = 'Média indisponible — Agora non configuré sur le serveur.';
          setError(msg);
          onError?.(msg);
          return;
        }

        const mod = await import('react-native-agora');
        const { createAgoraRtcEngine, ChannelProfileType, ClientRoleType } = mod;
        const engine = createAgoraRtcEngine();
        engineRef.current = engine;
        engine.initialize({ appId: tokenData.appId });
        engine.setChannelProfile(ChannelProfileType.ChannelProfileCommunication);
        engine.enableAudio();
        engine.setDefaultAudioRouteToSpeakerphone(true);

        const publishVideo = !audioOnly && videoEnabled;
        if (publishVideo) {
          engine.enableVideo();
          engine.startPreview();
        } else {
          engine.disableVideo();
        }

        const eventHandler: IRtcEngineEventHandler = {
          onJoinChannelSuccess() {
            if (cancelled) return;
            setJoined(true);
            setError(null);
          },
          onError(_conn, errCode) {
            if (cancelled) return;
            const msg = `Erreur connexion média (code ${errCode}).`;
            setError(msg);
            onError?.(msg);
          },
          onUserJoined(_conn, uid) {
            if (cancelled || uid == null) return;
            remoteUidRef.current = uid;
            setRemoteUid(uid);
            setRemoteJoined(true);
            onRemoteJoined?.();
          },
          onUserOffline(_conn, uid) {
            if (cancelled) return;
            if (remoteUidRef.current === uid) {
              remoteUidRef.current = null;
              setRemoteUid(null);
              setRemoteJoined(false);
              onRemoteLeft?.();
            }
          },
        };
        engine.registerEventHandler(eventHandler);
        handlerRef.current = eventHandler;

        engine.joinChannel(tokenData.token, tokenData.channel, tokenData.uid, {
          channelProfile: ChannelProfileType.ChannelProfileCommunication,
          clientRoleType: ClientRoleType.ClientRoleBroadcaster,
          publishCameraTrack: publishVideo,
          publishMicrophoneTrack: true,
          autoSubscribeAudio: true,
          autoSubscribeVideo: !audioOnly,
        });
      } catch (e) {
        if (cancelled) return;
        const msg = (e as Error)?.message || 'Impossible de rejoindre l’appel.';
        setError(msg);
        onError?.(msg);
      }
    })();

    return () => {
      cancelled = true;
      void leave();
    };
  }, [
    audioOnly,
    callId,
    enabled,
    leave,
    onError,
    onRemoteJoined,
    onRemoteLeft,
    videoEnabled,
  ]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || !joined) return;
    try {
      engine.muteLocalAudioStream(!!muted);
    } catch {
      /* ignore */
    }
  }, [joined, muted]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || !joined || audioOnly) return;
    try {
      engine.switchCamera();
    } catch {
      /* ignore */
    }
  }, [audioOnly, cameraFlipNonce, joined]);

  const LocalView = useCallback(
    ({ style }: { style?: StyleProp<ViewStyle> }) => {
      if (audioOnly || Platform.OS === 'web') return <View style={style} />;
      const { RtcSurfaceView } = require('react-native-agora') as typeof import('react-native-agora');
      return <RtcSurfaceView style={style} canvas={{ uid: 0 }} zOrderMediaOverlay />;
    },
    [audioOnly],
  );

  const RemoteView = useCallback(
    ({ style }: { style?: StyleProp<ViewStyle> }) => {
      if (Platform.OS === 'web' || remoteUid == null) return <View style={style} />;
      const { RtcSurfaceView } = require('react-native-agora') as typeof import('react-native-agora');
      return <RtcSurfaceView style={style} canvas={{ uid: remoteUid }} zOrderMediaOverlay />;
    },
    [remoteUid],
  );

  return {
    joined,
    error,
    remoteJoined,
    micOn,
    camOn,
    toggleMic,
    toggleCam,
    leave,
    LocalView,
    RemoteView,
  };
}
