/**
 * Écran appel DM 1:1 — média Agora (signalisation Socket.io conservée).
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import apiClient from '../api/client';
import { buildCallAcceptPayload } from './callSignalingPayload';
import { logAfwCall } from './callDiagnosticLog';
import { formatCallStatusLine } from './callStatusLine';
import {
  requestNativeCallPermissions,
  startNativeCallAudioSession,
  stopNativeCallAudioSession,
} from './callNativeMedia';
import { startActiveCallForeground, stopActiveCallForeground } from '../services/incomingCallService';
import { useDirectCallAgoraRtc } from '../hooks/useDirectCallAgoraRtc';
import { useAuthStore } from '../store/authStore';
import socketService from '../services/socketService';
import { profileAvatarUri } from '../utils/avatarFallback';
import { safeRouterBack } from '../utils/safeRouter';
import { startOutgoingRingbackPattern, stopAllCallRings } from './callRingtone';
import { Colors } from '../theme/colors';

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
  const otherUserId = String(params.peerId || params.otherUserId || '').trim();
  const role = String(params.role || 'caller') === 'receiver' ? 'receiver' : 'caller';
  const initialCallId = String(params.callId || '').trim();
  const myUserId = String(user?.id || '');

  const callIdRef = useRef(initialCallId || newCallId());
  const [callState, setCallState] = useState<'ringing' | 'connecting' | 'connected' | 'ended'>(
    role === 'caller' ? 'ringing' : 'connecting',
  );
  const callStateRef = useRef(callState);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [cameraOff, setCameraOff] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [cameraFlipNonce, setCameraFlipNonce] = useState(0);
  const [mediaEnabled, setMediaEnabled] = useState(false);
  const finishingRef = useRef(false);
  const ringTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const peerAvatarUri = profileAvatarUri(avatar, name);

  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  useEffect(() => {
    if (initialCallId) callIdRef.current = initialCallId;
  }, [initialCallId]);

  const {
    joined,
    error: rtcError,
    remoteJoined,
    micOn,
    camOn,
    toggleMic,
    toggleCam,
    leave: leaveAgora,
    LocalView,
    RemoteView,
  } = useDirectCallAgoraRtc({
    callId: callIdRef.current,
    enabled: mediaEnabled && callState !== 'ended',
    audioOnly: !startedAsVideo,
    muted,
    videoEnabled: startedAsVideo && !cameraOff,
    cameraFlipNonce,
    onRemoteJoined: () => {
      setCallState('connected');
      void stopAllCallRings();
      void apiClient
        .post(`/calls/${encodeURIComponent(callIdRef.current)}/session-state`, { status: 'active' })
        .catch(() => {});
    },
    onRemoteLeft: () => {
      if (callStateRef.current !== 'ended') finishCall('completed');
    },
    onError: (msg) => setErrorMsg(msg),
  });

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
      setMediaEnabled(false);
      await leaveAgora();
      await stopAllCallRings();
      await stopNativeCallAudioSession();
      await stopActiveCallForeground();
      const status =
        reason === 'missed' ? 'missed' : reason === 'declined' ? 'declined' : reason === 'failed' ? 'failed' : 'completed';
      await apiClient
        .post(`/calls/${encodeURIComponent(callIdRef.current)}/session-state`, {
          status,
          duration,
        })
        .catch(() => {});
      await socketService.ensureConnectedEmit('call:end', {
        callId: callIdRef.current,
        fromUserId: myUserId,
        toUserId: otherUserId,
        reason,
        durationSec: duration,
      });
      safeRouterBack('/messages');
    },
    [duration, leaveAgora, myUserId, otherUserId],
  );

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
    if (!myUserId || !otherUserId) return;
    let cancelled = false;

    void (async () => {
      try {
        const permitted = await requestNativeCallPermissions(startedAsVideo);
        if (!permitted) {
          setErrorMsg('Microphone ou caméra non autorisé.');
          await finishCall('failed');
          return;
        }
        await startNativeCallAudioSession(startedAsVideo, speakerOn, {
          outgoingRingback: role === 'caller',
        });
        if (role === 'caller') {
          await startOutgoingRingbackPattern();
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
            callerName: user?.full_name || user?.username || 'Quelqu’un',
            callerAvatar: user?.profile_image || user?.avatar || '',
          };
          logAfwCall('invite_emit_agora', invitePayload);
          const invited = await socketService.ensureConnectedEmit('call:invite', invitePayload);
          if (!invited) {
            setErrorMsg('Connexion indisponible. Réessayez.');
            await finishCall('failed');
            return;
          }
          ringTimeoutRef.current = setTimeout(() => {
            if (callStateRef.current === 'ringing') {
              setErrorMsg('Pas de réponse.');
              void finishCall('missed');
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
            await finishCall('failed');
            return;
          }
          setCallState('connecting');
          setMediaEnabled(true);
        }
      } catch {
        if (!cancelled) {
          setErrorMsg('Impossible de démarrer l’appel.');
          await finishCall('failed');
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
      setCallState('connecting');
      setMediaEnabled(true);
    };

    const onEnd = (payload?: { callId?: string }) => {
      if (payload?.callId && payload.callId !== callIdRef.current) return;
      void finishCall('completed');
    };

    const offAccept = socketService.on('call:accept', onAccept);
    const offEnd = socketService.on('call:end', onEnd);
    const offDecline = socketService.on('call:decline', onEnd);
    const offMissed = socketService.on('call:missed', onEnd);

    return () => {
      cancelled = true;
      offAccept();
      offEnd();
      offDecline();
      offMissed();
    };
  }, [
    finishCall,
    myUserId,
    name,
    otherUserId,
    role,
    speakerOn,
    startedAsVideo,
    user?.avatar,
    user?.full_name,
    user?.profile_image,
    user?.username,
  ]);

  const statusLine = formatCallStatusLine({
    hasWebRtcSupport: true,
    callState,
    durationSeconds: duration,
    role,
    peerOnline: true,
    answered: callState !== 'ringing',
    errorMsg: errorMsg || rtcError,
  });

  const handleHangup = useCallback(() => {
    void finishCall(role === 'caller' && callState === 'ringing' ? 'declined' : 'completed');
  }, [callState, finishCall, role]);

  const showVideo = startedAsVideo && !cameraOff;

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => safeRouterBack('/messages')} accessibilityLabel="Retour">
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <View style={styles.topTitleWrap}>
          <Text style={styles.topName}>{name}</Text>
          <Text style={styles.topStatus}>{statusLine}</Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      {showVideo && joined ? (
        <View style={styles.videoStage}>
          <RemoteView style={styles.videoFill} />
          <View style={styles.pip}>
            <LocalView style={styles.videoFill} />
          </View>
        </View>
      ) : (
        <View style={styles.audioStage}>
          <Animated.View style={[styles.avatarRing, { transform: [{ scale: pulseAnim }] }]}>
            <Image source={{ uri: peerAvatarUri }} style={styles.avatar} />
          </Animated.View>
          {!joined && callState !== 'ended' ? (
            <ActivityIndicator color={Colors.primary} style={{ marginTop: 24 }} />
          ) : null}
        </View>
      )}

      <View style={styles.controls}>
        <TouchableOpacity style={styles.ctrlBtn} onPress={toggleMic} accessibilityLabel="Micro">
          <Ionicons name={micOn && !muted ? 'mic' : 'mic-off'} size={26} color="#FFF" />
        </TouchableOpacity>
        {startedAsVideo ? (
          <TouchableOpacity
            style={styles.ctrlBtn}
            onPress={() => {
              setCameraOff((v) => !v);
              toggleCam();
            }}
            accessibilityLabel="Caméra"
          >
            <Ionicons name={camOn && !cameraOff ? 'videocam' : 'videocam-off'} size={26} color="#FFF" />
          </TouchableOpacity>
        ) : null}
        {startedAsVideo ? (
          <TouchableOpacity
            style={styles.ctrlBtn}
            onPress={() => setCameraFlipNonce((n) => n + 1)}
            accessibilityLabel="Retourner la caméra"
          >
            <Ionicons name="camera-reverse" size={26} color="#FFF" />
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity style={[styles.ctrlBtn, styles.hangup]} onPress={handleHangup} accessibilityLabel="Raccrocher">
          <Ionicons name="call" size={28} color="#FFF" style={{ transform: [{ rotate: '135deg' }] }} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0B141A' },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingBottom: 8 },
  topTitleWrap: { flex: 1, alignItems: 'center' },
  topName: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  topStatus: { color: 'rgba(255,255,255,0.72)', fontSize: 14, marginTop: 2 },
  audioStage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  avatarRing: { width: 180, height: 180, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 140, height: 140, borderRadius: 70, borderWidth: 3, borderColor: Colors.primary },
  videoStage: { flex: 1, position: 'relative', backgroundColor: '#101822' },
  videoFill: { flex: 1, width: '100%', height: '100%' },
  pip: {
    position: 'absolute',
    bottom: 120,
    right: 16,
    width: 110,
    height: 156,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 20,
  },
  ctrlBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hangup: { backgroundColor: '#E53935', width: 64, height: 64, borderRadius: 32 },
});
