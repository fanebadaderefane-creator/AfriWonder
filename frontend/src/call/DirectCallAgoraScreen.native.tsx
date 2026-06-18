/**
 * Écran appel DM 1:1 — média Agora (signalisation Socket.io conservée).
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import apiClient from '../api/client';
import { buildCallAcceptPayload } from './callSignalingPayload';
import { logAfwCall } from './callDiagnosticLog';
import { ALLOWED_CALL_REACTIONS } from './callDmMenuConstants';
import { formatWhatsAppCallStatus } from './callStatusLine';
import { resolveAgoraDmCallId, shouldStartNativeInCallBeforeAgora } from './agoraDmCallSession';
import {
  shouldShowAgoraLocalCameraPip,
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
import { tryEnterPictureInPicture } from '../live/liveNativeExtras';
import { syncAgoraDmCallUiStore, useAgoraDmCallUiStore } from './agoraDmCallUiStore';
import { openDmThreadFromCall } from './openDmThreadFromCall';
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
  });
  const [callId, setCallId] = useState(resolvedCall.callId);
  const callIdRef = useRef(callId);
  callIdRef.current = callId;

  useEffect(() => {
    if (initialCallId) setCallId(initialCallId);
  }, [initialCallId]);
  const [callState, setCallState] = useState<'ringing' | 'connecting' | 'connected' | 'ended'>(
    role === 'caller' ? 'ringing' : 'connecting',
  );
  const callStateRef = useRef(callState);
  const [duration, setDuration] = useState(0);
  const durationRef = useRef(0);
  durationRef.current = duration;
  const [muted, setMuted] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [cameraFlipNonce, setCameraFlipNonce] = useState(0);
  const [mediaEnabled, setMediaEnabled] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [floatingReactions, setFloatingReactions] = useState<{ id: string; emoji: string }[]>([]);
  const [peerScreenSharing, setPeerScreenSharing] = useState(false);
  const [screenShareLoading, setScreenShareLoading] = useState(false);
  const [videoUpgradeLoading, setVideoUpgradeLoading] = useState(false);
  const [showMissedPanel, setShowMissedPanel] = useState(false);
  const [videoNoteBusy, setVideoNoteBusy] = useState(false);
  const finishingRef = useRef(false);
  const mediaEnabledRef = useRef(false);
  const stopOutgoingRingRef = useRef<(() => Promise<void>) | null>(null);
  const bootstrapDoneRef = useRef(false);
  const ringTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const peerAvatarUri = profileAvatarUri(avatar, name);

  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  useEffect(() => {
    logAfwCall('agora_screen_mount', { callId, role, platform: Platform.OS });
  }, [callId, role]);

  const finishCallRef = useRef<
    (reason?: 'completed' | 'failed' | 'missed' | 'declined') => Promise<void>
  >(async () => {});

  const startAgoraMediaTracks = useCallback(async () => {
    if (mediaEnabledRef.current) return;
    await stopOutgoingRingRef.current?.();
    stopOutgoingRingRef.current = null;
    await stopEveryCallRingAlert();
    logAfwCall('agora_media_start', { callId: callIdRef.current, role });
    mediaEnabledRef.current = true;
    setMediaEnabled(true);
  }, [role]);

  const beginAgoraMedia = useCallback(async () => {
    await startAgoraMediaTracks();
    setCallState('connecting');
  }, [startAgoraMediaTracks]);

  const handleRemoteJoined = useCallback(() => {
    setCallState('connected');
    void stopEveryCallRingAlert();
    void apiClient
      .post(`/calls/${encodeURIComponent(callIdRef.current)}/session-state`, { status: 'active' })
      .catch(() => {});
  }, []);

  const {
    joined,
    error: rtcError,
    remoteJoined,
    camOn,
    toggleCam,
    leave: leaveAgora,
    LocalView,
    RemoteView,
    screenSharing: localScreenSharing,
    connectionDisplay,
    toggleScreenShare,
    upgradeToVideo,
    videoPublished,
  } = useDirectCallAgoraRtc({
    callId,
    enabled: mediaEnabled && callState !== 'ended',
    audioOnly: !startedAsVideo,
    muted,
    cameraFlipNonce,
    speakerOn,
    onRemoteJoined: handleRemoteJoined,
    onRemoteLeft: () => {
      if (callStateRef.current !== 'ended') void finishCallRef.current('completed');
    },
    onError: (msg) => setErrorMsg(msg),
  });

  useEffect(() => {
    if (rtcError) setErrorMsg(rtcError);
  }, [rtcError]);

  useEffect(() => {
    if (videoPublished && !isVideoCall) setIsVideoCall(true);
  }, [isVideoCall, videoPublished]);

  useEffect(() => {
    if (!joined || initialCamOn || initialCamAppliedRef.current || !isVideoCall) return;
    if (!camOn) {
      initialCamAppliedRef.current = true;
      return;
    }
    initialCamAppliedRef.current = true;
    toggleCam();
  }, [camOn, initialCamOn, isVideoCall, joined, toggleCam]);

  useFocusEffect(
    useCallback(() => {
      useAgoraDmCallUiStore.getState().setMinimized(false);
    }, []),
  );

  useEffect(() => {
    syncAgoraDmCallUiStore({
      active: callState !== 'ended',
      callId,
      otherUserId,
      peerName: name,
      peerAvatar: avatar,
      isVideoCall,
      role,
      callState,
      durationSeconds: duration,
    });
    return () => {
      if (callStateRef.current === 'ended') {
        useAgoraDmCallUiStore.getState().clearSession();
      }
    };
  }, [avatar, callId, callState, duration, isVideoCall, name, otherUserId, role]);

  useEffect(() => {
    syncAgoraDmCallUiStore({ durationSeconds: duration });
  }, [duration]);

  const finishCall = useCallback(
    async (reason: 'completed' | 'failed' | 'missed' | 'declined' = 'completed') => {
      if (finishingRef.current || callStateRef.current === 'ended') return;
      finishingRef.current = true;
      setCallState('ended');
      if (ringTimeoutRef.current) {
        clearTimeout(ringTimeoutRef.current);
        ringTimeoutRef.current = null;
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      mediaEnabledRef.current = false;
      setMediaEnabled(false);
      await leaveAgora();
      await stopOutgoingRingRef.current?.();
      stopOutgoingRingRef.current = null;
      await stopEveryCallRingAlert();
      logAfwCall('agora_finish', { callId: callIdRef.current, reason });
      await stopActiveCallForeground();
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
      safeRouterBack('/messages');
    },
    [leaveAgora, myUserId, otherUserId],
  );

  finishCallRef.current = finishCall;

  const handleMissedNoAnswer = useCallback(async () => {
    if (finishingRef.current || callStateRef.current !== 'ringing') return;
    finishingRef.current = true;
    setCallState('ended');
    if (ringTimeoutRef.current) {
      clearTimeout(ringTimeoutRef.current);
      ringTimeoutRef.current = null;
    }
    mediaEnabledRef.current = false;
    setMediaEnabled(false);
    await leaveAgora();
    await stopOutgoingRingRef.current?.();
    stopOutgoingRingRef.current = null;
    await stopEveryCallRingAlert();
    await stopActiveCallForeground();
    useAgoraDmCallUiStore.getState().clearSession();
    logAfwCall('agora_missed_no_answer', { callId: callIdRef.current });
    await apiClient
      .post(`/calls/${encodeURIComponent(callIdRef.current)}/session-state`, { status: 'missed' })
      .catch(() => {});
    await socketService.ensureConnectedEmit('call:end', {
      callId: callIdRef.current,
      fromUserId: myUserId,
      toUserId: otherUserId,
      reason: 'missed',
      durationSec: 0,
    });
    setShowMissedPanel(true);
  }, [leaveAgora, myUserId, otherUserId]);

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

  useEffect(() => {
    if (callState !== 'connecting' && callState !== 'connected' && callState !== 'ended') return;
    void stopOutgoingRingRef.current?.();
    stopOutgoingRingRef.current = null;
    void stopEveryCallRingAlert();
  }, [callState]);

  useEffect(() => {
    if (callState !== 'connected') return;
    timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callState]);

  useEffect(() => {
    if (callState !== 'ringing') return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.06, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [callState, pulseAnim]);

  useEffect(() => {
    if (!myUserId || !otherUserId || !callId) return;
    if (bootstrapDoneRef.current) return;
    if (resolvedCall.error && role === 'receiver') {
      setErrorMsg(resolvedCall.error);
      void finishCallRef.current('failed');
      return;
    }
    bootstrapDoneRef.current = true;
    let cancelled = false;
    const authUser = useAuthStore.getState().user;

    void (async () => {
      try {
        const permitted = await requestNativeCallPermissions(startedAsVideo);
        if (!permitted) {
          setErrorMsg('Microphone ou caméra non autorisé.');
          await finishCallRef.current('failed');
          return;
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
            await finishCallRef.current('failed');
            return;
          }
          setInviteSent(true);
          if (startedAsVideo) {
            await startAgoraMediaTracks();
          }
          ringTimeoutRef.current = setTimeout(() => {
            if (callStateRef.current === 'ringing') {
              void handleMissedNoAnswer();
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
            await finishCallRef.current('failed');
            return;
          }
          await beginAgoraMedia();
        }
      } catch {
        if (!cancelled) {
          setErrorMsg('Impossible de démarrer l’appel.');
          await finishCallRef.current('failed');
        }
      }
    })();

    const onAccept = (payload: { callId?: string }) => {
      if (role !== 'caller') return;
      if (payload?.callId && payload.callId !== callIdRef.current) return;
      if (ringTimeoutRef.current) {
        clearTimeout(ringTimeoutRef.current);
        ringTimeoutRef.current = null;
      }
      if (mediaEnabledRef.current) {
        setCallState('connecting');
      } else {
        void beginAgoraMedia();
      }
    };

    const onEnd = (payload?: { callId?: string }) => {
      if (payload?.callId && payload.callId !== callIdRef.current) return;
      void finishCallRef.current('completed');
    };

    const onInviteAck = (payload: { callId?: string; receiverReachable?: boolean }) => {
      if (role !== 'caller' || !payload?.callId) return;
      callIdRef.current = String(payload.callId);
      setCallId(String(payload.callId));
      if (payload.receiverReachable === false) {
        setErrorMsg(
          'Le correspondant semble hors ligne. Une notification lui a été envoyée — il doit ouvrir AfriWonder.',
        );
      }
    };

    const offAccept = socketService.on('call:accept', onAccept);
    const offEnd = socketService.on('call:end', onEnd);
    const offDecline = socketService.on('call:decline', onEnd);
    const offMissed = socketService.on('call:missed', onEnd);
    const offInviteAck = socketService.on('call:invite:ack', onInviteAck);

    return () => {
      cancelled = true;
      offAccept();
      offEnd();
      offDecline();
      offMissed();
      offInviteAck();
      void stopOutgoingRingRef.current?.();
      stopOutgoingRingRef.current = null;
      void stopEveryCallRingAlert();
    };
  }, [
    beginAgoraMedia,
    callId,
    handleMissedNoAnswer,
    myUserId,
    name,
    otherUserId,
    resolvedCall.error,
    role,
    startAgoraMediaTracks,
    startedAsVideo,
  ]);

  const statusLine = (() => {
    if (callState === 'connected') {
      return formatWhatsAppCallStatus({ callState, durationSeconds: duration, role, errorMsg: null });
    }
    if (errorMsg) return errorMsg;
    if (callState === 'connecting') return 'Connexion média…';
    if (callState === 'ringing') {
      if (role === 'receiver') return 'Appel entrant…';
      return inviteSent ? 'Appel en cours…' : 'Appel';
    }
    return 'Appel';
  })();

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

  const handleMinimize = useCallback(async () => {
    if (callState === 'ended') return;
    if (isVideoCall && joined) {
      await tryEnterPictureInPicture();
    }
    useAgoraDmCallUiStore.getState().setMinimized(true);
    await openDmThreadFromCall({ otherUserId, peerName: name, peerAvatar: avatar });
  }, [avatar, callState, isVideoCall, joined, name, otherUserId]);

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

  useEffect(() => {
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
        void upgradeToVideo();
      },
    );
    return () => {
      offR();
      offS();
      offU();
    };
  }, [otherUserId, myUserId, pushFloatingReaction, upgradeToVideo]);

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
    isVideoCall,
    mediaEnabled,
    localScreenSharing,
    peerScreenSharing,
  });
  const showLocalFull = shouldShowLocalVideoFullscreen({
    isVideoCall,
    mediaEnabled,
    remoteJoined,
  });
  const showRemoteFull = shouldShowRemoteVideoFullscreen({ isVideoCall, remoteJoined });
  const showSideRail = shouldShowVideoSideRail({ isVideoCall, mediaEnabled, remoteJoined });
  const showCameraPip = shouldShowAgoraLocalCameraPip({
    isVideoCall,
    camOn,
    localScreenSharing,
    remoteJoined,
  });
  const isMuted = muted;

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
      ]}
      pointerEvents="box-none"
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
              {showCameraPip ? (
                <View style={styles.pip}>
                  <LocalView style={styles.videoFill} />
                  <TouchableOpacity
                    style={styles.pipFlipBtn}
                    onPress={flipCamera}
                    accessibilityLabel="Retourner la caméra"
                  >
                    <Ionicons name="camera-reverse-outline" size={20} color="#FFF" />
                  </TouchableOpacity>
                </View>
              ) : null}
              <TouchableOpacity
                style={[styles.videoChatFab, { top: insets.top + 56 }]}
                onPress={handleOpenChat}
                accessibilityLabel="Message"
              >
                <Ionicons name="chatbubble-ellipses-outline" size={22} color="#FFF" />
              </TouchableOpacity>
            </>
          ) : showLocalFull ? (
            <>
              {camOn ? (
                <LocalView style={styles.videoFill} />
              ) : (
                <View style={styles.videoFill}>
                  <Image source={{ uri: peerAvatarUri }} style={styles.localPreviewFallback} />
                </View>
              )}
              {showSideRail ? (
                <View style={[styles.videoSideRail, { top: insets.top + 72 }]}>
                  <TouchableOpacity
                    style={styles.sideToolBtn}
                    onPress={openAddPeople}
                    accessibilityLabel="Ajouter un participant"
                  >
                    <Ionicons name="person-add-outline" size={22} color="#FFF" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.sideToolBtn}
                    onPress={handleOpenChat}
                    accessibilityLabel="Message"
                  >
                    <Ionicons name="chatbubble-ellipses-outline" size={22} color="#FFF" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.sideToolBtn}
                    onPress={flipCamera}
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
          {(peerScreenSharing || localScreenSharing) ? (
            <View style={[styles.screenShareBanner, { top: insets.top + 12 }]}>
              <Text style={styles.screenShareBannerText}>
                {localScreenSharing ? 'Vous partagez votre écran' : `${name} partage son écran`}
              </Text>
            </View>
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

      <View style={[styles.dockWrap, showVideoStage ? { paddingBottom: insets.bottom + 12 } : null]}>
        <View style={styles.dock}>
          <TouchableOpacity
            style={styles.dockBtn}
            onPress={() => setMoreMenuOpen(true)}
            accessibilityLabel="Options"
          >
            <Ionicons name="ellipsis-horizontal" size={24} color="#FFF" />
          </TouchableOpacity>
          {isVideoCall ? (
            <TouchableOpacity
              style={[styles.dockBtn, camOn ? styles.dockBtnActive : null]}
              onPress={() => toggleCam()}
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
              onPress={() => void handleUpgradeToVideo()}
              disabled={videoUpgradeLoading || callState !== 'connected'}
              accessibilityLabel="Passer en vidéo"
            >
              <Ionicons name="videocam" size={24} color="#FFF" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.dockBtn, speakerOn ? styles.dockBtnActive : null]}
            onPress={handleToggleSpeaker}
            accessibilityLabel="Haut-parleur"
          >
            <Ionicons name="volume-high" size={24} color={speakerOn ? '#111B21' : '#FFF'} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.dockBtn} onPress={handleToggleMute} accessibilityLabel="Micro">
            <Ionicons name={isMuted ? 'mic-off' : 'mic'} size={24} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.dockBtn, styles.hangup]}
            onPress={handleHangup}
            accessibilityLabel="Raccrocher"
          >
            <Ionicons name="call" size={26} color="#FFF" style={styles.hangupIcon} />
          </TouchableOpacity>
        </View>
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
  },
  topBarOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 6,
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
  videoStage: { flex: 1, position: 'relative', backgroundColor: '#101822' },
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
  dockWrap: { paddingHorizontal: 16, paddingBottom: 16 },
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
