/**
 * Appel groupe N participants — Agora RTC mode communication (comme PWA GroupCallLobby).
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, View, StyleProp, ViewStyle } from 'react-native';
import type { IRtcEngine, IRtcEngineEventHandler } from 'react-native-agora';
import apiClient from '../api/client';
import type { GroupCallRtcOptions, GroupCallRtcResult } from './useGroupCallRtc.d';

type AgoraTokenPayload = {
  appId: string;
  channel: string;
  token: string;
  uid: number;
};

async function fetchGroupCallToken(callId: string): Promise<AgoraTokenPayload | null> {
  const res = await apiClient.get(`/group-calls/id/${encodeURIComponent(callId)}/token`);
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

export function useGroupCallRtc(opts: GroupCallRtcOptions): GroupCallRtcResult {
  const { callId, enabled, audioOnly } = opts;
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remoteUids, setRemoteUids] = useState<number[]>([]);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(!audioOnly);
  const engineRef = useRef<IRtcEngine | null>(null);
  const handlerRef = useRef<IRtcEngineEventHandler | null>(null);

  const leave = useCallback(async () => {
    const engine = engineRef.current;
    engineRef.current = null;
    if (engine) {
      try {
        if (handlerRef.current) {
          engine.unregisterEventHandler(handlerRef.current);
          handlerRef.current = null;
        }
        await engine.leaveChannel();
        engine.release();
      } catch {
        /* ignore */
      }
    }
    setJoined(false);
    setRemoteUids([]);
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
        const tokenData = await fetchGroupCallToken(callId);
        if (cancelled) return;
        if (!tokenData) {
          setError('Média indisponible — Agora non configuré sur le serveur.');
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
        if (!audioOnly) {
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
          onError() {
            if (cancelled) return;
            setError('Erreur de connexion à l’appel groupe.');
          },
          onUserJoined(_connection, uid) {
            if (cancelled || uid == null) return;
            setRemoteUids((prev) => (prev.includes(uid) ? prev : [...prev, uid]));
          },
          onUserOffline(_connection, uid) {
            setRemoteUids((prev) => prev.filter((x) => x !== uid));
          },
        };
        engine.registerEventHandler(eventHandler);
        handlerRef.current = eventHandler;

        const joinOptions = {
          channelProfile: ChannelProfileType.ChannelProfileCommunication,
          clientRoleType: ClientRoleType.ClientRoleBroadcaster,
          publishCameraTrack: !audioOnly,
          publishMicrophoneTrack: true,
          autoSubscribeAudio: true,
          autoSubscribeVideo: !audioOnly,
        };
        engine.joinChannel(tokenData.token, tokenData.channel, tokenData.uid, joinOptions);
      } catch {
        if (!cancelled) setError('Impossible de rejoindre l’appel groupe.');
      }
    })();

    return () => {
      cancelled = true;
      void leave();
    };
  }, [audioOnly, callId, enabled, leave]);

  const AgoraLocalView = useCallback(
    ({ style }: { style?: StyleProp<ViewStyle> }) => {
      if (audioOnly || Platform.OS === 'web') return null;
      const { RtcSurfaceView } = require('react-native-agora') as typeof import('react-native-agora');
      return (
        <RtcSurfaceView
          style={style}
          canvas={{ uid: 0 }}
          zOrderMediaOverlay
        />
      );
    },
    [audioOnly],
  );

  const AgoraRemoteGrid = useCallback(
    ({ style, uids }: { style?: StyleProp<ViewStyle>; uids?: number[] }) => {
      if (Platform.OS === 'web') return null;
      const { RtcSurfaceView } = require('react-native-agora') as typeof import('react-native-agora');
      const list = uids ?? remoteUids;
      return (
        <View style={style}>
          {list.map((uid) => (
            <RtcSurfaceView
              key={uid}
              style={{ flex: 1, minHeight: 120, margin: 4 }}
              canvas={{ uid }}
              zOrderMediaOverlay
            />
          ))}
        </View>
      );
    },
    [remoteUids],
  );

  return {
    joined,
    error,
    remoteUids,
    micOn,
    camOn,
    toggleMic,
    toggleCam,
    leave,
    AgoraLocalView,
    AgoraRemoteGrid,
  };
}
