/**
 * Écran appel DM 1:1 — média Agora (signalisation Socket.io conservée).
 */
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import apiClient from '../api/client';
import { buildCallAcceptPayload } from './callSignalingPayload';
import { logAfwCall } from './callDiagnosticLog';
import { ALLOWED_CALL_REACTIONS } from './callDmMenuConstants';
import { formatAgoraDmCallStatus, CALL_END_STATUS_DISPLAY_MS } from './callStatusLine';
import type { CallEndReasonUi } from './callStatusLine';
import { resolveAgoraDmCallId, shouldStartNativeInCallBeforeAgora } from './agoraDmCallSession';
import { shouldApplyInviteAckCallId } from './agoraDmJoinLifecycle';
import {
  clearAgoraPeerAcceptDedup,
  shouldHandleAgoraPeerAccept,
} from './agoraDmPeerAcceptDedup';
import { shouldEnableAgoraChannelJoin, shouldStartAgoraCallTimer } from './agoraDmChannelReady';
import { shouldFlushAgoraDmConnected } from './agoraDmRemoteReady';
import { peekAgoraDmActiveChannelCallId, forceLeaveAgoraDmActiveChannel, migrateAgoraDmActiveChannelCallId, touchAgoraDmActiveChannelCallState } from './agoraDmActiveChannel';
import {
  clearCallMediaAlive,
  syncAgoraCallMediaAlive,
  shouldSuppressCallInterruptedUi,
} from './callMediaAliveRegistry';
import { logCallUiState, logWhyCallInterrupted } from './callUiInterruptLog';
import {
  clearAgoraDmCallHangup,
  clearEmergencyAgoraDmCallHangup,
  registerAgoraDmCallHangup,
} from './agoraDmCallHangupRegistry';
import { resolveAgoraDmLocalPreviewLayout, agoraDmLocalPreviewLayoutFingerprint } from './agoraDmLocalPreviewLayout';
import {
  shouldShowAgoraVideoStage,
  shouldShowLocalVideoFullscreen,
  shouldShowRemoteVideoFullscreen,
  shouldShowVideoSideRail,
} from './agoraDmVideoUi';
import { alertVideoNoteResult, recordAndSendCallVideoNote } from './callVideoNote';
import {
  requestNativeCallPermissions,
  startNativeCallAudioSession,
  applyNativeCallSpeakerRoute,
} from './callNativeMedia';
import { tryEnterPictureInPicture, prepareVideoCallSystemPip } from '../live/liveNativeExtras';
import { syncAgoraDmCallUiStore, useAgoraDmCallUiStore, agoraDmEmptyLocalPreview } from './agoraDmCallUiStore';
import { activateAgoraDmVideoPreview, releaseAgoraDmPreviewSession, isAgoraDmPreviewEngineAlive } from './agoraDmPreviewSession';
import { openDmThreadFromCall } from './openDmThreadFromCall';
import { enableCallKeepAwake, disableCallKeepAwake } from './agoraCallKeepAwake';
import { startActiveCallForeground, stopActiveCallForeground } from '../services/incomingCallService';
import { useDirectCallAgoraRtc } from '../hooks/useDirectCallAgoraRtc';
import { useAuthStore } from '../store/authStore';
import socketService from '../services/socketService';
import { profileAvatarUri } from '../utils/avatarFallback';
import { safeRouterBack } from '../utils/safeRouter';
import { startOutgoingRingbackPattern } from './callRingtone';
import { stopEveryCallRingAlert } from './callRingStop';
import {
  CallDuringMessageModal,
  CallMoreOptionsSheet,
} from '../components/call/CallMoreMenu';
import { CallFloatingReactions } from '../components/call/CallFloatingReactions';
import { CallMissedWhatsAppPanel } from '../components/call/CallMissedWhatsAppPanel';
import { useCallScreenLifecycleGuards, prepareCallSessionMemory } from './callSessionStability';
import { removeNativeSubscription } from './callNativeSubscription';
import { logLocalStreamCreated, logLocalStreamDestroyed, logRemoteStreamAdded, logCallNav } from './callUiLifecycleLog';
import {
  logCallControlsHidden,
  logCallControlsMounted,
  logCallControlsUnmounted,
  logCallControlsVisible,
} from './callControlsLifecycleLog';
import { AgoraLocalPreviewSurface } from './agoraLocalPreviewSurface.native';
import { isCallScreenRecovering } from './callErrorRecoveryGate';
import { useCallVideoControlsOverlay } from './useCallVideoControlsOverlay';
import { safeInvokeAsyncRef } from './callSafeRefInvoke';
import { useCallScreenSafeEffect, useCallScreenSafeLayoutEffect } from './useCallScreenSafeEffect';

const CALL_RING_MS = 30_000;

