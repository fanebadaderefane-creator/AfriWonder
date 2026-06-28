/**
 * Appel DM 1:1 — média Agora RTC (remplace WebRTC/TURN sur natif).
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, View, type StyleProp, type ViewStyle } from 'react-native';
import {
  AudioScenarioType,
  ChannelProfileType,
  ClientRoleType,
  createAgoraRtcEngine,
  type IRtcEngine,
  type IRtcEngineEventHandler,
} from 'react-native-agora';
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
import {
  clearAgoraDmActiveChannel,
  forceLeaveAgoraDmActiveChannel,
  registerAgoraDmActiveChannel,
} from '../call/agoraDmActiveChannel';
import { logAfwCall } from '../call/callDiagnosticLog';
import { logRemoteStreamRemoved } from '../call/callUiLifecycleLog';
import {
  AGORA_JOIN_OK_WATCHDOG_MS,
  shouldStopPreviewBeforeChannelJoin,
} from '../call/agoraDmJoinLifecycle';
import {
  AGORA_REMOTE_VIDEO_STATE_DECODING,
  shouldMarkAgoraRemoteEverJoined,
  shouldPromoteAgoraRemoteToConnected,
} from '../call/agoraDmChannelReady';
import { shouldLogAgoraRemoteReady } from '../call/agoraDmRemoteReady';
import { invokeAgoraEngine } from '../call/agoraEngineInvoke';
import { runCallScreenSafeEffect } from '../call/callScreenSafeEffect';
import {
  agoraJoinChannelErrorMessage,
  isAgoraConnectionStateJoined,
  isAgoraJoinChannelReturnOk,
} from '../call/agoraConnectionJoin';
import {
  prepareAgoraEngineForChannelJoin,
  shouldRetryAgoraJoinAfterRejected,
  leaveAgoraEngineChannelOnly,
} from '../call/agoraEngineChannelPrep';
import { shouldRunRtcChannelTeardown, shouldReleaseAgoraPreviewSession } from '../call/agoraRtcLifecycle';
import { isCallScreenRecovering } from '../call/callErrorRecoveryGate';
import { shouldSuppressCallInterruptedUi } from '../call/callMediaAliveRegistry';
import { requestNativeCallPermissions, applyNativeCallSpeakerRoute, stopNativeOutgoingRingback } from '../call/callNativeMedia';
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
  peekAgoraDmPreviewSession,
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
  audioOnly: boolean,
  remoteUidRef: React.MutableRefObject<number | null>,
  remoteNotifiedRef: React.MutableRefObject<boolean>,
  setRemoteUid: (uid: number) => void,
  setRemoteJoined: (v: boolean) => void,
  setRemoteEverJoined: (v: boolean) => void,
  onRemoteJoinedRef: React.MutableRefObject<(() => void) | undefined>,
) {
  if (uid != null && uid > 0) {
    remoteUidRef.current = uid;
    setRemoteUid(uid);
    setRemoteJoined(true);
    if (shouldMarkAgoraRemoteEverJoined({ audioOnly, eventSource: source })) {
      setRemoteEverJoined(true);
    }
  }
  const promoteConnected = shouldPromoteAgoraRemoteToConnected({ audioOnly, eventSource: source });
  if (!promoteConnected) return;
  if (shouldLogAgoraRemoteReady(remoteNotifiedRef.current)) {
    remoteNotifiedRef.current = true;
    logAfwCall('agora_remote_ready', { callId, remoteUid: uid, source });
  }
  onRemoteJoinedRef.current?.();
}

export function useDirectCallAgoraRtc(opts: DirectCallAgoraRtcOptions): DirectCallAgoraRtcResult {
  const {
    callId,
    enabled,
    audioOnly,
    muted = false,
    cameraFlipNonce = 0,
    speakerOn = true,
    callAbortedRef,
    onRemoteJoined,
    onRemoteLeft,
    onError,
  } = opts;

  const engineRef = useRef<IRtcEngine | null>(null);
  const handlerRef = useRef<IRtcEngineEventHandler | null>(null);
  const remoteUidRef = useRef<number | null>(null);
  const lastRemoteUidRef = useRef<number | null>(null);
  const remoteNotifiedRef = useRef(false);
  const onRemoteJoinedRef = useRef(onRemoteJoined);
  const onRemoteLeftRef = useRef(onRemoteLeft);
  const onErrorRef = useRef(onError);
  const videoPublishedRef = useRef(!audioOnly);
  const speakerOnRef = useRef(speakerOn);
  speakerOnRef.current = speakerOn;
  const joinWatchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [remoteUid, setRemoteUid] = useState<number | null>(null);

  const [joined, setJoined] = useState(false);
  const joinedRef = useRef(false);
  joinedRef.current = joined;
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

  const leave = useCallback(
    async (options?: { releasePreview?: boolean; reason?: string }) => {
      const hadChannelEngine = engineRef.current != null;
      const engine = engineRef.current;
      const handler = handlerRef.current;
      engineRef.current = null;
      handlerRef.current = null;
      if (callId) clearAgoraDmActiveChannel(callId);
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
          if (handler) {
            const unregister = (engine as { unregisterEventHandler?: (h: typeof handler) => void })
              .unregisterEventHandler;
            if (typeof unregister === 'function') {
              unregister(handler);
            }
          }
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

      const releasePreview =
        options?.releasePreview ??
        shouldReleaseAgoraPreviewSession({
          callEnded: options?.reason === 'finish_call',
          hadChannelEngine,
          previewOnlyRinging: !hadChannelEngine,
        });

      if (releasePreview) {
        if (callId) clearAgoraDmPreviewEngineAlive(callId, options?.reason ?? 'rtc_leave');
        await releaseAgoraDmPreviewSession(options?.reason ?? 'rtc_leave');
        logAfwCall('agora_preview_released', { callId, reason: options?.reason ?? 'rtc_leave' });
      } else {
        logAfwCall('agora_preview_preserved', {
          callId,
          reason: options?.reason ?? 'rtc_leave_skipped',
          hadChannelEngine,
        });
      }
    },
    [callId],
  );

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
    try {
      const muteVideo = (engine as { muteLocalVideoStream?: (mute: boolean) => number }).muteLocalVideoStream;
      if (typeof muteVideo !== 'function') return;
      muteVideo(!next);
      if (next) {
        rebindAgoraLocalPreview(engine, { callId, reason: 'toggle_cam_on' });
      }
      setCamOn(next);
    } catch {
      /* SDK Agora — méthode indisponible sur certaines versions */
    }
  }, [callId, camOn]);

  const upgradeToVideo = useCallback(async (): Promise<{ ok: boolean; message?: string }> => {
    const engine = engineRef.current;
    if (!engine || !joinedRef.current) {
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
  }, [callId]);

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

  /** Déclenche join une fois quand `enabled` passe true — évite annulation silencieuse si deps churn. */
  const joinEpochRef = useRef(0);
  const enabledWasTrueRef = useRef(false);
  const prevJoinCallIdRef = useRef(callId);
  const [joinEpoch, setJoinEpoch] = useState(0);

  useEffect(() => {
    if (prevJoinCallIdRef.current !== callId) {
      prevJoinCallIdRef.current = callId;
      enabledWasTrueRef.current = false;
    }
  }, [callId]);

  useEffect(() => {
    if (enabled && callId) {
      if (!enabledWasTrueRef.current) {
        enabledWasTrueRef.current = true;
        joinEpochRef.current += 1;
        setJoinEpoch(joinEpochRef.current);
      }
      return;
    }
    enabledWasTrueRef.current = false;
  }, [callId, enabled]);

  useEffect(() => {
    if (!callId || Platform.OS === 'web') return;
    const hasChannelEngine = engineRef.current != null;
    if (
      !shouldRunRtcChannelTeardown({
        enabled,
        hasChannelEngine,
      })
    ) {
      return;
    }
    if (!enabled) {
      void leave({ releasePreview: false, reason: 'channel_disabled' });
    }
  }, [callId, enabled, leave]);

  useEffect(() => {
    if (!callId || Platform.OS === 'web' || joinEpoch <= 0) {
      return;
    }
    const joinCallId = callId;
    let cancelled = false;
    const isJoinAborted = () => cancelled || callAbortedRef?.current === true;
    const logJoinAborted = (phase: string) => {
      logAfwCall('agora_join_aborted', {
        callId: joinCallId,
        phase,
        cancelled,
        aborted: callAbortedRef?.current === true,
      });
    };

    void (async () => {
      try {
        setError(null);
        remoteNotifiedRef.current = false;
        const tokenData = await fetchDirectCallAgoraToken(joinCallId);
        if (isJoinAborted()) {
          logJoinAborted('after_token_fetch');
          return;
        }
        if (!tokenData) {
          const msg = 'Média indisponible — Agora non configuré sur le serveur.';
          setError(msg);
          logAfwCall('agora_token_missing', { callId: joinCallId });
          onErrorRef.current?.(msg);
          return;
        }

        logAfwCall('agora_token_ok', {
          callId: joinCallId,
          channel: tokenData.channel,
          uid: tokenData.uid,
        });

        let adoptedEngine = consumeAgoraDmPreviewEngine(joinCallId);
        if (!adoptedEngine && !audioOnly) {
          await ensureAgoraDmPreviewSession(joinCallId);
          if (isJoinAborted()) {
            logJoinAborted('after_preview_ensure');
            return;
          }
          adoptedEngine = consumeAgoraDmPreviewEngine(joinCallId);
        }
        if (shouldBlockSecondAgoraVideoEngine(audioOnly, adoptedEngine)) {
          const msg = agoraVideoEngineUnavailableMessage();
          setError(msg);
          logAfwCall('agora_video_engine_missing', { callId: joinCallId });
          onErrorRef.current?.(msg);
          return;
        }
        const adoptedPreview = adoptedEngine != null;

        await forceLeaveAgoraDmActiveChannel('pre_join_stale_channel');
        if (!adoptedPreview && !peekAgoraDmPreviewSession(joinCallId)) {
          await releaseAgoraDmPreviewSession('pre_join_stale_preview');
        }
        if (isJoinAborted()) {
          logJoinAborted('after_stale_engine_cleanup');
          return;
        }

        const engine = adoptedEngine ?? createAgoraRtcEngine();
        engineRef.current = engine;
        logAfwCall('agora_engine_ready', { callId: joinCallId, adoptedPreview, audioOnly });

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

        let joinSuccessApplied = false;
        const applyJoinSuccess = (source: string, elapsed?: number) => {
          if (isJoinAborted() || joinSuccessApplied) return;
          joinSuccessApplied = true;
          if (joinWatchdogRef.current) {
            clearTimeout(joinWatchdogRef.current);
            joinWatchdogRef.current = null;
          }
          joinedRef.current = true;
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
              if (adoptedPreview) {
                try {
                  engine.startPreview();
                } catch {
                  /* ignore */
                }
              }
              rebindAgoraLocalPreview(engine, { callId: joinCallId, reason: 'join_ok' });
            }
            void stopNativeOutgoingRingback();
            void applyNativeCallSpeakerRoute(speakerOnRef.current);
          } catch {
            /* ignore */
          }
          logAfwCall('agora_join_ok', {
            callId: joinCallId,
            channel: tokenData.channel,
            elapsed: elapsed ?? null,
            source,
          });
        };

        const eventHandler: IRtcEngineEventHandler = {
          onJoinChannelSuccess(_conn, elapsed) {
            applyJoinSuccess('onJoinChannelSuccess', elapsed);
          },
          onConnectionStateChanged(_conn, state, reason) {
            if (cancelled) return;
            logAfwCall('agora_connection_state', { callId: joinCallId, state, reason });
            if (isAgoraConnectionStateJoined(Number(state))) {
              applyJoinSuccess('onConnectionStateChanged');
            }
          },
          onError(_conn, errCode) {
            if (cancelled) return;
            const msg = `Erreur connexion média (code ${errCode}).`;
            setError(msg);
            logAfwCall('agora_error', { callId: joinCallId, errCode });
            onErrorRef.current?.(msg);
          },
          onUserJoined(_conn, uid) {
            if (cancelled || uid == null) return;
            if (!audioOnly) {
              try {
                engine.muteRemoteVideoStream(uid, false);
              } catch {
                /* ignore */
              }
            }
            noteRemotePeer(
              uid,
              joinCallId,
              'onUserJoined',
              audioOnly,
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
              joinCallId,
              'onFirstRemoteVideoDecoded',
              audioOnly,
              remoteUidRef,
              remoteNotifiedRef,
              setRemoteUid,
              setRemoteJoined,
              setRemoteEverJoined,
              onRemoteJoinedRef,
            );
          },
          onRemoteVideoStateChanged(_conn, uid, state) {
            if (cancelled || uid == null) return;
            logAfwCall('agora_remote_video_state', {
              callId: joinCallId,
              remoteUid: uid,
              state,
            });
            if (state !== AGORA_REMOTE_VIDEO_STATE_DECODING) return;
            noteRemotePeer(
              uid,
              joinCallId,
              'onRemoteVideoStateChanged',
              audioOnly,
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
            logAfwCall('agora_remote_audio_state', { callId: joinCallId, remoteUid: uid, state });
            if (state === 2 /* Decoding */) {
              noteRemotePeer(
                uid,
                joinCallId,
                'onRemoteAudioStateChanged',
                audioOnly,
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
              setRemoteJoined(false);
              logAfwCall('agora_remote_left', { callId: joinCallId, remoteUid: uid });
              logRemoteStreamRemoved({ callId: joinCallId, engine: 'agora', remoteUid: uid });
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

        if (shouldStopPreviewBeforeChannelJoin(adoptedPreview) && publishVideo) {
          try {
            engine.stopPreview();
            logAfwCall('agora_preview_stop_before_join', { callId: joinCallId });
          } catch {
            /* ignore */
          }
        }

        if (isJoinAborted()) {
          logJoinAborted('before_join_channel');
          return;
        }

        await prepareAgoraEngineForChannelJoin(engine, joinCallId);
        if (isJoinAborted()) {
          logJoinAborted('after_pre_join_leave');
          return;
        }

        const joinOptions = {
          channelProfile: ChannelProfileType.ChannelProfileCommunication,
          clientRoleType: ClientRoleType.ClientRoleBroadcaster,
          publishCameraTrack: publishVideo,
          publishMicrophoneTrack: true,
          autoSubscribeAudio: true,
          autoSubscribeVideo: !audioOnly,
        };

        let joinRet = engine.joinChannel(
          tokenData.token,
          tokenData.channel,
          tokenData.uid,
          joinOptions,
        );
        if (!isAgoraJoinChannelReturnOk(joinRet) && shouldRetryAgoraJoinAfterRejected(joinRet)) {
          logAfwCall('agora_join_rejected_retry', { callId: joinCallId, joinRet });
          await leaveAgoraEngineChannelOnly(engine, { callId: joinCallId, phase: 'retry_after_-17' });
          joinRet = engine.joinChannel(
            tokenData.token,
            tokenData.channel,
            tokenData.uid,
            joinOptions,
          );
        }

        logAfwCall('agora_join_channel_invoke', {
          callId: joinCallId,
          channel: tokenData.channel,
          uid: tokenData.uid,
          joinRet,
          adoptedPreview,
        });
        if (!isAgoraJoinChannelReturnOk(joinRet)) {
          const msg = agoraJoinChannelErrorMessage(joinRet);
          setError(msg);
          logAfwCall('agora_join_sync_rejected', { callId: joinCallId, joinRet });
          onErrorRef.current?.(msg);
          await leave({ releasePreview: false, reason: 'join_sync_rejected' });
          return;
        }

        if (isJoinAborted()) {
          logJoinAborted('after_join_channel_before_register');
          await leave({ releasePreview: false, reason: 'join_aborted_post_invoke' });
          return;
        }

        if (joinCallId) registerAgoraDmActiveChannel(joinCallId, engine);

        if (joinWatchdogRef.current) {
          clearTimeout(joinWatchdogRef.current);
        }
        joinWatchdogRef.current = setTimeout(() => {
          if (cancelled || joinSuccessApplied) return;
          logAfwCall('agora_join_ok_watchdog', { callId: joinCallId, ms: AGORA_JOIN_OK_WATCHDOG_MS });
          applyJoinSuccess('join_watchdog_timeout');
        }, AGORA_JOIN_OK_WATCHDOG_MS);
      } catch (e) {
        if (isJoinAborted()) {
          logJoinAborted('join_exception');
          return;
        }
        const msg = (e as Error)?.message || 'Impossible de rejoindre l’appel.';
        setError(msg);
        logAfwCall('agora_join_failed', { callId: joinCallId, error: msg });
        onErrorRef.current?.(msg);
      }
    })();

    return () => {
      cancelled = true;
      if (joinWatchdogRef.current) {
        clearTimeout(joinWatchdogRef.current);
        joinWatchdogRef.current = null;
      }
      if (isCallScreenRecovering() || shouldSuppressCallInterruptedUi()) {
        logAfwCall('agora_join_cleanup_skipped', {
          callId: joinCallId,
          reason: 'recovery_or_media_alive',
        });
        return;
      }
      if (engineRef.current != null || joinedRef.current) {
        void leave({ releasePreview: false, reason: 'channel_effect_cleanup' });
      } else {
        logAfwCall('agora_join_aborted', {
          callId: joinCallId,
          phase: 'effect_cleanup_pre_engine',
          cancelled: true,
          aborted: callAbortedRef?.current === true,
        });
      }
    };
  }, [audioOnly, callId, joinEpoch, leave]);

  useEffect(() => {
    runCallScreenSafeEffect('agora_mute_local_video', () => {
      const engine = engineRef.current;
      if (!engine || !joined || audioOnly) return;
      invokeAgoraEngine(engine, 'muteLocalVideoStream', !camOn);
    });
  }, [audioOnly, camOn, joined]);

  useEffect(() => {
    runCallScreenSafeEffect('agora_mute_local_audio', () => {
      const engine = engineRef.current;
      if (!engine || !joined) return;
      invokeAgoraEngine(engine, 'muteLocalAudioStream', !!muted);
    });
  }, [joined, muted]);

  useEffect(() => {
    runCallScreenSafeEffect('agora_speaker_route', () => {
      const engine = engineRef.current;
      if (!engine || !joined) return;
      invokeAgoraEngine(engine, 'setEnableSpeakerphone', !!speakerOn);
    });
  }, [joined, speakerOn]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || !joined || !videoPublished) return;
    if (!shouldAgoraSwitchCameraOnNonce(cameraFlipNonce)) return;
    try {
      logAgoraSwitchCamera({ callId, nonce: cameraFlipNonce });
      invokeAgoraEngine(engine, 'switchCamera');
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
    try {
      rebindAgoraLocalPreview(engine, { callId, reason: 'remote_ever_joined_pip' });
    } catch (e) {
      logAfwCall('agora_local_preview_rebind_failed', {
        callId,
        reason: 'remote_ever_joined_pip',
        error: String((e as Error)?.message ?? e),
      });
    }
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
      if (remoteUid != null) {
        lastRemoteUidRef.current = remoteUid;
      }
      const renderUid = remoteUid ?? lastRemoteUidRef.current;
      if (Platform.OS === 'web' || renderUid == null) return <View style={style} />;
      return <AgoraRemoteVideoSurface remoteUid={renderUid} style={style} />;
    },
    [remoteUid],
  );

  const leaveForCallEnd = useCallback(
    () => leave({ releasePreview: true, reason: 'finish_call' }),
    [leave],
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
    leave: leaveForCallEnd,
    refreshLocalPreview,
    LocalView,
    RemoteView,
  };
}
