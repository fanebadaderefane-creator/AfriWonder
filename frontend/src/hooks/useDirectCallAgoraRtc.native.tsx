/**
 * Appel DM 1:1 — média Agora RTC (remplace WebRTC/TURN sur natif).
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, View, type StyleProp, type ViewStyle } from 'react-native';
import type { IRtcEngine, IRtcEngineEventHandler } from 'react-native-agora';
import apiClient from '../api/client';
import { connectionQualityFromAgoraNetwork } from '../call/agoraConnectionQuality';
import {
  ensureAgoraFrontCamera,
  logAgoraSwitchCamera,
  logCameraFacingSelected,
  logLocalStreamAttached,
  rebindAgoraLocalPreview,
} from '../call/agoraCallVideoBind.native';
import { shouldAgoraSwitchCameraOnNonce } from '../call/agoraCallVideoBind';
import { logAfwCall } from '../call/callDiagnosticLog';
import { requestNativeCallPermissions } from '../call/callNativeMedia';
import { toggleAgoraScreenShare } from '../call/agoraScreenShare';
import { AgoraLocalPreviewSurface } from '../call/agoraLocalPreviewSurface.native';
import { AgoraRemoteVideoSurface } from '../call/agoraRemoteVideoSurface.native';
import { useAgoraDmCallUiStore } from '../call/agoraDmCallUiStore';
import {
  agoraVideoEngineUnavailableMessage,
  shouldBlockSecondAgoraVideoEngine,
} from '../call/agoraDmVideoEnginePolicy';
import {
  clearAgoraDmPreviewEngineAlive,
  consumeAgoraDmPreviewEngine,
  ensureAgoraDmPreviewSession,
  releaseAgoraDmPreviewSession,
} from '../call/agoraDmPreviewSession';
import type { ConnectionQualityDisplay } from '../call/webrtcConnectionQuality';
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

function noteRemotePeer(
  uid: number,
  callId: string,
  source: string,
  remoteUidRef: React.MutableRefObject<number | null>,
  remoteNotifiedRef: React.MutableRefObject<boolean>,
  setRemoteUid: (uid: number) => void,
  setRemoteJoined: (v: boolean) => void,
  setRemoteEverJoined: (v: boolean) => void,
  onRemoteJoinedRef: React.MutableRefObject<(() => void) | undefined>,
) {
  if (remoteUidRef.current === uid && remoteNotifiedRef.current) return;
  remoteUidRef.current = uid;
  setRemoteUid(uid);
  setRemoteJoined(true);
  setRemoteEverJoined(true);
  if (!remoteNotifiedRef.current) {
    remoteNotifiedRef.current = true;
    logAfwCall('agora_remote_ready', { callId, remoteUid: uid, source });
    onRemoteJoinedRef.current?.();
  }
}

export function useDirectCallAgoraRtc(opts: DirectCallAgoraRtcOptions): DirectCallAgoraRtcResult {
  const {
    callId,
    enabled,
    audioOnly,
    muted = false,
    cameraFlipNonce = 0,
    speakerOn = true,
    onRemoteJoined,
    onRemoteLeft,
    onError,
  } = opts;

  const engineRef = useRef<IRtcEngine | null>(null);
  const handlerRef = useRef<IRtcEngineEventHandler | null>(null);
  const remoteUidRef = useRef<number | null>(null);
  const remoteNotifiedRef = useRef(false);
  const onRemoteJoinedRef = useRef(onRemoteJoined);
  const onRemoteLeftRef = useRef(onRemoteLeft);
  const onErrorRef = useRef(onError);
  const videoPublishedRef = useRef(!audioOnly);
  const [remoteUid, setRemoteUid] = useState<number | null>(null);

  const [joined, setJoined] = useState(false);
  const [remoteJoined, setRemoteJoined] = useState(false);
  const [remoteEverJoined, setRemoteEverJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(!audioOnly);
  const [videoPublished, setVideoPublished] = useState(!audioOnly);
  const [screenSharing, setScreenSharing] = useState(false);
  const screenSharingRef = useRef(false);
  const cameraFacingRef = useRef<'front' | 'back'>('front');
  const [previewActive, setPreviewActive] = useState(false);
  const [connectionDisplay, setConnectionDisplay] = useState<ConnectionQualityDisplay>({
    quality: 'fair',
    labelFr: 'Connexion…',
    bars: 2,
  });

  useEffect(() => {
    onRemoteJoinedRef.current = onRemoteJoined;
    onRemoteLeftRef.current = onRemoteLeft;
    onErrorRef.current = onError;
  }, [onRemoteJoined, onRemoteLeft, onError]);

  const leave = useCallback(async () => {
    const engine = engineRef.current;
    const handler = handlerRef.current;
    engineRef.current = null;
    handlerRef.current = null;
    remoteUidRef.current = null;
    remoteNotifiedRef.current = false;
    setRemoteUid(null);
    if (engine) {
      try {
        if (screenSharingRef.current) {
          try {
            engine.stopScreenCapture();
          } catch {
            /* ignore */
          }
          screenSharingRef.current = false;
          setScreenSharing(false);
        }
        if (handler) engine.unregisterEventHandler(handler);
        await engine.leaveChannel();
        engine.release();
      } catch {
        /* ignore */
      }
    }
    setJoined(false);
    setRemoteJoined(false);
    setRemoteEverJoined(false);
    setPreviewActive(false);
    if (callId) clearAgoraDmPreviewEngineAlive(callId, 'rtc_leave');
    await releaseAgoraDmPreviewSession('rtc_leave');
  }, [callId]);

  const toggleMic = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    const next = !micOn;
    engine.muteLocalAudioStream(!next);
    setMicOn(next);
  }, [micOn]);

  const toggleCam = useCallback(() => {
    if (!videoPublishedRef.current || screenSharingRef.current) return;
    const engine = engineRef.current;
    if (!engine) return;
    const next = !camOn;
    engine.muteLocalVideoStream(!next);
    if (next) {
      rebindAgoraLocalPreview(engine, { callId, reason: 'toggle_cam_on' });
    }
    setCamOn(next);
  }, [callId, camOn]);

  const upgradeToVideo = useCallback(async (): Promise<{ ok: boolean; message?: string }> => {
    const engine = engineRef.current;
    if (!engine || !joined) {
      return { ok: false, message: 'Attendez que l’appel soit connecté.' };
    }
    if (videoPublishedRef.current) return { ok: true };
    const permitted = await requestNativeCallPermissions(true);
    if (!permitted) {
      return {
        ok: false,
        message: 'Caméra non autorisée. Autorisez la caméra dans Réglages → AfriWonder.',
      };
    }
    try {
      const mod = await import('react-native-agora');
      const ChannelMediaOptions = mod.ChannelMediaOptions as (new () => {
        publishCameraTrack?: boolean;
        publishMicrophoneTrack?: boolean;
        publishScreenCaptureVideo?: boolean;
        publishScreenCaptureAudio?: boolean;
        autoSubscribeVideo?: boolean;
      }) | undefined;
      engine.enableVideo();
      engine.enableLocalVideo(true);
      ensureAgoraFrontCamera(engine, { callId, phase: 'upgrade_to_video' });
      cameraFacingRef.current = 'front';
      engine.startPreview();
      logLocalStreamAttached({ callId, phase: 'upgrade_to_video' });
      try {
        engine.muteAllRemoteVideoStreams(false);
      } catch {
        /* ignore */
      }
      const pub = ChannelMediaOptions ? new ChannelMediaOptions() : ({} as Record<string, boolean>);
      pub.publishCameraTrack = true;
      pub.publishMicrophoneTrack = true;
      pub.publishScreenCaptureVideo = false;
      pub.publishScreenCaptureAudio = false;
      pub.autoSubscribeVideo = true;
      const rUp = engine.updateChannelMediaOptions(pub);
      if (typeof rUp === 'number' && rUp !== 0) {
        return { ok: false, message: `Publication vidéo refusée (code ${rUp}).` };
      }
      videoPublishedRef.current = true;
      setVideoPublished(true);
      setCamOn(true);
      logAfwCall('agora_upgrade_video', { callId });
      return { ok: true };
    } catch (e) {
      return { ok: false, message: (e as Error)?.message || 'Impossible de passer en vidéo.' };
    }
  }, [callId, joined]);

  const toggleScreenShare = useCallback(async () => {
    const engine = engineRef.current;
    const hadCameraPreview = videoPublishedRef.current && camOn;
    const result = await toggleAgoraScreenShare(engine, screenSharingRef.current, {
      hadCameraPreview,
    });
    if (result.ok && typeof result.on === 'boolean') {
      screenSharingRef.current = result.on;
      setScreenSharing(result.on);
      if (!result.on && camOn && engine) {
        rebindAgoraLocalPreview(engine, { callId, reason: 'screen_share_end' });
      }
      logAfwCall('agora_screen_share', { callId, active: result.on });
    }
    return result;
  }, [callId, camOn]);

  useEffect(() => {
    videoPublishedRef.current = videoPublished;
  }, [videoPublished]);

  useEffect(() => {
    if (!enabled || !callId || Platform.OS === 'web') {
      void leave();
      return;
    }
    let cancelled = false;

    void (async () => {
      try {
        setError(null);
        remoteNotifiedRef.current = false;
        const tokenData = await fetchDirectCallAgoraToken(callId);
        if (cancelled) return;
        if (!tokenData) {
          const msg = 'Média indisponible — Agora non configuré sur le serveur.';
          setError(msg);
          logAfwCall('agora_token_missing', { callId });
          onErrorRef.current?.(msg);
          return;
        }

        logAfwCall('agora_token_ok', {
          callId,
          channel: tokenData.channel,
          uid: tokenData.uid,
        });

        const mod = await import('react-native-agora');
        const { createAgoraRtcEngine, ChannelProfileType, ClientRoleType, AudioScenarioType } = mod;

        let adoptedEngine = consumeAgoraDmPreviewEngine(callId);
        if (!adoptedEngine && !audioOnly) {
          await ensureAgoraDmPreviewSession(callId);
          if (cancelled) return;
          adoptedEngine = consumeAgoraDmPreviewEngine(callId);
        }
        if (shouldBlockSecondAgoraVideoEngine(audioOnly, adoptedEngine)) {
          const msg = agoraVideoEngineUnavailableMessage();
          setError(msg);
          logAfwCall('agora_video_engine_missing', { callId });
          onErrorRef.current?.(msg);
          return;
        }
        const adoptedPreview = adoptedEngine != null;

        const engine = adoptedEngine ?? createAgoraRtcEngine();
        engineRef.current = engine;

        if (!adoptedPreview) {
          engine.initialize({ appId: tokenData.appId });
        }

        engine.setChannelProfile(ChannelProfileType.ChannelProfileCommunication);
        engine.setAudioScenario(AudioScenarioType.AudioScenarioChatroom);
        engine.enableAudio();
        engine.enableLocalAudio(true);
        engine.setDefaultAudioRouteToSpeakerphone(true);

        const publishVideo = !audioOnly;
        if (publishVideo) {
          if (!adoptedPreview) {
            engine.enableVideo();
            engine.enableLocalVideo(true);
            ensureAgoraFrontCamera(engine, { callId, phase: 'init' });
            cameraFacingRef.current = 'front';
            engine.startPreview();
            logLocalStreamAttached({ callId, phase: 'init' });
          } else {
            logAfwCall('LOCAL_STREAM_REUSED', { callId, phase: 'adopted_preview' });
            rebindAgoraLocalPreview(engine, { callId, reason: 'adopted_preview' });
          }
          if (!cancelled) setPreviewActive(true);
        } else {
          engine.disableVideo();
        }

        const eventHandler: IRtcEngineEventHandler = {
          onJoinChannelSuccess(_conn, elapsed) {
            if (cancelled) return;
            setJoined(true);
            setError(null);
            try {
              engine.setEnableSpeakerphone(true);
              engine.adjustPlaybackSignalVolume(100);
              engine.adjustRecordingSignalVolume(100);
              engine.muteLocalAudioStream(false);
              engine.muteAllRemoteAudioStreams(false);
              if (!audioOnly) {
                engine.muteAllRemoteVideoStreams(false);
                rebindAgoraLocalPreview(engine, { callId, reason: 'join_ok' });
              }
            } catch {
              /* ignore */
            }
            logAfwCall('agora_join_ok', { callId, channel: tokenData.channel, elapsed });
          },
          onError(_conn, errCode) {
            if (cancelled) return;
            const msg = `Erreur connexion média (code ${errCode}).`;
            setError(msg);
            logAfwCall('agora_error', { callId, errCode });
            onErrorRef.current?.(msg);
          },
          onUserJoined(_conn, uid) {
            if (cancelled || uid == null) return;
            noteRemotePeer(
              uid,
              callId,
              'onUserJoined',
              remoteUidRef,
              remoteNotifiedRef,
              setRemoteUid,
              setRemoteJoined,
              setRemoteEverJoined,
              onRemoteJoinedRef,
            );
          },
          onFirstRemoteVideoDecoded(_conn, uid) {
            if (cancelled || uid == null) return;
            noteRemotePeer(
              uid,
              callId,
              'onFirstRemoteVideoDecoded',
              remoteUidRef,
              remoteNotifiedRef,
              setRemoteUid,
              setRemoteJoined,
              setRemoteEverJoined,
              onRemoteJoinedRef,
            );
          },
          onRemoteAudioStateChanged(_conn, uid, state) {
            if (cancelled || uid == null) return;
            logAfwCall('agora_remote_audio_state', { callId, remoteUid: uid, state });
            if (state === 2 /* Decoding */) {
              noteRemotePeer(
                uid,
                callId,
                'onRemoteAudioStateChanged',
                remoteUidRef,
                remoteNotifiedRef,
                setRemoteUid,
                setRemoteJoined,
                setRemoteEverJoined,
                onRemoteJoinedRef,
              );
            }
          },
          onUserOffline(_conn, uid) {
            if (cancelled) return;
            if (remoteUidRef.current === uid) {
              remoteUidRef.current = null;
              remoteNotifiedRef.current = false;
              setRemoteUid(null);
              setRemoteJoined(false);
              logAfwCall('agora_remote_left', { callId, remoteUid: uid });
              onRemoteLeftRef.current?.();
            }
          },
          onNetworkQuality(_conn, _uid, txQuality, rxQuality) {
            if (cancelled) return;
            setConnectionDisplay(connectionQualityFromAgoraNetwork(rxQuality, txQuality));
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
        logAfwCall('agora_join_failed', { callId, error: msg });
        onErrorRef.current?.(msg);
      }
    })();

    return () => {
      cancelled = true;
      void leave();
    };
  }, [audioOnly, callId, enabled, leave]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || !joined || audioOnly) return;
    try {
      engine.muteLocalVideoStream(!camOn);
    } catch {
      /* ignore */
    }
  }, [audioOnly, camOn, joined]);

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
    if (!engine || !joined) return;
    try {
      engine.setEnableSpeakerphone(!!speakerOn);
    } catch {
      /* ignore */
    }
  }, [joined, speakerOn]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || !joined || !videoPublished) return;
    if (!shouldAgoraSwitchCameraOnNonce(cameraFlipNonce)) return;
    try {
      logAgoraSwitchCamera({ callId, nonce: cameraFlipNonce });
      engine.switchCamera();
      cameraFacingRef.current = cameraFacingRef.current === 'front' ? 'back' : 'front';
      logCameraFacingSelected(cameraFacingRef.current, { callId, nonce: cameraFlipNonce });
      rebindAgoraLocalPreview(engine, { callId, reason: 'switch_camera' });
    } catch {
      /* ignore */
    }
  }, [callId, cameraFlipNonce, joined, videoPublished]);

  const refreshLocalPreview = useCallback(
    (reason: string) => {
      const engine = engineRef.current;
      if (!engine || !videoPublishedRef.current) return;
      rebindAgoraLocalPreview(engine, { callId, reason });
      if (reason.includes('pip') || reason.includes('layout_')) {
        setTimeout(() => {
          const eng = engineRef.current;
          if (eng) rebindAgoraLocalPreview(eng, { callId, reason: `${reason}_retry` });
        }, 280);
      }
    },
    [callId],
  );

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || !remoteEverJoined || !videoPublished) return;
    rebindAgoraLocalPreview(engine, { callId, reason: 'remote_ever_joined_pip' });
  }, [callId, remoteEverJoined, videoPublished]);

  useEffect(() => {
    useAgoraDmCallUiStore.getState().registerLocalPreviewRefresh(refreshLocalPreview);
    return () => {
      useAgoraDmCallUiStore.getState().registerLocalPreviewRefresh(null);
    };
  }, [refreshLocalPreview]);

  const LocalView = useCallback(
    ({ style }: { style?: StyleProp<ViewStyle> }) => {
      if (!videoPublished || Platform.OS === 'web') return <View style={style} />;
      return <AgoraLocalPreviewSurface style={style} />;
    },
    [videoPublished],
  );

  const RemoteView = useCallback(
    ({ style }: { style?: StyleProp<ViewStyle> }) => {
      if (Platform.OS === 'web' || remoteUid == null) return <View style={style} />;
      return <AgoraRemoteVideoSurface remoteUid={remoteUid} style={style} />;
    },
    [remoteUid],
  );

  return {
    joined,
    error,
    remoteJoined,
    remoteEverJoined,
    micOn,
    camOn,
    screenSharing,
    connectionDisplay,
    videoPublished,
    previewActive,
    toggleMic,
    toggleCam,
    toggleScreenShare,
    upgradeToVideo,
    leave,
    refreshLocalPreview,
    LocalView,
    RemoteView,
  };
}
