import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, View, StyleProp, ViewStyle } from 'react-native';
import type { IRtcEngine, IRtcEngineEventHandler } from 'react-native-agora';
import agoraLiveService from '../services/agoraLiveService';

export type AgoraLiveRole = 'host' | 'audience';

export function useAgoraLiveRtc(opts: {
  liveId: string | null;
  role: AgoraLiveRole;
  enabled: boolean;
  muted?: boolean;
  /** Incrémenter à chaque appui sur « inverser la caméra » (host). */
  cameraFlipNonce?: number;
}) {
  const { liveId, role, enabled, muted = false, cameraFlipNonce = 0 } = opts;
  const [agoraError, setAgoraError] = useState<string | null>(null);
  const [agoraJoined, setAgoraJoined] = useState(false);
  const [remoteUid, setRemoteUid] = useState<number | null>(null);
  const engineRef = useRef<IRtcEngine | null>(null);
  const handlerRef = useRef<IRtcEngineEventHandler | null>(null);

  useEffect(() => {
    if (!enabled || !liveId || Platform.OS === 'web') {
      setAgoraJoined(false);
      setRemoteUid(null);
      setAgoraError(null);
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const mod = await import('react-native-agora');
        const { createAgoraRtcEngine, ChannelProfileType, ClientRoleType } = mod;

        const joinPayload =
          role === 'host' ? await agoraLiveService.joinAsHost(liveId) : await agoraLiveService.joinAsViewer(liveId);

        if (cancelled) return;
        if (!joinPayload) {
          setAgoraError(
            'Flux Agora indisponible (token ou configuration serveur : vérifiez AGORA_APP_ID / AGORA_APP_CERTIFICATE).'
          );
          return;
        }

        const engine = createAgoraRtcEngine();
        engineRef.current = engine;
        engine.initialize({ appId: joinPayload.appId });
        engine.setChannelProfile(ChannelProfileType.ChannelProfileLiveBroadcasting);
        engine.enableAudio();
        engine.enableVideo();
        engine.setDefaultAudioRouteToSpeakerphone(true);

        const isHost = role === 'host';
        if (isHost) {
          engine.startPreview();
        }

        const eventHandler: IRtcEngineEventHandler = {
          onJoinChannelSuccess() {
            if (cancelled) return;
            setAgoraJoined(true);
            setAgoraError(null);
          },
          onError(err: number, msg: string) {
            if (cancelled) return;
            setAgoraError(`Agora (${err}) ${msg || ''}`.trim());
          },
          onFirstRemoteVideoDecoded(_connection, uid) {
            if (cancelled) return;
            setRemoteUid((prev) => prev ?? uid);
          },
        };

        engine.registerEventHandler(eventHandler);
        handlerRef.current = eventHandler;

        const options = {
          channelProfile: ChannelProfileType.ChannelProfileLiveBroadcasting,
          clientRoleType: isHost ? ClientRoleType.ClientRoleBroadcaster : ClientRoleType.ClientRoleAudience,
          publishCameraTrack: isHost,
          publishMicrophoneTrack: isHost,
          autoSubscribeAudio: true,
          autoSubscribeVideo: true,
        };

        engine.joinChannel(joinPayload.token, joinPayload.channel, joinPayload.uid, options);
      } catch (e) {
        if (!cancelled) setAgoraError((e as Error)?.message ?? 'Module Agora indisponible');
      }
    })();

    return () => {
      cancelled = true;
      const engine = engineRef.current;
      const handler = handlerRef.current;
      if (engine && handler) {
        try {
          engine.unregisterEventHandler(handler);
        } catch {
          /* ignore */
        }
      }
      try {
        engine?.leaveChannel();
        engine?.release();
      } catch {
        /* ignore */
      }
      engineRef.current = null;
      handlerRef.current = null;
      setAgoraJoined(false);
      setRemoteUid(null);
    };
  }, [enabled, liveId, role]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || !agoraJoined) return;
    try {
      engine.muteLocalAudioStream(!!muted);
    } catch {
      /* ignore */
    }
  }, [muted, agoraJoined]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || !agoraJoined || role !== 'host' || cameraFlipNonce === 0) return;
    try {
      engine.switchCamera();
    } catch {
      /* ignore */
    }
  }, [cameraFlipNonce, agoraJoined, role]);

  const AgoraLocalView = useCallback(
    ({ style }: { style?: StyleProp<ViewStyle> }) => {
      if (Platform.OS === 'web' || role !== 'host') return null;
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { RtcSurfaceView } = require('react-native-agora') as typeof import('react-native-agora');
      return <RtcSurfaceView style={style} canvas={{ uid: 0 }} />;
    },
    [role]
  );

  const AgoraRemoteView = useCallback(
    ({ style }: { style?: StyleProp<ViewStyle> }) => {
      if (Platform.OS === 'web') return <View style={style as ViewStyle} />;
      if (!remoteUid) return <View style={style as ViewStyle} />;
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { RtcSurfaceView } = require('react-native-agora') as typeof import('react-native-agora');
      return <RtcSurfaceView style={style} canvas={{ uid: remoteUid }} />;
    },
    [remoteUid]
  );

  return { agoraJoined, agoraError, remoteUid, AgoraLocalView, AgoraRemoteView };
}