function newCallId(): string {
  return `call-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function DirectCallAgoraScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const { user } = useAuthStore();

  const name = String(params.peerName || params.name || 'Contact');
  const avatar = String(params.peerAvatar || params.avatar || '');
  const startedAsVideo = String(params.callType || params.type) === 'video';
  const [isVideoCall, setIsVideoCall] = useState(startedAsVideo);
  const isVideoCallRef = useRef(isVideoCall);
  isVideoCallRef.current = isVideoCall;
  const otherUserId = String(params.peerId || params.otherUserId || '').trim();
  const role = String(params.role || 'caller') === 'receiver' ? 'receiver' : 'caller';
  const initialCamOn = String(params.initialCamOn ?? '1') !== '0';
  const initialCamAppliedRef = useRef(false);
  const initialCallId = String(params.callId || '').trim();
  const myUserId = String(user?.id || '');

  const resolvedCall = resolveAgoraDmCallId({
    role,
    routeCallId: initialCallId,
    newCallId,
    preserveActiveCallId: peekAgoraDmActiveChannelCallId(),
  });
  const [callId, setCallId] = useState(resolvedCall.callId);
  const callIdRef = useRef(callId);
  callIdRef.current = callId;

  useCallScreenSafeEffect(
    'agora_route_call_id',
    () => {
      if (initialCallId) setCallId(initialCallId);
    },
    [initialCallId],
  );
  const [callState, setCallState] = useState<'ringing' | 'connecting' | 'connected' | 'ended'>(
    role === 'caller' ? 'ringing' : 'connecting',
  );
  const [peerAccepted, setPeerAccepted] = useState(role === 'receiver');
  const peerAcceptedRef = useRef(role === 'receiver');
  const onBackWhileInCallRef = useRef<() => void>(() => {});
  const callStateRef = useRef(callState);
  const [duration, setDuration] = useState(0);
  const durationRef = useRef(0);
  durationRef.current = duration;
  const [muted, setMuted] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [cameraFlipNonce, setCameraFlipNonce] = useState(0);
  const [mediaEnabled, setMediaEnabled] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [floatingReactions, setFloatingReactions] = useState<{ id: string; emoji: string }[]>([]);
  const [peerScreenSharing, setPeerScreenSharing] = useState(false);
  const [screenShareLoading, setScreenShareLoading] = useState(false);
  const [videoUpgradeLoading, setVideoUpgradeLoading] = useState(false);
  const [showMissedPanel, setShowMissedPanel] = useState(false);
  const [videoNoteBusy, setVideoNoteBusy] = useState(false);
  const [endingReason, setEndingReason] = useState<CallEndReasonUi>(null);
  const minimized = useAgoraDmCallUiStore((s) => s.minimized);
  const finishingRef = useRef(false);
  const callAbortedRef = useRef(false);
  const mediaEnabledRef = useRef(false);
  const stopOutgoingRingRef = useRef<(() => Promise<void>) | null>(null);
  const bootstrapDoneRef = useRef(false);
  const peerAcceptHandledRef = useRef(role === 'receiver');
  const ringTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const peerAvatarUri = profileAvatarUri(avatar, name);

  useCallScreenSafeEffect(
    'agora_call_state_ref',
    () => {
      callStateRef.current = callState;
    },
    [callState],
  );

  useCallScreenSafeEffect(
    'agora_screen_mount',
    () => {
      const activeCallId = peekAgoraDmActiveChannelCallId();
      let currentCallId = callIdRef.current;
      if (activeCallId && activeCallId !== currentCallId) {
        if (isCallScreenRecovering() || shouldSuppressCallInterruptedUi()) {
          logAfwCall('agora_recovery_call_id_resync', {
            from: currentCallId,
            to: activeCallId,
            role,
          });
          callIdRef.current = activeCallId;
          setCallId(activeCallId);
          currentCallId = activeCallId;
        } else {
          logAfwCall('agora_stale_channel_on_mount', { staleCallId: activeCallId, callId: currentCallId });
          void forceLeaveAgoraDmActiveChannel('call_screen_mount_stale');
        }
      }
      if (activeCallId && activeCallId === currentCallId) {
        logAfwCall('agora_recovery_active_channel', { callId: currentCallId, role });
        bootstrapDoneRef.current = true;
        peerAcceptedRef.current = true;
        setPeerAccepted(true);
        mediaEnabledRef.current = true;
        setMediaEnabled(true);
        if (callStateRef.current === 'ringing') {
          setCallState('connecting');
        }
      }
      logAfwCall('agora_screen_mount', { callId: currentCallId, role, platform: Platform.OS });
      logCallNav('messages/call', { action: 'mount', callId: currentCallId, role, engine: 'agora' });
      return () => {
        logCallNav('messages/call', { action: 'unmount', callId: callIdRef.current, role, engine: 'agora' });
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useCallScreenSafeEffect(
    'agora_screen_call_id_log',
    () => {
      logAfwCall('agora_screen_call_id', { callId, role });
    },
    [callId, role],
  );

  useCallScreenLifecycleGuards({
    engine: 'agora',
    callId,
    role,
    isVideoCall: startedAsVideo,
    blockAndroidBack: callState !== 'ended' && !minimized,
    onAndroidBackWhileBlocked: () => onBackWhileInCallRef.current(),
  });

  useCallScreenSafeEffect(
    'agora_call_controls_lifecycle',
    () => {
      const meta = { callId, role, isVideoCall: startedAsVideo, platform: Platform.OS };
      logCallControlsMounted(meta);
      logCallControlsVisible(meta);
      return () => {
        logCallControlsHidden(meta);
        logCallControlsUnmounted(meta);
      };
    },
    [callId, role, startedAsVideo],
  );

  const videoPreviewStartedRef = useRef(false);
  const [videoPreviewReady, setVideoPreviewReady] = useState(false);
  const screenAliveRef = useRef(true);

  useCallScreenSafeEffect(
    'agora_screen_alive',
    () => {
      screenAliveRef.current = true;
      return () => {
        screenAliveRef.current = false;
      };
    },
    [],
  );

  const pinLocalPreviewFull = useCallback(() => {
    useAgoraDmCallUiStore.getState().setLocalPreviewEngineReady(true);
    useAgoraDmCallUiStore.getState().setLocalPreviewPinned(true);
    useAgoraDmCallUiStore.getState().setLocalPreview({
      mountSurface: true,
      containerStyle: 'full',
      showVideo: true,
      showPipFlip: false,
      showFullAvatarFallback: false,
    });
    syncAgoraDmCallUiStore({
      active: true,
      isVideoCall: true,
      localPreviewEngineReady: true,
      callState: callStateRef.current,
      callId: callIdRef.current,
    });
  }, []);

  const resetLocalPreviewUi = useCallback(() => {
    useAgoraDmCallUiStore.getState().setLocalPreviewEngineReady(false);
    useAgoraDmCallUiStore.getState().setLocalPreviewPinned(false);
    useAgoraDmCallUiStore.getState().setLocalPreview(agoraDmEmptyLocalPreview);
  }, []);

  /** Un seul moteur Agora preview — bootstrap + hook consomment ensuite via consume(). */
  const activateVideoPreview = useCallback(async (): Promise<boolean> => {
    if (videoPreviewStartedRef.current && mediaEnabledRef.current) return true;
    const ok = await activateAgoraDmVideoPreview(callIdRef.current);
    if (!screenAliveRef.current) return false;
    if (!ok) {
      resetLocalPreviewUi();
      logAfwCall('video_preview_activate_failed', { callId: callIdRef.current, role });
      return false;
    }
    videoPreviewStartedRef.current = true;
    await safeInvokeAsyncRef(stopOutgoingRingRef, { callId: callIdRef.current, reason: 'preview_activate' });
    if (typeof stopEveryCallRingAlert === 'function') {
      await stopEveryCallRingAlert();
    }
    mediaEnabledRef.current = true;
    setMediaEnabled(true);
    setVideoPreviewReady(true);
    pinLocalPreviewFull();
    logLocalStreamCreated({ callId: callIdRef.current, role, engine: 'agora', phase: 'preview' });
    logAfwCall('caller_early_preview_ready', { callId: callIdRef.current, role });
    return true;
  }, [pinLocalPreviewFull, resetLocalPreviewUi, role]);

  /** Appel vidéo — caméra front + aperçu dès l’ouverture (parité WhatsApp). */
  useCallScreenSafeLayoutEffect(
    'agora_video_preview_on_mount',
    () => {
      if (!startedAsVideo || Platform.OS === 'web') return;
      if (callStateRef.current === 'ended') return;
      void activateVideoPreview();
    },
    [activateVideoPreview, startedAsVideo],
  );

  const finishCallRef = useRef<
  (
    reason?: 'completed' | 'failed' | 'missed' | 'declined',
    options?: { skipNavigation?: boolean; force?: boolean },
  ) => Promise<void>
  >(async () => {});

  const startAgoraMediaTracks = useCallback(async () => {
    if (mediaEnabledRef.current) return;
    await safeInvokeAsyncRef(stopOutgoingRingRef, { callId: callIdRef.current, reason: 'preview_activate' });
    if (typeof stopEveryCallRingAlert === 'function') {
      await stopEveryCallRingAlert();
    }
    logAfwCall('agora_media_start', { callId: callIdRef.current, role });
    mediaEnabledRef.current = true;
    setMediaEnabled(true);
  }, [role]);

  const beginAgoraMedia = useCallback(async () => {
    if (startedAsVideo && !mediaEnabledRef.current) {
      const ok = await activateVideoPreview();
      if (!ok) {
        setErrorMsg('Caméra indisponible.');
        await finishCallRef.current('failed', { force: true });
        return;
      }
    } else if (!mediaEnabledRef.current) {
      await startAgoraMediaTracks();
    }
    peerAcceptedRef.current = true;
    setPeerAccepted(true);
    setCallState('connecting');
  }, [activateVideoPreview, role, startAgoraMediaTracks, startedAsVideo]);

  const remoteEverJoinedRef = useRef(false);
  const remoteJoinPendingRef = useRef(false);
  const joinedRef = useRef(false);

  const flushConnectedFromRemote = useCallback(() => {
    if (!peerAcceptedRef.current) return;
    if (callStateRef.current === 'connected' || callStateRef.current === 'ended') return;
    setCallState('connected');
    touchAgoraDmActiveChannelCallState(callIdRef.current, 'connected');
    logRemoteStreamAdded({ callId: callIdRef.current, engine: 'agora' });
    if (typeof stopEveryCallRingAlert === 'function') {
      void stopEveryCallRingAlert();
    }
    void apiClient
      .post(`/calls/${encodeURIComponent(callIdRef.current)}/session-state`, { status: 'active' })
      .catch(() => {});
  }, []);

  const handleRemoteJoined = useCallback(() => {
    if (!peerAcceptedRef.current) {
      remoteJoinPendingRef.current = true;
      logAfwCall('agora_remote_pending_accept', { callId: callIdRef.current, role });
      return;
    }
    remoteJoinPendingRef.current = false;
    flushConnectedFromRemote();
  }, [flushConnectedFromRemote, role]);

  const channelJoinEnabled =
    shouldEnableAgoraChannelJoin({
      role,
      peerAccepted,
      callEnded: callState === 'ended',
      mediaEnabled,
      audioOnly: !startedAsVideo,
    }) && callState !== 'ended';

  const {
    joined,
    error: rtcError,
    remoteJoined,
    remoteEverJoined,
    camOn,
    toggleCam,
    leave: leaveAgora,
    RemoteView,
    screenSharing: localScreenSharing,
    connectionDisplay,
    toggleScreenShare,
    upgradeToVideo,
    videoPublished,
    previewActive,
  } = useDirectCallAgoraRtc({
    callId,
    enabled: channelJoinEnabled,
    role,
    audioOnly: !startedAsVideo,
    muted,
    cameraFlipNonce,
    speakerOn,
    callAbortedRef,
    onRemoteJoined: handleRemoteJoined,
    onRemoteLeft: () => {
      if (callStateRef.current !== 'connected') {
        logAfwCall('agora_remote_left_ignored', {
          callId: callIdRef.current,
          state: callStateRef.current,
        });
        return;
      }
      void finishCallRef.current('completed');
    },
    onError: (msg) => setErrorMsg(msg),
  });

  useCallScreenSafeEffect(
    'agora_channel_join_gate_log',
    () => {
      logAfwCall('agora_channel_join_gate', {
        callId,
        enabled: channelJoinEnabled,
        role,
        peerAccepted,
        mediaEnabled,
        audioOnly: !startedAsVideo,
        callState,
      });
    },
    [callId, callState, channelJoinEnabled, mediaEnabled, peerAccepted, role, startedAsVideo],
  );

  useCallScreenSafeEffect(
    'agora_sync_media_alive',
    () => {
      syncAgoraCallMediaAlive({
        callId,
        alive:
          callState !== 'ended' &&
          (joined || mediaEnabled || Boolean(peekAgoraDmActiveChannelCallId())),
        callState,
      });
      if (callState === 'ended') {
        clearCallMediaAlive('agora');
      }
    },
    [callId, callState, joined, mediaEnabled],
  );

  const upgradeToVideoRef = useRef(upgradeToVideo);
  upgradeToVideoRef.current = upgradeToVideo;

  joinedRef.current = joined;
  if (callState !== 'ended') {
    syncAgoraCallMediaAlive({
      callId,
      alive: joined || mediaEnabled || Boolean(peekAgoraDmActiveChannelCallId()),
      callState,
    });
  }

  useCallScreenSafeEffect(
    'agora_rtc_error',
    () => {
      if (rtcError) setErrorMsg(rtcError);
    },
    [rtcError],
  );

  useCallScreenSafeEffect(
    'agora_remote_ever_joined_flush',
    () => {
      remoteEverJoinedRef.current = remoteEverJoined;
      if (peerAcceptedRef.current && remoteJoinPendingRef.current && remoteEverJoined) {
        remoteJoinPendingRef.current = false;
        flushConnectedFromRemote();
      }
    },
    [flushConnectedFromRemote, remoteEverJoined],
  );

  useCallScreenSafeEffect(
    'agora_flush_connected',
    () => {
      if (
        !shouldFlushAgoraDmConnected({
          peerAccepted,
          callState,
          joined,
          remoteJoined,
        })
      ) {
        return;
      }
      flushConnectedFromRemote();
    },
    [callState, flushConnectedFromRemote, joined, peerAccepted, remoteJoined],
  );

  useCallScreenSafeEffect(
    'agora_video_published_flag',
    () => {
      if (videoPublished && !isVideoCall) setIsVideoCall(true);
    },
    [isVideoCall, videoPublished],
  );

  useCallScreenSafeEffect(
    'agora_initial_cam_toggle',
    () => {
      if (!joined || initialCamOn || initialCamAppliedRef.current || !isVideoCall) return;
      if (!camOn) {
        initialCamAppliedRef.current = true;
        return;
      }
      initialCamAppliedRef.current = true;
      try {
        toggleCam();
      } catch (e) {
        logAfwCall('agora_toggle_cam_initial_failed', {
          callId: callIdRef.current,
          error: String((e as Error)?.message ?? e),
        });
      }
    },
    [camOn, initialCamOn, isVideoCall, joined, toggleCam],
  );

  useCallScreenSafeEffect(
    'agora_minimized_reset',
    () => {
      useAgoraDmCallUiStore.getState().setMinimized(false);
    },
    [],
  );

  useCallScreenSafeEffect(
    'agora_keep_awake',
    () => {
      if (callState === 'ended') return;
      void enableCallKeepAwake({ callId, role, isVideoCall });
      return () => {
        disableCallKeepAwake({ callId, role, reason: 'effect_cleanup' });
      };
    },
    [callId, callState, isVideoCall, role],
  );

  useCallScreenSafeEffect(
    'agora_sync_ui_store',
    () => {
      syncAgoraDmCallUiStore({
        active: callState !== 'ended',
        callId,
        otherUserId,
        peerName: name,
        peerAvatar: avatar,
        /** Vidéo dans le store overlay seulement après moteur prêt (anti crash RtcView). */
        isVideoCall: startedAsVideo ? videoPreviewReady : isVideoCall,
        role,
        callState,
        durationSeconds: duration,
      });
      return () => {
        if (callStateRef.current === 'ended') {
          useAgoraDmCallUiStore.getState().clearSession();
        }
      };
    },
    [avatar, callId, callState, duration, isVideoCall, name, otherUserId, role, startedAsVideo, videoPreviewReady],
  );

  useCallScreenSafeEffect(
    'agora_sync_duration',
    () => {
      syncAgoraDmCallUiStore({ durationSeconds: duration });
    },
    [duration],
  );

  const finishCall = useCallback(
    async (
      reason: 'completed' | 'failed' | 'missed' | 'declined' = 'completed',
      options?: { skipNavigation?: boolean; force?: boolean },
    ) => {
      if (finishingRef.current || callStateRef.current === 'ended') return;
      logCallUiState({
        phase: 'agora_finish_call_requested',
        callState: callStateRef.current,
        reason,
        engine: 'agora',
        callId: callIdRef.current,
        localStreamPresent: mediaEnabledRef.current,
      });
      const mediaStillAlive =
        joinedRef.current ||
        joined ||
        Boolean(peekAgoraDmActiveChannelCallId()) ||
        shouldSuppressCallInterruptedUi();
      const automatedUnmountTeardown =
        options?.skipNavigation === true && (reason === 'failed' || reason === 'declined');
      if (!options?.force && automatedUnmountTeardown && mediaStillAlive) {
        logCallNav('messages/call', {
          action: 'unmount_finish_call_blocked',
          callId: callIdRef.current,
          reason,
          joined: joinedRef.current,
        });
        logWhyCallInterrupted({
          reason: 'agora_finish_call_blocked_media_alive',
          callState: callStateRef.current,
          fileHint: 'DirectCallAgoraScreen.native.tsx:finishCall',
        });
        return;
      }
      if (!options?.force && reason === 'failed' && mediaStillAlive) {
        logWhyCallInterrupted({
          reason: 'agora_finish_call_blocked_media_alive',
          callState: callStateRef.current,
          fileHint: 'DirectCallAgoraScreen.native.tsx:finishCall',
        });
        return;
      }
      finishingRef.current = true;
      callAbortedRef.current = true;
      setEndingReason(reason);
      mediaEnabledRef.current = false;
      setMediaEnabled(false);
      if (ringTimeoutRef.current) {
        clearTimeout(ringTimeoutRef.current);
        ringTimeoutRef.current = null;
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (!options?.skipNavigation) {
        await new Promise((resolve) => setTimeout(resolve, CALL_END_STATUS_DISPLAY_MS));
      }
      setCallState('ended');
      setEndingReason(null);
      await leaveAgora();
      logLocalStreamDestroyed({ callId: callIdRef.current, engine: 'agora', reason: 'finish_call' });
      disableCallKeepAwake({ callId: callIdRef.current, reason: 'finish_call' });
      await safeInvokeAsyncRef(stopOutgoingRingRef, { callId: callIdRef.current, reason: 'finish_call' });
      if (typeof stopEveryCallRingAlert === 'function') {
        await stopEveryCallRingAlert();
      }
      logAfwCall('agora_finish', { callId: callIdRef.current, reason });
      clearAgoraPeerAcceptDedup(callIdRef.current);
      clearAgoraDmCallHangup(callIdRef.current);
      if (!options?.skipNavigation) {
        clearEmergencyAgoraDmCallHangup(callIdRef.current);
      }
      await stopActiveCallForeground();
      await releaseAgoraDmPreviewSession('finish_call');
      useAgoraDmCallUiStore.getState().clearSession();
      const status =
        reason === 'missed' ? 'missed' : reason === 'declined' ? 'declined' : reason === 'failed' ? 'failed' : 'completed';
      await apiClient
        .post(`/calls/${encodeURIComponent(callIdRef.current)}/session-state`, {
          status,
          duration: durationRef.current,
        })
        .catch(() => {});
      await socketService.ensureConnectedEmit('call:end', {
        callId: callIdRef.current,
        fromUserId: myUserId,
        toUserId: otherUserId,
        reason,
        durationSec: durationRef.current,
      });
      if (!options?.skipNavigation) {
        logCallNav('messages', { action: 'finish_navigate_back', callId: callIdRef.current, reason });
        safeRouterBack('/messages');
      }
    },
    [leaveAgora, myUserId, otherUserId, joined],
  );

  finishCallRef.current = finishCall;

  useCallScreenSafeEffect(
    'agora_register_hangup',
    () => {
      registerAgoraDmCallHangup(callId, async () => {
        await finishCallRef.current('completed', { skipNavigation: true });
      });
      return () => {
        /* Conservé pour ErrorBoundary — clearAgoraDmCallHangup dans finishCall. */
      };
    },
    [callId],
  );

  /** Sortie navigation sans raccrocher — sauf fermeture réelle de l'écran (pas réduction). */
  useCallScreenSafeEffect(
    'agora_unmount_finish',
    () => {
      return () => {
      if (finishingRef.current || callStateRef.current === 'ended') return;
      if (isCallScreenRecovering()) {
        logCallNav('messages/call', {
          action: 'unmount_skip_finish_recovery',
          callId: callIdRef.current,
        });
        return;
      }
      if (
        joinedRef.current ||
        peekAgoraDmActiveChannelCallId() ||
        shouldSuppressCallInterruptedUi()
      ) {
        logCallNav('messages/call', {
          action: 'unmount_preserve_media_alive',
          callId: callIdRef.current,
          role,
          joined: joinedRef.current,
        });
        return;
      }
      if (useAgoraDmCallUiStore.getState().minimized) {
        logCallNav('messages/call', {
          action: 'unmount_while_minimized',
          callId: callIdRef.current,
          role,
        });
        return;
      }
      const state = callStateRef.current;
      const reason =
        role === 'caller' && state === 'ringing'
          ? 'declined'
          : state === 'connected'
            ? 'completed'
            : state === 'connecting'
              ? 'failed'
              : 'declined';
      logCallNav('messages/call', { action: 'unmount_finish_call', callId: callIdRef.current, reason });
      void finishCallRef.current(reason, { skipNavigation: true });
    };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const handleMissedNoAnswer = useCallback(async () => {
    if (finishingRef.current || callStateRef.current !== 'ringing') return;
    callAbortedRef.current = true;
    if (ringTimeoutRef.current) {
      clearTimeout(ringTimeoutRef.current);
      ringTimeoutRef.current = null;
    }
    logAfwCall('agora_missed_no_answer', { callId: callIdRef.current });
    await finishCallRef.current('missed', { skipNavigation: true });
    setShowMissedPanel(true);
  }, []);

  const dismissMissedPanel = useCallback(() => {
    safeRouterBack('/messages');
  }, []);

  const handleRecall = useCallback(() => {
    if (!otherUserId) return;
    router.replace({
      pathname: '/messages/call',
      params: {
        peerId: otherUserId,
        peerName: name,
        peerAvatar: avatar,
        callType: 'video',
        role: 'caller',
        callId: newCallId(),
      },
    } as never);
  }, [avatar, name, otherUserId]);

  const handleVideoNote = useCallback(async () => {
    if (videoNoteBusy || !otherUserId) return;
    setVideoNoteBusy(true);
    try {
      const result = await recordAndSendCallVideoNote({ recipientId: otherUserId, peerName: name });
      alertVideoNoteResult(result, name);
      if (result.ok) dismissMissedPanel();
    } finally {
      setVideoNoteBusy(false);
    }
  }, [dismissMissedPanel, name, otherUserId, videoNoteBusy]);

  const flipCamera = useCallback(() => {
    setCameraFlipNonce((n) => n + 1);
  }, []);

  const flipCameraTick = useAgoraDmCallUiStore((s) => s.flipCameraTick);
  useCallScreenSafeEffect(
    'agora_flip_camera_tick',
    () => {
      if (flipCameraTick > 0) {
        setCameraFlipNonce((n) => n + 1);
      }
    },
    [flipCameraTick],
  );

  useCallScreenSafeEffect(
    'agora_stop_ringing',
    () => {
      if (callState !== 'connecting' && callState !== 'connected' && callState !== 'ended') return;
      void safeInvokeAsyncRef(stopOutgoingRingRef, { callId: callIdRef.current, reason: 'call_state_ring_stop' });
      if (typeof stopEveryCallRingAlert === 'function') {
        void stopEveryCallRingAlert();
      }
    },
    [callState],
  );

  useCallScreenSafeEffect(
    'agora_call_timer',
    () => {
      if (!shouldStartAgoraCallTimer({ callState, peerAccepted })) return;
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    },
    [callState, peerAccepted],
  );

  useCallScreenSafeEffect(
    'agora_pulse_ringing',
    () => {
      if (callState !== 'ringing') return;
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.06, duration: 900, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
        ]),
      );
      if (typeof loop.start === 'function') {
        loop.start();
      }
      return () => {
        if (typeof loop.stop === 'function') {
          loop.stop();
        }
      };
    },
    [callState, pulseAnim],
  );

  const handleMissedNoAnswerRef = useRef(handleMissedNoAnswer);
  handleMissedNoAnswerRef.current = handleMissedNoAnswer;

  const activateVideoPreviewRef = useRef(activateVideoPreview);
  activateVideoPreviewRef.current = activateVideoPreview;
  const beginAgoraMediaRef = useRef(beginAgoraMedia);
  beginAgoraMediaRef.current = beginAgoraMedia;
  const startAgoraMediaTracksRef = useRef(startAgoraMediaTracks);
  startAgoraMediaTracksRef.current = startAgoraMediaTracks;
  const flushConnectedFromRemoteRef = useRef(flushConnectedFromRemote);
  flushConnectedFromRemoteRef.current = flushConnectedFromRemote;

  /** Bootstrap média + invite — une fois ; ne pas y attacher les sockets (churn deps). */
  useCallScreenSafeEffect(
    'agora_bootstrap',
    () => {
    if (!myUserId || !otherUserId || !callId) return;
    if (bootstrapDoneRef.current) return;
    if (resolvedCall.error && role === 'receiver') {
      setErrorMsg(resolvedCall.error);
      void finishCallRef.current('failed', { force: true });
      return;
    }
    bootstrapDoneRef.current = true;
    prepareCallSessionMemory();
    let cancelled = false;
    const authUser = useAuthStore.getState().user;

    void (async () => {
      try {
        const permitted = await requestNativeCallPermissions(startedAsVideo);
        if (!screenAliveRef.current) return;
        if (!permitted) {
          setErrorMsg('Microphone ou caméra non autorisé.');
          await finishCallRef.current('failed', { force: true });
          return;
        }
        if (startedAsVideo) {
          const previewOk = await activateVideoPreviewRef.current();
          if (!screenAliveRef.current) return;
          if (!previewOk) {
            setErrorMsg('Microphone ou caméra non autorisé.');
            await finishCallRef.current('failed', { force: true });
            return;
          }
        } else {
          await startAgoraMediaTracksRef.current();
        }
        if (shouldStartNativeInCallBeforeAgora(role)) {
          await startNativeCallAudioSession(startedAsVideo, true, { outgoingRingback: true });
        }
        if (role === 'caller' && Platform.OS === 'web') {
          stopOutgoingRingRef.current = await startOutgoingRingbackPattern();
        }
        await startActiveCallForeground(name, startedAsVideo);

        await apiClient.post('/calls/session/upsert', {
          callId: callIdRef.current,
          peerUserId: otherUserId,
          role,
          status: 'pending',
        });

        if (role === 'caller') {
          const invitePayload = {
            callId: callIdRef.current,
            fromUserId: myUserId,
            toUserId: otherUserId,
            type: startedAsVideo ? 'video' : 'audio',
            callerName: authUser?.full_name || authUser?.username || 'Quelqu’un',
            callerAvatar: authUser?.profile_image || authUser?.avatar || '',
            callerPhone: authUser?.phone || '',
          };
          logAfwCall('invite_emit_agora', invitePayload);
          const invited = await socketService.ensureConnectedEmit('call:invite', invitePayload);
          if (!invited) {
            setErrorMsg('Connexion indisponible. Réessayez.');
            await finishCallRef.current('failed', { force: true });
            return;
          }
          ringTimeoutRef.current = setTimeout(() => {
            if (callStateRef.current === 'ringing') {
              void handleMissedNoAnswerRef.current();
            }
          }, CALL_RING_MS);
        } else {
          const accepted = await socketService.ensureConnectedEmit(
            'call:accept',
            buildCallAcceptPayload({
              callId: callIdRef.current,
              accepterUserId: myUserId,
              callerUserId: otherUserId,
              type: startedAsVideo ? 'video' : 'audio',
            }),
          );
          if (!accepted) {
            setErrorMsg('Connexion indisponible. Réessayez.');
            await finishCallRef.current('failed', { force: true });
            return;
          }
          await beginAgoraMediaRef.current();
        }
      } catch {
        if (!cancelled) {
          setErrorMsg('Impossible de démarrer l’appel.');
          await finishCallRef.current('failed', { force: true });
        }
      }
    })();

    return () => {
      cancelled = true;
      void safeInvokeAsyncRef(stopOutgoingRingRef, { callId: callIdRef.current, reason: 'bootstrap_cleanup' });
      if (typeof stopEveryCallRingAlert === 'function') {
        void stopEveryCallRingAlert();
      }
    };
  }, [callId, myUserId, name, otherUserId, resolvedCall.error, role, startedAsVideo]);

  /** Sockets call:* — deps minimales pour ne jamais perdre call:accept après invite:ack. */
  useCallScreenSafeEffect(
    'agora_socket_handlers',
    () => {
    if (!myUserId || !otherUserId) return;

    const onAccept = (payload: { callId?: string }) => {
      if (role !== 'caller') return;
      if (payload?.callId && payload.callId !== callIdRef.current) return;
      if (peerAcceptHandledRef.current) return;
      if (!shouldHandleAgoraPeerAccept(callIdRef.current)) {
        logAfwCall('agora_peer_accepted_dedup', { callId: callIdRef.current, role });
        return;
      }
      peerAcceptHandledRef.current = true;
      logAfwCall('agora_peer_accepted', { callId: callIdRef.current, role });
      if (ringTimeoutRef.current) {
        clearTimeout(ringTimeoutRef.current);
        ringTimeoutRef.current = null;
      }
      peerAcceptedRef.current = true;
      setPeerAccepted(true);
      if (mediaEnabledRef.current) {
        setCallState('connecting');
        if (remoteEverJoinedRef.current) {
          flushConnectedFromRemoteRef.current();
        }
      } else {
        void beginAgoraMediaRef.current();
      }
    };

    const onEnd = (payload?: { callId?: string }, reason: 'completed' | 'declined' | 'missed' = 'completed') => {
      if (payload?.callId && payload.callId !== callIdRef.current) return;
      if (finishingRef.current || callStateRef.current === 'ended') return;
      logAfwCall('call_end_signal', {
        callId: callIdRef.current,
        state: callStateRef.current,
        source: 'socket',
        reason,
      });
      void finishCallRef.current(reason);
    };

    const onInviteAck = (payload: { callId?: string; receiverReachable?: boolean }) => {
      if (role !== 'caller' || !payload?.callId) return;
      const ackId = String(payload.callId);
      const prevId = callIdRef.current;
      if (shouldApplyInviteAckCallId(prevId, ackId)) {
        logAfwCall('agora_invite_ack_call_id_sync', { from: prevId, to: ackId });
        migrateAgoraDmActiveChannelCallId(prevId, ackId);
        callIdRef.current = ackId;
        setCallId(ackId);
        void apiClient
          .post('/calls/session/upsert', {
            callId: ackId,
            peerUserId: otherUserId,
            role,
            status: 'pending',
          })
          .catch(() => {});
      }
      if (payload.receiverReachable === false) {
        setErrorMsg(
          'Le correspondant semble hors ligne. Une notification lui a été envoyée — il doit ouvrir AfriWonder.',
        );
      }
    };

    logAfwCall('agora_socket_handlers_bound', { callId: callIdRef.current, role });
    const offAccept = socketService.on('call:accept', onAccept);
    const offEnd = socketService.on('call:end', (p: { callId?: string }) => onEnd(p, 'completed'));
    const offDecline = socketService.on('call:decline', (p: { callId?: string }) => onEnd(p, 'declined'));
    const offMissed = socketService.on('call:missed', (p: { callId?: string }) => onEnd(p, 'missed'));
    const offInviteAck = socketService.on('call:invite:ack', onInviteAck);

    return () => {
      logAfwCall('agora_socket_handlers_unbound', { callId: callIdRef.current, role });
      removeNativeSubscription(offAccept);
      removeNativeSubscription(offEnd);
      removeNativeSubscription(offDecline);
      removeNativeSubscription(offMissed);
      removeNativeSubscription(offInviteAck);
    };
    },
    [myUserId, otherUserId, role],
  );

  const statusLine = formatAgoraDmCallStatus({
    callState: endingReason ? 'ended' : callState,
    durationSeconds: duration,
    role,
    errorMsg,
    endReason: endingReason,
  });

  const handleToggleMute = useCallback(() => {
    setMuted((v) => !v);
  }, []);

  const handleToggleSpeaker = useCallback(() => {
    setSpeakerOn((v) => {
      const next = !v;
      if (!mediaEnabled) {
        void applyNativeCallSpeakerRoute(next);
      }
      return next;
    });
  }, [mediaEnabled]);

  const handleHangup = useCallback(() => {
    void finishCall(role === 'caller' && callState === 'ringing' ? 'declined' : 'completed');
  }, [callState, finishCall, role]);

  const emitCallRelay = useCallback(
    (event: string, extra: Record<string, unknown>) => {
      if (!otherUserId || !myUserId) return;
      void socketService.ensureConnectedEmit(event, {
        callId: callIdRef.current,
        fromUserId: myUserId,
        toUserId: otherUserId,
        ...extra,
      });
    },
    [otherUserId, myUserId],
  );

  useCallScreenSafeEffect(
    'agora_system_pip_prepare',
    () => {
      if (callState !== 'connected' || !isVideoCall || Platform.OS !== 'android') return;
      if (typeof prepareVideoCallSystemPip !== 'function') {
        logAfwCall('system_pip_prepare_skipped', { callId: callIdRef.current, reason: 'missing_export' });
        return;
      }
      const timer = setTimeout(() => {
        void prepareVideoCallSystemPip({ title: name, silent: true }).catch((e) => {
          logAfwCall('system_pip_prepare_effect_failed', {
            callId: callIdRef.current,
            error: String((e as Error)?.message ?? e),
          });
        });
      }, 0);
      return () => clearTimeout(timer);
    },
    [callState, isVideoCall, name],
  );

  const handleMinimize = useCallback(async () => {
    if (callState === 'ended') return;
    logCallNav('messages/[id]', { action: 'minimize_to_chat', callId: callIdRef.current });
    if (isVideoCall && joined) {
      await tryEnterPictureInPicture({ silent: true, title: name });
    }
    useAgoraDmCallUiStore.getState().setMinimized(true);
    await openDmThreadFromCall({ otherUserId, peerName: name, peerAvatar: avatar });
  }, [avatar, callState, isVideoCall, joined, name, otherUserId]);

  onBackWhileInCallRef.current = () => {
    void handleMinimize();
  };

  const handleOpenChat = useCallback(() => {
    void handleMinimize();
  }, [handleMinimize]);

  const openAddPeople = useCallback(() => {
    if (!otherUserId) return;
    router.push({
      pathname: '/messages/call-add-people',
      params: {
        callId: callIdRef.current,
        otherUserId,
        type: isVideoCall ? 'video' : 'audio',
      },
    } as never);
  }, [isVideoCall, otherUserId]);

  const handleUpgradeToVideo = useCallback(async () => {
    if (isVideoCall || videoUpgradeLoading) return;
    if (callState !== 'connected') {
      Alert.alert('Vidéo', 'Attendez que l’appel soit bien connecté.');
      return;
    }
    setVideoUpgradeLoading(true);
    try {
      const result = await upgradeToVideo();
      if (!result.ok) {
        Alert.alert('Vidéo', result.message || 'Impossible de passer en vidéo.');
        return;
      }
      setIsVideoCall(true);
      emitCallRelay('call:upgrade', { active: true });
    } finally {
      setVideoUpgradeLoading(false);
    }
  }, [callState, emitCallRelay, isVideoCall, upgradeToVideo, videoUpgradeLoading]);

  const pushFloatingReaction = useCallback((emoji: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setFloatingReactions((prev) => [...prev, { id, emoji }]);
    setTimeout(() => {
      setFloatingReactions((prev) => prev.filter((x) => x.id !== id));
    }, 3200);
  }, []);

  useCallScreenSafeEffect(
    'agora_reaction_sockets',
    () => {
      if (!otherUserId || !myUserId) return;
      const offR = socketService.on(
        'call:reaction',
        (p: { callId?: string; fromUserId?: string; emoji?: string }) => {
          if (!p?.emoji || p.callId !== callIdRef.current || p.fromUserId !== otherUserId) return;
          pushFloatingReaction(p.emoji);
        },
      );
      const offS = socketService.on(
        'call:screen_share',
        (p: { callId?: string; fromUserId?: string; active?: boolean }) => {
          if (p?.callId !== callIdRef.current || p.fromUserId !== otherUserId) return;
          setPeerScreenSharing(!!p.active);
        },
      );
      const offU = socketService.on(
        'call:upgrade',
        (p: { callId?: string; fromUserId?: string; active?: boolean }) => {
          if (p?.callId !== callIdRef.current || p.fromUserId !== otherUserId || !p.active) return;
          setIsVideoCall(true);
          void upgradeToVideoRef.current?.();
        },
      );
      return () => {
        removeNativeSubscription(offR);
        removeNativeSubscription(offS);
        removeNativeSubscription(offU);
      };
    },
    [otherUserId, myUserId, pushFloatingReaction],
  );

  const handleShareScreen = useCallback(async () => {
    if (screenShareLoading) return;
    setScreenShareLoading(true);
    try {
      const result = await toggleScreenShare();
      if (!result.ok) {
        Alert.alert('Partage d’écran', result.message || 'Impossible de partager l’écran.');
        return;
      }
      emitCallRelay('call:screen_share', { active: !!result.on });
      setMoreMenuOpen(false);
    } finally {
      setScreenShareLoading(false);
    }
  }, [emitCallRelay, screenShareLoading, toggleScreenShare]);

  const showVideoStage = shouldShowAgoraVideoStage({
    joined,
    previewActive,
    isVideoCall,
    mediaEnabled: mediaEnabled || isAgoraDmPreviewEngineAlive(callId),
    localScreenSharing,
    peerScreenSharing,
  });
  const showLocalFull = shouldShowLocalVideoFullscreen({
    isVideoCall,
    mediaEnabled: mediaEnabled || isAgoraDmPreviewEngineAlive(callId),
    remoteEverJoined,
    remoteJoined,
  });
  const showRemoteFull = shouldShowRemoteVideoFullscreen({
    isVideoCall,
    remoteJoined,
    remoteEverJoined,
  });
  const showSideRail = shouldShowVideoSideRail({ isVideoCall, mediaEnabled, remoteEverJoined });
  const localPreviewLayout = useMemo(
    () =>
      resolveAgoraDmLocalPreviewLayout({
        isVideoCall,
        videoPublished,
        joined,
        camOn,
        localScreenSharing,
        remoteJoined,
        remoteEverJoined,
        mediaEnabled,
      }),
    [
      camOn,
      isVideoCall,
      joined,
      localScreenSharing,
      mediaEnabled,
      remoteEverJoined,
      remoteJoined,
      videoPublished,
    ],
  );
  const localPreviewLayoutKey = useMemo(
    () => agoraDmLocalPreviewLayoutFingerprint(localPreviewLayout),
    [localPreviewLayout],
  );

  useCallScreenSafeLayoutEffect(
    'agora_local_preview_layout',
    () => {
      if (showMissedPanel || (callState === 'ended' && !endingReason)) {
        useAgoraDmCallUiStore.getState().setLocalPreview(agoraDmEmptyLocalPreview);
        return;
      }
      if (localPreviewLayout.mountSurface) {
        useAgoraDmCallUiStore.getState().setLocalPreviewPinned(true);
      }
      useAgoraDmCallUiStore.getState().setLocalPreview(localPreviewLayout);
    },
    [callState, endingReason, localPreviewLayoutKey, showMissedPanel, localPreviewLayout],
  );
  const isMuted = muted;

  const callEnded = callState === 'ended';
  const {
    chromeOpacity,
    chromePointerEvents,
    showPinnedHangup,
    tapOverlayActive,
    showControls,
    bumpControlsActivity,
  } = useCallVideoControlsOverlay({
    isVideoStage: showVideoStage,
    callEnded,
    callConnected: callState === 'connected',
    minimized,
    moreMenuOpen,
    messageModalOpen,
    callId,
    role,
  });
  const chromeFadeStyle = { opacity: chromeOpacity };

  if (showMissedPanel) {
    return (
      <CallMissedWhatsAppPanel
        peerName={name}
        peerAvatarUri={peerAvatarUri}
        busy={videoNoteBusy}
        onCancel={dismissMissedPanel}
        onVideoNote={() => void handleVideoNote()}
        onRecall={handleRecall}
      />
    );
  }

  const topBarOverlay = showVideoStage && (showRemoteFull || showLocalFull);

  const topBarNode = (
    <View
      style={[
        topBarOverlay ? styles.topBarOverlay : styles.topBar,
        topBarOverlay ? { paddingTop: insets.top + 4 } : null,
        showVideoStage ? chromeFadeStyle : null,
      ]}
      pointerEvents={showVideoStage ? chromePointerEvents : 'box-none'}
    >
      {showRemoteFull || !showVideoStage ? (
        <TouchableOpacity
          onPress={() => void handleMinimize()}
          style={styles.topIconBtn}
          accessibilityLabel="Réduire"
        >
          <Ionicons name="contract-outline" size={26} color="#FFF" />
        </TouchableOpacity>
      ) : (
        <View style={styles.topIconBtn} />
      )}
      <View style={styles.topTitleWrap}>
        <Text style={styles.topName} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.topStatus}>{statusLine}</Text>
      </View>
      {showRemoteFull || !showVideoStage ? (
        <TouchableOpacity
          onPress={openAddPeople}
          style={styles.topIconBtn}
          accessibilityLabel="Ajouter un participant"
        >
          <Ionicons name="person-add-outline" size={22} color="#FFF" />
        </TouchableOpacity>
      ) : showLocalFull ? (
        <View style={styles.topIconBtn} />
      ) : (
        <View style={styles.topActions}>
          <TouchableOpacity
            onPress={openAddPeople}
            style={styles.topIconBtn}
            accessibilityLabel="Ajouter un participant"
          >
            <Ionicons name="person-add-outline" size={22} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleOpenChat}
            style={styles.topIconBtn}
            accessibilityLabel="Message"
          >
            <Ionicons name="chatbubble-ellipses-outline" size={22} color="#FFF" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <View
      style={[
        styles.root,
        !showVideoStage ? { paddingTop: insets.top, paddingBottom: insets.bottom } : null,
      ]}
    >
      {!topBarOverlay ? topBarNode : null}

      {showVideoStage ? (
        <View style={styles.videoStage}>
          {showRemoteFull ? (
            <>
              <RemoteView style={styles.videoFill} />
              <TouchableOpacity
                style={[
                  styles.videoChatFab,
                  { top: insets.top + 56 },
                  chromeFadeStyle,
                ]}
                onPress={() => {
                  bumpControlsActivity();
                  handleOpenChat();
                }}
                accessibilityLabel="Message"
                disabled={chromePointerEvents === 'none'}
              >
                <Ionicons name="chatbubble-ellipses-outline" size={22} color="#FFF" />
              </TouchableOpacity>
            </>
          ) : showLocalFull ? (
            <>
              {(localPreviewLayout.mountSurface && localPreviewLayout.containerStyle === 'full') ||
              isAgoraDmPreviewEngineAlive(callId) ? (
                <AgoraLocalPreviewSurface layoutMode="fill" style={styles.videoFill} />
              ) : null}
              {showSideRail ? (
                <View
                  style={[
                    styles.videoSideRail,
                    { top: insets.top + 72 },
                    chromeFadeStyle,
                  ]}
                  pointerEvents={chromePointerEvents}
                >
                  <TouchableOpacity
                    style={styles.sideToolBtn}
                    onPress={() => {
                      bumpControlsActivity();
                      openAddPeople();
                    }}
                    accessibilityLabel="Ajouter un participant"
                  >
                    <Ionicons name="person-add-outline" size={22} color="#FFF" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.sideToolBtn}
                    onPress={() => {
                      bumpControlsActivity();
                      handleOpenChat();
                    }}
                    accessibilityLabel="Message"
                  >
                    <Ionicons name="chatbubble-ellipses-outline" size={22} color="#FFF" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.sideToolBtn}
                    onPress={() => {
                      bumpControlsActivity();
                      flipCamera();
                    }}
                    accessibilityLabel="Retourner la caméra"
                  >
                    <Ionicons name="camera-reverse-outline" size={22} color="#FFF" />
                  </TouchableOpacity>
                </View>
              ) : null}
            </>
          ) : (
            <>
              <RemoteView style={styles.videoFill} />
              {!remoteJoined && callState !== 'ended' ? (
                <View style={styles.videoWaiting}>
                  <Text style={styles.videoWaitingText}>Connexion vidéo…</Text>
                </View>
              ) : null}
            </>
          )}
          {localPreviewLayout.showFullAvatarFallback && showLocalFull ? (
            <View style={styles.localPreviewFallbackOverlay} pointerEvents="none">
              <Image source={{ uri: peerAvatarUri }} style={styles.localPreviewFallback} />
            </View>
          ) : null}
          {(peerScreenSharing || localScreenSharing) ? (
            <View style={[styles.screenShareBanner, { top: insets.top + 12 }, chromeFadeStyle]}>
              <Text style={styles.screenShareBannerText}>
                {localScreenSharing ? 'Vous partagez votre écran' : `${name} partage son écran`}
              </Text>
            </View>
          ) : null}
          {tapOverlayActive ? (
            <Pressable
              style={styles.tapToShowOverlay}
              onPress={showControls}
              accessibilityLabel="Afficher les contrôles d'appel"
              accessibilityRole="button"
            />
          ) : null}
        </View>
      ) : (
        <View style={styles.audioStage}>
          <Animated.View
            style={[
              styles.avatarWrap,
              callState === 'ringing' ? { transform: [{ scale: pulseAnim }] } : null,
            ]}
          >
            <Image source={{ uri: peerAvatarUri }} style={styles.avatar} />
          </Animated.View>
        </View>
      )}

      {topBarOverlay ? topBarNode : null}

      <CallFloatingReactions items={floatingReactions} />

      <View
        style={[
          styles.dockWrap,
          showVideoStage ? { paddingBottom: insets.bottom + 12 } : null,
          showVideoStage ? chromeFadeStyle : null,
        ]}
        pointerEvents={showVideoStage ? chromePointerEvents : 'auto'}
      >
        <View style={styles.dock}>
          <TouchableOpacity
            style={styles.dockBtn}
            onPress={() => {
              bumpControlsActivity();
              setMoreMenuOpen(true);
            }}
            accessibilityLabel="Options"
          >
            <Ionicons name="ellipsis-horizontal" size={24} color="#FFF" />
          </TouchableOpacity>
          {isVideoCall ? (
            <TouchableOpacity
              style={[styles.dockBtn, camOn ? styles.dockBtnActive : null]}
              onPress={() => {
                bumpControlsActivity();
                toggleCam();
              }}
              accessibilityLabel="Caméra"
            >
              <Ionicons
                name={camOn ? 'videocam' : 'videocam-off'}
                size={24}
                color={camOn ? '#111B21' : '#FFF'}
              />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.dockBtn, videoUpgradeLoading ? styles.dockBtnDisabled : null]}
              onPress={() => {
                bumpControlsActivity();
                void handleUpgradeToVideo();
              }}
              disabled={videoUpgradeLoading || callState !== 'connected'}
              accessibilityLabel="Passer en vidéo"
            >
              <Ionicons name="videocam" size={24} color="#FFF" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.dockBtn, speakerOn ? styles.dockBtnActive : null]}
            onPress={() => {
              bumpControlsActivity();
              handleToggleSpeaker();
            }}
            accessibilityLabel="Haut-parleur"
          >
            <Ionicons name="volume-high" size={24} color={speakerOn ? '#111B21' : '#FFF'} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.dockBtn}
            onPress={() => {
              bumpControlsActivity();
              handleToggleMute();
            }}
            accessibilityLabel="Micro"
          >
            <Ionicons name={isMuted ? 'mic-off' : 'mic'} size={24} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.dockBtn, styles.hangup]}
            onPress={() => {
              bumpControlsActivity();
              handleHangup();
            }}
            accessibilityLabel="Raccrocher"
          >
            <Ionicons name="call" size={26} color="#FFF" style={styles.hangupIcon} />
          </TouchableOpacity>
        </View>
      </View>

      <View
        style={[
          styles.pinnedHangupWrap,
          { paddingBottom: insets.bottom + 20, opacity: showPinnedHangup ? 1 : 0 },
        ]}
        pointerEvents={showPinnedHangup ? 'box-none' : 'none'}
      >
        <TouchableOpacity
          style={[styles.dockBtn, styles.hangup, styles.pinnedHangupBtn]}
          onPress={() => {
            bumpControlsActivity();
            handleHangup();
          }}
          accessibilityLabel="Raccrocher"
        >
          <Ionicons name="call" size={26} color="#FFF" style={styles.hangupIcon} />
        </TouchableOpacity>
      </View>

      <CallMoreOptionsSheet
        visible={moreMenuOpen}
        onClose={() => setMoreMenuOpen(false)}
        connectionLabel={connectionDisplay.labelFr}
        connectionBars={connectionDisplay.bars}
        connectionQuality={connectionDisplay.quality}
        myRaisedHand={false}
        onToggleRaiseHand={() => {}}
        showRaiseHand={false}
        showMessageComposer={false}
        onPickReaction={(emoji) => {
          if (!ALLOWED_CALL_REACTIONS.has(emoji)) return;
          emitCallRelay('call:reaction', { emoji });
          pushFloatingReaction(emoji);
          setMoreMenuOpen(false);
        }}
        onShareScreen={() => void handleShareScreen()}
        showScreenShare={joined && callState === 'connected'}
        onOpenMessageComposer={() => {
          setMoreMenuOpen(false);
          setMessageModalOpen(true);
        }}
        screenShareLoading={screenShareLoading}
      />

      <CallDuringMessageModal
        visible={messageModalOpen}
        onClose={() => setMessageModalOpen(false)}
        otherUserId={otherUserId}
        peerName={name}
      />
    </View>
  );
}

const WA_BG = '#0B141A';
const WA_DOCK = '#1F2C34';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: WA_BG },
  topBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 12,
    paddingBottom: 12,
    minHeight: 56,
    zIndex: 100,
    elevation: 100,
  },
  topBarOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 100,
    elevation: 100,
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 12,
    paddingBottom: 8,
    minHeight: 56,
  },
  topIconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitleWrap: { flex: 1, alignItems: 'center', paddingTop: 2 },
  topActions: { flexDirection: 'row', alignItems: 'center' },
  topName: { color: '#FFF', fontSize: 20, fontWeight: '600', maxWidth: '100%' },
  topStatus: { color: 'rgba(255,255,255,0.72)', fontSize: 15, marginTop: 4 },
  audioStage: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  avatarWrap: { alignItems: 'center', justifyContent: 'center' },
  avatar: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#2A3942',
  },
  videoStage: { flex: 1, position: 'relative', backgroundColor: '#101822', zIndex: 1 },
  tapToShowOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 90,
    elevation: 90,
  },
  localPreviewFallback: { width: '100%', height: '100%', resizeMode: 'cover' },
  videoSideRail: {
    position: 'absolute',
    right: 12,
    zIndex: 5,
    gap: 14,
  },
  sideToolBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  videoChatFab: {
    position: 'absolute',
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    zIndex: 5,
  },
  videoWaiting: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  videoWaitingText: { color: 'rgba(255,255,255,0.85)', fontSize: 15 },
  videoFill: { flex: 1, width: '100%', height: '100%' },
  localPreviewFullscreen: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 3,
  },
  localPreviewHidden: {
    position: 'absolute',
    bottom: 108,
    right: 16,
    width: 110,
    height: 156,
    opacity: 0,
    overflow: 'hidden',
    zIndex: 0,
  },
  localPreviewInvisible: {
    opacity: 0,
  },
  localPreviewFallbackOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0b141a',
    zIndex: 2,
  },
  pip: {
    position: 'absolute',
    bottom: 108,
    right: 16,
    width: 110,
    height: 156,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    zIndex: 5,
  },
  pipFlipBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  screenShareBanner: {
    position: 'absolute',
    top: 12,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 4,
  },
  screenShareBannerText: { color: '#FFF', fontSize: 13, fontWeight: '600' },
  dockWrap: { paddingHorizontal: 16, paddingBottom: 16, zIndex: 100, elevation: 100 },
  pinnedHangupWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    zIndex: 110,
    elevation: 110,
  },
  pinnedHangupBtn: {
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  dock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: WA_DOCK,
    borderRadius: 40,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 4,
  },
  dockBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  dockBtnActive: {
    backgroundColor: '#FFFFFF',
  },
  dockBtnDisabled: {
    backgroundColor: 'transparent',
  },
  hangup: {
    backgroundColor: '#E53935',
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  hangupIcon: { transform: [{ rotate: '135deg' }] },
});
