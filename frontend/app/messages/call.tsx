import React, { useCallback, useEffect, useMemo, useRef, useState, createElement, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  Dimensions,
  Platform,
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
} from 'react-native';
import { Colors } from '../../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { safeRouterBack } from '../../src/utils/safeRouter';
import socketService from '../../src/services/socketService';
import { buildCallAcceptPayload } from '../../src/call/callSignalingPayload';
import { useAuthStore } from '../../src/store/authStore';
import apiClient from '../../src/api/client';
import { profileAvatarUri } from '../../src/utils/avatarFallback';
import { startOutgoingRingbackPattern } from '../../src/call/callRingtone';
import { tryLoadReactNativeWebRtc } from '../../src/call/tryLoadReactNativeWebRtc';
import {
  applyNativeCallSpeakerRoute,
  releaseExpoAvForWebRtcCall,
  requestNativeCallPermissions,
  resolveWebRtcMediaDevices,
  startNativeCallAudioSession,
  stopNativeCallAudioSession,
} from '../../src/call/callNativeMedia';
import { connectionQualityFromRtcStatsReport } from '../../src/call/webrtcConnectionQuality';
import {
  buildCallIceConfig,
  pickVideoProfileForNetwork,
  type VideoQualityProfile as NetVideoQualityProfile,
} from '../../src/call/callNetworkConfig';
import { parseTurnCredentialsResponse } from '../../src/call/parseTurnCredentialsResponse';
import { formatCallStatusLine } from '../../src/call/callStatusLine';
import { logCallPhase, sdpContainsMedia } from '../../src/call/callDebug';
import { countLocalTracks, shouldMarkCallConnected, streamHasLiveAudio } from '../../src/call/callRemoteMedia';
import { devWarn } from '../../src/utils/devLog';
import { CallDuringMessageModal, CallMoreOptionsSheet } from '../../src/components/call/CallMoreMenu';
import NetInfo from '@react-native-community/netinfo';

/**
 * Profil de qualité vidéo selon la bande passante détectée (2G/3G/4G/Wi‑Fi).
 * Logique pure + testée dans `callNetworkConfig.ts`.
 */
async function detectVideoProfile(): Promise<NetVideoQualityProfile> {
  try {
    const st = await NetInfo.fetch();
    const details = (st.details || {}) as { cellularGeneration?: string | null };
    return pickVideoProfileForNetwork({
      type: st.type,
      cellularGeneration: details.cellularGeneration,
    });
  } catch {
    return pickVideoProfileForNetwork(null);
  }
}

const { width, height: screenH } = Dimensions.get('window');

const ALLOWED_CALL_REACTIONS = new Set(['👍', '❤️', '😂', '😮', '😢', '🙏']);

/** Icônes « doodle » façon fond WhatsApp — faible opacité, lecture seule. */
const WALLPAPER_ICON_NAMES = [
  'cafe-outline',
  'camera-outline',
  'musical-notes-outline',
  'heart-outline',
  'flash-outline',
  'moon-outline',
  'leaf-outline',
  'planet-outline',
  'fish-outline',
  'pizza-outline',
  'football-outline',
  'game-controller-outline',
  'headset-outline',
  'mic-outline',
  'videocam-outline',
  'call-outline',
  'chatbubble-outline',
  'happy-outline',
  'star-outline',
  'cloud-outline',
] as const;

const CallWallpaperPattern = memo(function CallWallpaperPattern() {
  const tiles = useMemo(() => {
    const rows = 14;
    const cols = 8;
    const out: { key: string; name: (typeof WALLPAPER_ICON_NAMES)[number]; left: number; top: number; rotate: string }[] =
      [];
    let i = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const name = WALLPAPER_ICON_NAMES[i % WALLPAPER_ICON_NAMES.length];
        i++;
        out.push({
          key: `${r}-${c}`,
          name,
          left: (c / cols) * width + (r % 2 === 0 ? 0 : 12),
          top: (r / rows) * screenH * 0.92,
          rotate: `${((r + c) % 5) * 17 - 34}deg`,
        });
      }
    }
    return out;
  }, []);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {tiles.map((t) => (
        <View
          key={t.key}
          style={{
            position: 'absolute',
            width: 28,
            height: 28,
            left: t.left,
            top: t.top,
            transform: [{ rotate: t.rotate }],
          }}
        >
          <Ionicons name={t.name} size={22} color="rgba(255,255,255,0.07)" />
        </View>
      ))}
    </View>
  );
});

/**
 * Appel audio/vidéo 1-1 — web (navigateur) ou Android/iOS (`react-native-webrtc` dans l’app installée).
 *
 *  Paramètres `useLocalSearchParams` :
 *  - `name`         : nom à afficher
 *  - `avatar`       : URL avatar
 *  - `type`         : `audio` (défaut) ou `video`
 *  - `otherUserId`  : id de l'autre participant (requis pour la signalisation)
 *  - `role`         : `caller` (défaut) ou `receiver`
 *  - `callId`       : id existant si on rejoint une invitation
 */

type RTCSessionDescriptionInitLite = { type: 'offer' | 'answer' | 'rollback' | 'pranswer'; sdp?: string };
type SignalPayload =
  | { kind: 'sdp'; sdp: RTCSessionDescriptionInitLite }
  | { kind: 'ice'; candidate: RTCIceCandidateInit | null };

const CALL_RING_MS = 30_000;
const CALL_CONNECTING_WATCHDOG_MS = 15_000;
/** Délai sans piste distante après accept — message réseau / TURN. */
const CALL_MEDIA_READY_HINT_MS = 12_000;
const isWebRuntime = Platform.OS === 'web';

/** Calques semi-transparents sur le PiP local (aperçu selfie) — même logique Web / natif. */
const PIP_EFFECT_LAYER: Record<'warm' | 'cool' | 'soft', string> = {
  warm: 'rgba(255, 165, 95, 0.24)',
  cool: 'rgba(100, 165, 255, 0.22)',
  soft: 'rgba(255, 255, 255, 0.18)',
};
const nativeWebRTC: any = tryLoadReactNativeWebRtc();
const RTCPeerConnectionImpl: any = isWebRuntime ? RTCPeerConnection : nativeWebRTC?.RTCPeerConnection;
const RTCIceCandidateImpl: any = isWebRuntime ? RTCIceCandidate : nativeWebRTC?.RTCIceCandidate;
const RTCSessionDescriptionImpl: any = isWebRuntime ? RTCSessionDescription : nativeWebRTC?.RTCSessionDescription;
const RTCViewNative: any = nativeWebRTC?.RTCView;

function newCallId(): string {
  return `call-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function CallScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  // Rétro-compatibilité : accepte aussi peerId/peerName/peerAvatar/callType (inbox call history → call screen).
  const name = String(params.peerName || params.name || 'Contact');
  const avatar = String(params.peerAvatar || params.avatar || '');
  const isVideo = String(params.callType || params.type) === 'video';
  const otherUserId = String(params.peerId || params.otherUserId || '').trim();
  const peerAvatarUri = useMemo(
    () => profileAvatarUri(avatar, name.trim() || 'Contact'),
    [avatar, name],
  );
  const role = (String(params.role || 'caller') === 'receiver' ? 'receiver' : 'caller') as 'caller' | 'receiver';
  const initialCallId = String(params.callId || '').trim();

  const { user } = useAuthStore();
  const myAvatarUri = useMemo(
    () => profileAvatarUri(user?.profile_image || user?.avatar || '', user?.full_name || user?.username || 'Moi'),
    [user?.profile_image, user?.avatar, user?.full_name, user?.username],
  );
  const myUserId = String(user?.id || '');
  const callIdRef = useRef<string>(initialCallId || newCallId());

  const [callState, setCallState] = useState<'ringing' | 'connecting' | 'connected' | 'ended'>(
    role === 'caller' ? 'ringing' : 'connecting',
  );
  const [peerOnline, setPeerOnline] = useState<boolean | null>(null);
  /** Dès que le correspondant a décroché — le chronomètre démarre seulement à `connected` (média WebRTC). */
  const [peerAnswered, setPeerAnswered] = useState(false);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true);
  const speakerOnRef = useRef(true);
  const webrtcMediaActiveRef = useRef(false);
  const stopOutgoingRingRef = useRef<(() => Promise<void>) | null>(null);
  const [cameraOff, setCameraOff] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [floatingReactions, setFloatingReactions] = useState<{ id: string; emoji: string }[]>([]);
  const [peerRaisedHand, setPeerRaisedHand] = useState(false);
  const [myRaisedHand, setMyRaisedHand] = useState(false);
  const [peerScreenSharing, setPeerScreenSharing] = useState(false);
  const [localScreenSharing, setLocalScreenSharing] = useState(false);
  const [screenShareLoading, setScreenShareLoading] = useState(false);
  const [connectionDisplay, setConnectionDisplay] = useState<{
    labelFr: string;
    bars: 1 | 2 | 3;
    quality: 'good' | 'fair' | 'poor';
  }>({ labelFr: 'Connexion…', bars: 2, quality: 'fair' });
  const [pipEffect, setPipEffect] = useState<'none' | 'warm' | 'cool' | 'soft'>('none');
  const [effectsModalOpen, setEffectsModalOpen] = useState(false);
  /** `remote` = correspondant plein écran ; `local` = selfie plein écran (PiP = l’autre flux). */
  const [videoLayoutFocus, setVideoLayoutFocus] = useState<'remote' | 'local'>('remote');

  const screenShareDisplayStreamRef = useRef<MediaStream | null>(null);
  const facingModeRef = useRef<'user' | 'environment'>('user');

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ringTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectionWatchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mediaReadyHintRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Refs PeerConnection + flux média (web et natif lorsque l’appel démarre). */
  const pcRef = useRef<any>(null);
  const localStreamRef = useRef<any>(null);
  const remoteStreamRef = useRef<any>(null);
  const localVideoElRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoElRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioElRef = useRef<HTMLAudioElement | null>(null);
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([]);
  const startedAtRef = useRef<number | null>(null);
  const callStateRef = useRef(callState);
  const [remoteStreamUrl, setRemoteStreamUrl] = useState<string>('');
  const [localStreamUrl, setLocalStreamUrl] = useState<string>('');
  const [localStreamKey, setLocalStreamKey] = useState(0);
  const [remoteStreamKey, setRemoteStreamKey] = useState(0);
  const pcTearingDownRef = useRef(false);
  /** Évite une double offre SDP si `call:accept` est reçu deux fois. */
  const callerOfferSentRef = useRef(false);

  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  const stopAllMedia = useCallback(() => {
    try {
      screenShareDisplayStreamRef.current?.getTracks?.().forEach((t) => {
        try {
          t.stop?.();
        } catch {
          /* ignore */
        }
      });
      screenShareDisplayStreamRef.current = null;
    } catch {
      /* ignore */
    }
    try {
      const local = localStreamRef.current as MediaStream | { getTracks?: () => { stop?: () => void }[] } | null;
      local?.getTracks?.().forEach((t) => {
        try {
          t.stop?.();
        } catch {
          /* ignore */
        }
      });
    } catch {
      /* ignore */
    }
    localStreamRef.current = null;
    remoteStreamRef.current = null;
    try {
      pcRef.current?.close?.();
    } catch {
      /* ignore */
    }
    pcRef.current = null;
    pcTearingDownRef.current = true;
    webrtcMediaActiveRef.current = false;
    void stopNativeCallAudioSession();
    void stopOutgoingRingRef.current?.();
    stopOutgoingRingRef.current = null;
    if (!isWebRuntime) {
      setLocalStreamUrl('');
      setRemoteStreamUrl('');
    }
  }, []);

  const finishCall = useCallback(
    (reason: 'ended' | 'failed' | 'declined' = 'ended') => {
      if (callState === 'ended') return;
      setPeerRaisedHand(false);
      setMyRaisedHand(false);
      setPeerScreenSharing(false);
      setLocalScreenSharing(false);
      setCallState('ended');
      if (timerRef.current) clearInterval(timerRef.current);
      if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current);
      if (connectionWatchdogRef.current) clearTimeout(connectionWatchdogRef.current);
      stopAllMedia();
      if (otherUserId && myUserId) {
        void socketService.ensureConnectedEmit('call:end', {
          callId: callIdRef.current,
          fromUserId: myUserId,
          toUserId: otherUserId,
          endedBy: myUserId,
        });
      }
      const elapsed = startedAtRef.current ? Math.floor((Date.now() - startedAtRef.current) / 1000) : 0;
      apiClient
        .post(`/calls/${encodeURIComponent(callIdRef.current)}/session-state`, {
          status: reason === 'failed' ? 'failed' : reason === 'declined' ? 'declined' : 'completed',
          duration: elapsed,
        })
        .catch(() => {
          /* best effort */
        });
      setTimeout(() => {
        try {
          safeRouterBack('/messages');
        } catch {
          /* ignore */
        }
      }, 600);
    },
    [callState, otherUserId, myUserId, stopAllMedia],
  );

  /** Animation de pulse pendant le ringing. */
  useEffect(() => {
    if (callState !== 'ringing') return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.3, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [callState, pulseAnim]);

  /** Timer : uniquement après connexion média WebRTC (`connected`), pas au simple accept socket. */
  useEffect(() => {
    if (callState !== 'connected') return;
    startedAtRef.current = startedAtRef.current ?? Date.now();
    timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callState]);

  /** Présence du correspondant (en ligne → « Appel en cours… », sinon « Appel »). */
  useEffect(() => {
    if (!otherUserId) return undefined;
    let cancelled = false;
    void apiClient
      .get(`/messages/presence/${encodeURIComponent(otherUserId)}`)
      .then((res) => {
        if (cancelled) return;
        setPeerOnline(Boolean(res.data?.data?.is_online));
      })
      .catch(() => {
        if (!cancelled) setPeerOnline(null);
      });
    const offPresence = socketService.on(
      'presence:update',
      (data: { userId?: string; isOnline?: boolean }) => {
        if (data?.userId === otherUserId) setPeerOnline(Boolean(data.isOnline));
      },
    );
    return () => {
      cancelled = true;
      offPresence();
    };
  }, [otherUserId]);

  /**
   * Bootstrap PeerConnection : web (navigateur) ou natif (`react-native-webrtc` présent dans la build).
   */
  useEffect(() => {
    const mediaDevicesImpl = resolveWebRtcMediaDevices();
    const canRunCalls =
      isWebRuntime ||
      Boolean(nativeWebRTC && RTCPeerConnectionImpl && mediaDevicesImpl?.getUserMedia);
    if (!canRunCalls) {
      if (!isWebRuntime) {
        setErrorMsg(
          'Les appels audio/vidéo nécessitent l’application installée (build EAS). Expo Go ne prend pas en charge WebRTC.',
        );
        setCallState('ended');
      }
      return;
    }

    if (!otherUserId) {
      setErrorMsg('Identifiant du correspondant manquant.');
      return;
    }
    if (!myUserId) {
      setErrorMsg('Vous devez être connecté pour lancer un appel.');
      return;
    }

    let cancelled = false;

    const callId = callIdRef.current;
    logCallPhase(callId, 'bootstrap', { role, isVideo, otherUserId, platform: Platform.OS });

    const setupRemoteEl = (stream: MediaStream, trackKind?: string) => {
      try {
        stream.getAudioTracks?.().forEach((t) => {
          t.enabled = true;
        });
      } catch {
        /* ignore */
      }
      if (isWebRuntime && isVideo && remoteVideoElRef.current) {
        remoteVideoElRef.current.srcObject = stream;
        remoteVideoElRef.current.play().catch(() => {});
      }
      /** Appel vidéo : l’audio sort du `<video>` distant — ne pas dupliquer sur `<audio>` (double lecture). */
      if (isWebRuntime && !isVideo && remoteAudioElRef.current) {
        remoteAudioElRef.current.srcObject = stream;
        remoteAudioElRef.current.play().catch(() => {});
      }
      if (!isWebRuntime) {
        const url = (stream as { toURL?: () => string })?.toURL?.();
        if (url) {
          setRemoteStreamUrl(url);
          /** Remonte RTCView pour prendre en compte les pistes audio ajoutées après la vidéo. */
          setRemoteStreamKey((k) => k + 1);
        }
      }
      logCallPhase(callId, 'remote_stream_updated', {
        trackKind,
        audioTracks: stream.getAudioTracks?.().length ?? 0,
        videoTracks: stream.getVideoTracks?.().length ?? 0,
      });
    };

    const markCallConnected = () => {
      if (callStateRef.current === 'connected') return;
      logCallPhase(callId, 'media_connected', {
        remoteAudio: streamHasLiveAudio(remoteStreamRef.current as MediaStream),
      });
      setCallState('connected');
      if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current);
      if (connectionWatchdogRef.current) clearTimeout(connectionWatchdogRef.current);
      if (mediaReadyHintRef.current) clearTimeout(mediaReadyHintRef.current);
      if (isWebRuntime && remoteAudioElRef.current) {
        try {
          remoteAudioElRef.current.muted = false;
        } catch {
          /* ignore */
        }
      }
      if (isWebRuntime && isVideo && remoteVideoElRef.current) {
        try {
          remoteVideoElRef.current.muted = false;
        } catch {
          /* ignore */
        }
      }
      if (!isWebRuntime) {
        void applyNativeCallSpeakerRoute(speakerOnRef.current);
      }
      void apiClient
        .post(`/calls/${encodeURIComponent(callIdRef.current)}/session-state`, { status: 'active' })
        .catch(() => {});
    };

    const maybeMarkCallConnected = (stream: MediaStream, trackKind?: string) => {
      if (!shouldMarkCallConnected({ trackKind, stream })) return;
      markCallConnected();
    };

    const armMediaReadyHint = () => {
      if (mediaReadyHintRef.current) clearTimeout(mediaReadyHintRef.current);
      mediaReadyHintRef.current = setTimeout(() => {
        if (cancelled || callStateRef.current === 'connected') return;
        if (streamHasLiveAudio(remoteStreamRef.current as MediaStream)) return;
        setErrorMsg(
          'Connexion lente ou bloquée par le réseau mobile. Vérifiez le Wi‑Fi ou réessayez dans quelques secondes.',
        );
      }, CALL_MEDIA_READY_HINT_MS);
    };

    const waitForLocalMediaReady = async (): Promise<boolean> => {
      for (let i = 0; i < 60; i++) {
        if (cancelled) return false;
        const local = localStreamRef.current as MediaStream | null;
        if (local?.getTracks?.().length) return true;
        await new Promise((r) => setTimeout(r, 100));
      }
      return Boolean((localStreamRef.current as MediaStream | null)?.getTracks?.().length);
    };

    const setupLocalEl = (stream: MediaStream) => {
      if (isWebRuntime && isVideo && localVideoElRef.current) {
        localVideoElRef.current.srcObject = stream;
        localVideoElRef.current.play().catch(() => {});
      }
      if (!isWebRuntime) {
        const url = (stream as { toURL?: () => string })?.toURL?.();
        if (url) {
          setLocalStreamUrl(url);
          setLocalStreamKey((k) => k + 1);
        }
      }
    };

    const sendSignal = (signal: SignalPayload) => {
      const payload = {
        callId: callIdRef.current,
        fromUserId: myUserId,
        toUserId: otherUserId,
        signal,
      };
      void socketService.ensureConnectedEmit('call:signal', payload, signal.kind === 'sdp' ? 12_000 : 8_000).then((ok) => {
        if (!ok && !cancelled && signal.kind === 'sdp') {
          setErrorMsg('Connexion instable. Nouvelle tentative…');
        }
      });
    };

    let restartAttempted = false;
    const armConnectionWatchdog = () => {
      if (connectionWatchdogRef.current) clearTimeout(connectionWatchdogRef.current);
      connectionWatchdogRef.current = setTimeout(async () => {
        if (cancelled) return;
        const pc = pcRef.current as RTCPeerConnection | null;
        if (!pc) return;
        const state = String(pc.connectionState || '');
        if (state === 'connected' || state === 'closed') return;

        // 1ère passe : relance ICE (caller) pour sortir d'un blocage "préparation en cours".
        if (!restartAttempted && role === 'caller') {
          restartAttempted = true;
          try {
            const restartOffer = await pc.createOffer({
              offerToReceiveAudio: true,
              offerToReceiveVideo: isVideo,
              iceRestart: true,
            });
            await pc.setLocalDescription(restartOffer);
            sendSignal({ kind: 'sdp', sdp: { type: restartOffer.type, sdp: restartOffer.sdp } });
            armConnectionWatchdog();
            return;
          } catch {
            // fallback vers fin d'appel ci-dessous
          }
        }

        setErrorMsg('Connexion instable. Réessayez l’appel.');
        finishCall('failed');
      }, CALL_CONNECTING_WATCHDOG_MS);
    };

    const flushPendingIce = async () => {
      const pc = pcRef.current as RTCPeerConnection | null;
      if (!pc || !pc.remoteDescription) return;
      while (pendingIceRef.current.length > 0) {
        const c = pendingIceRef.current.shift();
        if (!c) continue;
        try {
          await pc.addIceCandidate(c);
        } catch (e) {
          logCallPhase(callId, 'ice_remote_failed', { error: String(e) });
        }
      }
    };

    const handleSignal = async (payload: { callId: string; fromUserId: string; signal: SignalPayload }) => {
      if (payload?.callId !== callIdRef.current) return;
      if (payload.fromUserId && payload.fromUserId !== otherUserId) return;
      const pc = pcRef.current as RTCPeerConnection | null;
      if (!pc) return;
      const sig = payload.signal;
      try {
        if (sig.kind === 'sdp' && sig.sdp) {
          const remoteDescription = isWebRuntime
            ? (sig.sdp as RTCSessionDescriptionInit)
            : new RTCSessionDescriptionImpl(sig.sdp);
          await pc.setRemoteDescription(remoteDescription);
          logCallPhase(callId, 'sdp_remote', {
            type: sig.sdp.type,
            hasAudio: sdpContainsMedia(sig.sdp.sdp, 'audio'),
            hasVideo: sdpContainsMedia(sig.sdp.sdp, 'video'),
          });
          await flushPendingIce();
          if (sig.sdp.type === 'offer') {
            const ans = await pc.createAnswer({
              offerToReceiveAudio: true,
              offerToReceiveVideo: isVideo,
            });
            await pc.setLocalDescription(ans);
            logCallPhase(callId, 'sdp_local', {
              type: ans.type,
              hasAudio: sdpContainsMedia(ans.sdp, 'audio'),
              hasVideo: sdpContainsMedia(ans.sdp, 'video'),
            });
            sendSignal({ kind: 'sdp', sdp: { type: ans.type, sdp: ans.sdp } });
          }
        } else if (sig.kind === 'ice') {
          if (!sig.candidate) return;
          if (pc.remoteDescription) {
            const ice = isWebRuntime ? sig.candidate : new RTCIceCandidateImpl(sig.candidate);
            try {
              await pc.addIceCandidate(ice);
            } catch (e) {
              logCallPhase(callId, 'ice_remote_failed', { error: String(e) });
            }
          } else {
            pendingIceRef.current.push(sig.candidate);
          }
        }
      } catch (e) {
        devWarn('[Call] signal handling failed', e);
      }
    };

    /**
     * Côté caller : on attend l'`accept` du receveur avant de créer et d'envoyer
     * l'offre SDP. Sinon le receveur n'a pas encore monté son listener `call:signal`
     * et perd l'offre → l'appel ne se connecte jamais.
     */
    const handlePeerAccepted = async (payload: { callId?: string; type?: 'audio' | 'video' }) => {
      if (cancelled || role !== 'caller') return;
      if (payload?.callId && payload.callId !== callIdRef.current) return;
      if (callerOfferSentRef.current) return;
      if (payload?.type === 'video' && !isVideo) {
        logCallPhase(callId, 'accept_type_mismatch', { invite: 'video', local: 'audio' });
        setErrorMsg('Le correspondant a répondu en vidéo — relancez un appel vidéo.');
        finishCall('failed');
        return;
      }
      if (payload?.type === 'audio' && isVideo) {
        logCallPhase(callId, 'accept_type_mismatch', { invite: 'video', accept: 'audio' });
      }
      setPeerAnswered(true);
      setCallState('connecting');
      armMediaReadyHint();
      const pc = pcRef.current as RTCPeerConnection | null;
      if (!pc) return;
      const mediaReady = await waitForLocalMediaReady();
      if (cancelled || !mediaReady) {
        setErrorMsg('Micro indisponible. Réessayez l’appel.');
        finishCall('failed');
        return;
      }
      callerOfferSentRef.current = true;
      try {
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: isVideo,
        });
        await pc.setLocalDescription(offer);
        logCallPhase(callId, 'sdp_local', {
          type: offer.type,
          hasAudio: sdpContainsMedia(offer.sdp, 'audio'),
          hasVideo: sdpContainsMedia(offer.sdp, 'video'),
        });
        sendSignal({ kind: 'sdp', sdp: { type: offer.type, sdp: offer.sdp } });
      } catch (e) {
        callerOfferSentRef.current = false;
        devWarn('[Call] offer failed', e);
        finishCall('failed');
      }
    };

    const handlePeerEnded = () => finishCall('ended');
    const handlePeerDeclined = () => {
      setErrorMsg('Appel refusé.');
      finishCall('declined');
    };

    const offSignal = socketService.on('call:signal', handleSignal);
    const offAccept = socketService.on('call:accept', handlePeerAccepted);
    const offEnd = socketService.on('call:end', handlePeerEnded);
    const offDecline = socketService.on('call:decline', handlePeerDeclined);

    const start = async () => {
      try {
        /**
         * Optimisations Afrique de l'Ouest (Mali / Sénégal / Côte d'Ivoire) :
         * 1. STUN multiples (Google + Cloudflare + Twilio public) → meilleure résilience NAT
         * 2. TURN obligatoire pour Carrier-Grade NAT mobile (Orange, MTN, Moov) — sinon ~30% des appels échouent
         * 3. Détection bande passante via NetInfo → adapter codec/résolution
         */
        let iceServers: RTCIceServer[] = parseTurnCredentialsResponse(null).iceServers;
        let turnConfigured = false;
        try {
          const res = await apiClient.get('/calls/turn-credentials');
          const parsed = parseTurnCredentialsResponse(res.data?.data || res.data);
          iceServers = parsed.iceServers;
          turnConfigured = parsed.turnConfigured;
        } catch {
          /* Endpoint indisponible : STUN locaux uniquement. */
        }

        /**
         * Mobile Afrique : relais TURN forcé sur cellulaire (2G/3G/4G) si TURN configuré (CGNAT opérateur).
         * Logique pure + testée dans `callNetworkConfig.ts`.
         */
        let iceNetSnapshot: { type?: string | null; cellularGeneration?: string | null } = {};
        if (!isWebRuntime) {
          try {
            const net = await NetInfo.fetch();
            const det = (net.details || {}) as { cellularGeneration?: string | null };
            iceNetSnapshot = { type: net.type, cellularGeneration: det.cellularGeneration };
          } catch {
            /** En cas d'échec NetInfo sur mobile : on suppose cellulaire (cas majoritaire Afrique) → relais. */
            iceNetSnapshot = { type: 'cellular' };
          }
        }
        const pcConfig = buildCallIceConfig({
          iceServers,
          turnConfigured,
          isWeb: isWebRuntime,
          net: iceNetSnapshot,
        });
        logCallPhase(callId, 'turn_config', {
          turnConfigured,
          iceTransportPolicy: pcConfig.iceTransportPolicy ?? 'all',
          netType: iceNetSnapshot.type,
          cellularGeneration: iceNetSnapshot.cellularGeneration,
          iceServersCount: iceServers.length,
        });
        pcTearingDownRef.current = false;
        const pc = new RTCPeerConnectionImpl(pcConfig);
        pcRef.current = pc;

        const remoteStream = isWebRuntime ? new MediaStream() : new nativeWebRTC.MediaStream();
        remoteStreamRef.current = remoteStream;

        pc.ontrack = (ev: RTCTrackEvent) => {
          const trackKind = ev.track?.kind;
          const inbound = ev.streams?.[0];
          if (inbound) {
            remoteStreamRef.current = inbound;
            setupRemoteEl(inbound, trackKind);
            if (!isWebRuntime && trackKind === 'audio') {
              void applyNativeCallSpeakerRoute(speakerOnRef.current);
            }
            maybeMarkCallConnected(inbound, trackKind);
            return;
          }
          if (ev.track) {
            try {
              remoteStream.addTrack(ev.track);
            } catch {
              /* piste déjà présente */
            }
            remoteStreamRef.current = remoteStream;
            setupRemoteEl(remoteStream, trackKind);
            if (!isWebRuntime && trackKind === 'audio') {
              void applyNativeCallSpeakerRoute(speakerOnRef.current);
            }
            maybeMarkCallConnected(remoteStream, trackKind);
          }
        };

        pc.onicecandidate = (ev: RTCPeerConnectionIceEvent) => {
          if (ev.candidate) {
            logCallPhase(callId, 'ice_local', {
              type: ev.candidate.type,
              protocol: ev.candidate.protocol,
            });
            sendSignal({ kind: 'ice', candidate: ev.candidate.toJSON() });
          }
        };

        pc.onconnectionstatechange = () => {
          if (pcTearingDownRef.current) return;
          const s = pc.connectionState;
          logCallPhase(callId, 'pc_state', { connectionState: s });
          if (s === 'failed') {
            finishCall('failed');
          }
        };

        pc.oniceconnectionstatechange = () => {
          if (pcTearingDownRef.current) return;
          const ice = String(pc.iceConnectionState || '');
          logCallPhase(callId, 'ice_state', { iceConnectionState: ice });
          if (ice === 'failed') {
            if (!turnConfigured && !isWebRuntime) {
              setErrorMsg(
                'Audio bloqué par le réseau mobile. Le serveur TURN n’est pas configuré — contactez le support AfriWonder.',
              );
            }
            finishCall('failed');
          }
        };

        if (!isWebRuntime) {
          await releaseExpoAvForWebRtcCall();
          const permitted = await requestNativeCallPermissions(isVideo);
          if (!permitted) {
            throw new Error('NOTALLOWED');
          }
        }

        if (!turnConfigured && !isWebRuntime) {
          devWarn('[Call] TURN non configuré — risque élevé de silence audio sur 4G Afrique');
          if (String(iceNetSnapshot.type || '').toLowerCase() === 'cellular') {
            setErrorMsg(
              'Réseau mobile sans relais TURN serveur — l’audio peut ne pas passer. Passez en Wi‑Fi ou contactez le support.',
            );
          }
        }

        const videoProfile = isVideo ? await detectVideoProfile() : null;
        const constraints: MediaStreamConstraints = {
          audio: {
            // Optimisations audio pour bande passante limitée + suppression bruit (importante en Afrique : marchés, motos).
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          } as any,
          video: videoProfile
            ? {
                width: { ideal: videoProfile.width },
                height: { ideal: videoProfile.height },
                frameRate: { ideal: videoProfile.frameRate, max: videoProfile.frameRate },
                facingMode: 'user',
              }
            : false,
        };
        if (videoProfile) {
          devWarn('[Call] Profile vidéo sélectionné', videoProfile.label, 'TURN:', turnConfigured);
        }
        if (!mediaDevicesImpl?.getUserMedia) {
          throw new Error('MEDIA_DEVICES_UNAVAILABLE');
        }
        const local = await mediaDevicesImpl.getUserMedia(constraints);
        if (cancelled) {
          local.getTracks().forEach((t: any) => t.stop());
          return;
        }
        localStreamRef.current = local;
        webrtcMediaActiveRef.current = true;
        void stopOutgoingRingRef.current?.();
        stopOutgoingRingRef.current = null;
        const localTrackCounts = countLocalTracks(local);
        logCallPhase(callId, 'local_media', {
          ...localTrackCounts,
          isVideo,
        });
        if (!isWebRuntime) {
          await startNativeCallAudioSession(isVideo, speakerOnRef.current);
        }
        local.getTracks().forEach((t: any) => pc.addTrack(t, local));
        setupLocalEl(local);

        /**
         * Cap bitrate vidéo selon profil (essentiel en 2G/3G Afrique) :
         * - low : 200 kbps max
         * - medium : 500 kbps max
         * - high : 1500 kbps max
         * Empêche les bursts qui font dropper l'appel sur 3G saturé.
         */
        if (videoProfile && !isWebRuntime) {
          try {
            const senders = pc.getSenders?.() || [];
            for (const sender of senders) {
              if (sender?.track?.kind !== 'video') continue;
              const params = sender.getParameters?.() || {};
              params.encodings = (params.encodings || [{}]).map((enc: any) => ({
                ...enc,
                maxBitrate: videoProfile.maxBitrate,
                maxFramerate: videoProfile.frameRate,
              }));
              await sender.setParameters?.(params).catch(() => {});
            }
          } catch {
            /* ignore — pas critique */
          }
        }

        // Persist côté backend (création directCall row).
        await apiClient
          .post('/calls/session/upsert', {
            callId: callIdRef.current,
            peerUserId: otherUserId,
            role,
            status: 'pending',
          })
          .catch(() => {});

        if (role === 'caller') {
          // Notifie l'invité via Socket.io (+ push côté serveur). Attendre la connexion socket (cold start / réseau).
          const invited = await socketService.ensureConnectedEmit('call:invite', {
            callId: callIdRef.current,
            fromUserId: myUserId,
            toUserId: otherUserId,
            type: isVideo ? 'video' : 'audio',
            callerName: user?.full_name || user?.username || 'Quelqu’un',
            callerAvatar: user?.profile_image || user?.avatar || '',
          });
          if (!invited) {
            setErrorMsg('Connexion indisponible. Réessayez.');
            finishCall('failed');
            return;
          }

          ringTimeoutRef.current = setTimeout(() => {
            if (callStateRef.current !== 'connected') {
              setErrorMsg('Pas de réponse.');
              finishCall('ended');
            }
          }, CALL_RING_MS);
        } else {
          // Receveur : PC prêt avant accept — indispensable si l’app a été ouverte depuis une notification push.
          const accepted = await socketService.ensureConnectedEmit(
            'call:accept',
            buildCallAcceptPayload({
              callId: callIdRef.current,
              accepterUserId: myUserId,
              callerUserId: otherUserId,
              type: isVideo ? 'video' : 'audio',
            }),
          );
          if (!accepted) {
            setErrorMsg('Connexion indisponible. Réessayez.');
            finishCall('failed');
            return;
          }
          setPeerAnswered(true);
          setCallState('connecting');
          armMediaReadyHint();
        }
        armConnectionWatchdog();
      } catch (e: any) {
        devWarn('[Call] setup failed', e);
        const msg = String(e?.message || '').toLowerCase();
        if (msg.includes('permission') || msg.includes('notallowed')) {
          setErrorMsg('Permission micro / caméra refusée.');
        } else {
          setErrorMsg('Impossible de démarrer l’appel.');
        }
        finishCall('failed');
      }
    };

    void start();

    return () => {
      cancelled = true;
      offSignal();
      offAccept();
      offEnd();
      offDecline();
      stopAllMedia();
      if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current);
      if (connectionWatchdogRef.current) clearTimeout(connectionWatchdogRef.current);
      if (mediaReadyHintRef.current) clearTimeout(mediaReadyHintRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otherUserId, myUserId, isVideo, role]);

  useEffect(() => {
    speakerOnRef.current = speakerOn;
  }, [speakerOn]);

  /**
   * Tonalité d’attente — uniquement avant capture micro WebRTC.
   * Après getUserMedia, expo-av volerait la session audio native (silence des deux côtés).
   */
  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (!nativeWebRTC) return;
    if (role !== 'caller' || callState !== 'ringing') return;
    if (webrtcMediaActiveRef.current) return;
    let cancelled = false;
    void startOutgoingRingbackPattern(0.58).then((fn) => {
      if (cancelled || webrtcMediaActiveRef.current) {
        void fn();
        return;
      }
      stopOutgoingRingRef.current = fn;
    });
    return () => {
      cancelled = true;
      void stopOutgoingRingRef.current?.();
      stopOutgoingRingRef.current = null;
    };
  }, [role, callState]);

  /** Libère expo-av dès la négociation WebRTC (appelant + receveur). */
  useEffect(() => {
    if (isWebRuntime) return;
    if (callState !== 'connecting' && callState !== 'connected') return;
    void stopOutgoingRingRef.current?.();
    stopOutgoingRingRef.current = null;
    void releaseExpoAvForWebRtcCall();
  }, [callState]);

  /**
   * Détection de changement de réseau en cours d'appel (WiFi <-> 4G, 4G <-> 3G, perte connexion).
   * Affiche un toast discret quand la qualité chute brutalement (typique Afrique).
   */
  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (callState !== 'connected' && callState !== 'connecting') return;
    let lastType = '';
    const unsubscribe = NetInfo.addEventListener((state) => {
      const type = String(state.type || '');
      if (lastType && type !== lastType) {
        if (!state.isConnected || type === 'none') {
          setErrorMsg('Reseau perdu - reconnexion...');
        } else {
          setErrorMsg(`Reseau change : ${type.toUpperCase()}`);
          // Auto-clear après 4s
          setTimeout(() => setErrorMsg(null), 4000);
        }
      }
      lastType = type;
    });
    return () => unsubscribe();
  }, [callState]);

  /** Toggle micro : disable/enable directement les pistes audio. */
  const toggleMute = useCallback(() => {
    setMuted((m) => {
      const next = !m;
      if (isWebRuntime) {
        const local = localStreamRef.current as MediaStream | null;
        local?.getAudioTracks().forEach((t) => (t.enabled = !next));
      } else {
        const local = localStreamRef.current as any;
        local?.getAudioTracks?.().forEach((t: any) => (t.enabled = !next));
      }
      return next;
    });
  }, []);

  /** Toggle caméra (vidéo only). */
  const toggleCamera = useCallback(() => {
    if (!isVideo) return;
    setCameraOff((v) => {
      const next = !v;
      if (isWebRuntime) {
        const local = localStreamRef.current as MediaStream | null;
        local?.getVideoTracks().forEach((t) => (t.enabled = !next));
      } else {
        const local = localStreamRef.current as any;
        local?.getVideoTracks?.().forEach((t: any) => (t.enabled = !next));
      }
      return next;
    });
  }, [isVideo]);

  const toggleSpeaker = useCallback(() => {
    setSpeakerOn((v) => {
      const next = !v;
      if (isWebRuntime && remoteAudioElRef.current) {
        try {
          /** Ne jamais couper la piste distante : `muted` forçait le silence en mode « écouteur ». */
          remoteAudioElRef.current.muted = false;
        } catch {
          /* ignore */
        }
      }
      if (!isWebRuntime) {
        void applyNativeCallSpeakerRoute(next);
      }
      return next;
    });
  }, []);

  const endCall = useCallback(() => finishCall('ended'), [finishCall]);

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
    const offH = socketService.on(
      'call:raise_hand',
      (p: { callId?: string; fromUserId?: string; raised?: boolean }) => {
        if (p?.callId !== callIdRef.current || p.fromUserId !== otherUserId) return;
        setPeerRaisedHand(!!p.raised);
      },
    );
    const offS = socketService.on(
      'call:screen_share',
      (p: { callId?: string; fromUserId?: string; active?: boolean }) => {
        if (p?.callId !== callIdRef.current || p.fromUserId !== otherUserId) return;
        setPeerScreenSharing(!!p.active);
      },
    );
    return () => {
      offR();
      offH();
      offS();
    };
  }, [otherUserId, myUserId, pushFloatingReaction]);

  useEffect(() => {
    if (callState !== 'connected') return;
    const tick = () => {
      const pc = pcRef.current as RTCPeerConnection | null;
      if (!pc?.getStats) return;
      void pc.getStats().then((report) => {
        const q = connectionQualityFromRtcStatsReport(report);
        setConnectionDisplay({
          labelFr: q.labelFr,
          bars: q.bars,
          quality: q.quality,
        });
        logCallPhase(callIdRef.current, 'stats', {
          quality: q.quality,
          labelFr: q.labelFr,
        });
      });
    };
    tick();
    const id = setInterval(tick, 2500);
    return () => clearInterval(id);
  }, [callState]);

  const restoreCameraTrack = useCallback(async () => {
    const mediaDevicesImpl = resolveWebRtcMediaDevices();
    if (!mediaDevicesImpl?.getUserMedia || !pcRef.current || !localStreamRef.current) return;
    const facing = facingModeRef.current;
    const camOnly = await mediaDevicesImpl.getUserMedia({
      video: isWebRuntime ? { facingMode: facing } : { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: facing },
      audio: false,
    });
    const newVt = camOnly.getVideoTracks()[0];
    const local = localStreamRef.current as MediaStream;
    const oldVt = local.getVideoTracks()[0];
    const sender = (pcRef.current as RTCPeerConnection).getSenders().find((s) => s.track?.kind === 'video');
    if (!sender || !newVt) return;
    await sender.replaceTrack(newVt);
    if (oldVt) {
      local.removeTrack(oldVt);
      oldVt.stop();
    }
    local.addTrack(newVt);
    if (isWebRuntime && localVideoElRef.current) {
      localVideoElRef.current.srcObject = local;
      void localVideoElRef.current.play();
    }
    if (!isWebRuntime && (local as MediaStream & { toURL?: () => string }).toURL) {
      setLocalStreamUrl((local as MediaStream & { toURL: () => string }).toURL());
      setLocalStreamKey((k) => k + 1);
    }
  }, []);

  const flipCamera = useCallback(async () => {
    const mediaDevicesImpl = resolveWebRtcMediaDevices();
    if (!isVideo || !pcRef.current || !localStreamRef.current || !mediaDevicesImpl?.getUserMedia) {
      Alert.alert('Caméra', 'Caméra indisponible.');
      return;
    }
    const nextFacing = facingModeRef.current === 'user' ? 'environment' : 'user';
    try {
      const camOnly = await mediaDevicesImpl.getUserMedia({
        video: isWebRuntime
          ? { facingMode: nextFacing }
          : { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: nextFacing },
        audio: false,
      });
      const newVt = camOnly.getVideoTracks()[0];
      const local = localStreamRef.current as MediaStream;
      const oldVt = local.getVideoTracks()[0];
      const sender = (pcRef.current as RTCPeerConnection).getSenders().find((s) => s.track?.kind === 'video');
      if (sender && newVt) {
        await sender.replaceTrack(newVt);
        if (oldVt) {
          local.removeTrack(oldVt);
          oldVt.stop();
        }
        local.addTrack(newVt);
        if (isWebRuntime && localVideoElRef.current) {
          localVideoElRef.current.srcObject = local;
          void localVideoElRef.current.play();
        }
        if (!isWebRuntime && (local as MediaStream & { toURL?: () => string }).toURL) {
          setLocalStreamUrl((local as MediaStream & { toURL: () => string }).toURL());
          setLocalStreamKey((k) => k + 1);
        }
        facingModeRef.current = nextFacing;
      }
    } catch {
      Alert.alert('Caméra', 'Impossible de changer de caméra sur cet appareil.');
    }
  }, [isVideo]);

  const toggleScreenShare = useCallback(async () => {
    if (!isVideo) {
      Alert.alert('Partage d’écran', 'Réservé aux appels vidéo.');
      return;
    }
    if (!isWebRuntime) {
      return;
    }
    if (!pcRef.current || !localStreamRef.current) return;

    if (localScreenSharing) {
      setScreenShareLoading(true);
      try {
        screenShareDisplayStreamRef.current?.getTracks().forEach((t) => t.stop());
        screenShareDisplayStreamRef.current = null;
        await restoreCameraTrack();
        setLocalScreenSharing(false);
        emitCallRelay('call:screen_share', { active: false });
      } finally {
        setScreenShareLoading(false);
        setMoreMenuOpen(false);
      }
      return;
    }

    setScreenShareLoading(true);
    try {
      const display = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });
      const v = display.getVideoTracks()[0];
      if (!v) throw new Error('NO_VIDEO_TRACK');
      v.onended = () => {
        void (async () => {
          screenShareDisplayStreamRef.current?.getTracks().forEach((t) => t.stop());
          screenShareDisplayStreamRef.current = null;
          try {
            await restoreCameraTrack();
            setLocalScreenSharing(false);
            emitCallRelay('call:screen_share', { active: false });
          } catch {
            /* ignore */
          }
        })();
      };
      screenShareDisplayStreamRef.current = display;
      const local = localStreamRef.current as MediaStream;
      const oldVt = local.getVideoTracks()[0];
      const sender = (pcRef.current as RTCPeerConnection).getSenders().find((s) => s.track?.kind === 'video');
      if (!sender) return;
      await sender.replaceTrack(v);
      if (oldVt) {
        local.removeTrack(oldVt);
        oldVt.stop();
      }
      local.addTrack(v);
      if (localVideoElRef.current) {
        localVideoElRef.current.srcObject = local;
        void localVideoElRef.current.play();
      }
      setLocalScreenSharing(true);
      emitCallRelay('call:screen_share', { active: true });
      setMoreMenuOpen(false);
    } catch {
      Alert.alert('Partage d’écran', 'Autorisez le partage d’écran ou réessayez.');
    } finally {
      setScreenShareLoading(false);
    }
  }, [isVideo, localScreenSharing, restoreCameraTrack, emitCallRelay]);

  const statusLine = useMemo(
    () =>
      formatCallStatusLine({
        hasWebRtcSupport: isWebRuntime || Boolean(nativeWebRTC),
        errorMsg,
        callState,
        durationSeconds: duration,
        role,
        peerOnline,
        answered: peerAnswered,
      }),
    [callState, duration, errorMsg, role, peerOnline, peerAnswered],
  );

  const onMinimizeHint = useCallback(() => {
    Alert.alert('Appel', 'Pour terminer l’appel, utilisez le bouton rouge.');
  }, []);

  const toggleVideoLayoutFocus = useCallback(() => {
    setVideoLayoutFocus((prev) => (prev === 'remote' ? 'local' : 'remote'));
  }, []);

  /**
   * Le flux distant est réellement disponible (caméra du correspondant) :
   * - natif : on a un `streamURL` distant ;
   * - web : la connexion est établie.
   * Tant qu'il n'est pas là (sonnerie / connexion), on affiche SA PROPRE caméra en plein écran
   * (comportement WhatsApp : on se voit en attendant que l'autre décroche).
   */
  const remoteVideoLive = isWebRuntime
    ? callState === 'connected'
    : Boolean(remoteStreamUrl && RTCViewNative);
  /** Quand le distant n'est pas encore là, MA caméra prend tout l'écran. */
  const selfFullScreen = !remoteVideoLive;
  const peerVideoFullscreen = remoteVideoLive && videoLayoutFocus === 'remote';
  const hasRemoteVideoReady = remoteVideoLive;
  const showRemoteWaitingOverlay = !remoteVideoLive;

  const openAddPeople = useCallback(() => {
    if (!otherUserId) return;
    router.push({
      pathname: '/messages/call-add-people',
      params: {
        callId: callIdRef.current,
        otherUserId,
        type: isVideo ? 'video' : 'audio',
      },
    } as never);
  }, [otherUserId, isVideo]);

  const isWeb = isWebRuntime;

  const dockIconColor = (active: boolean) => (active ? '#1a1a1a' : '#FFFFFF');

  return (
    <View style={[styles.root, { paddingBottom: insets.bottom }]}>
      {isWeb && !isVideo
        ? createElement('audio', {
            ref: (el: HTMLAudioElement | null) => {
              remoteAudioElRef.current = el;
            },
            autoPlay: true,
            playsInline: true,
            style: { display: 'none' },
          })
        : null}

      {/* Natif : RTCView caché pour l’audio distant (appels vocaux — évite double lecture en vidéo). */}
      {!isWeb && remoteStreamUrl && RTCViewNative && !isVideo ? (
        <RTCViewNative
          key={`remote-audio-${remoteStreamKey}`}
          streamURL={remoteStreamUrl}
          style={styles.hiddenRemoteRtc}
          objectFit="cover"
          zOrder={0}
        />
      ) : null}

      {!isVideo ? <CallWallpaperPattern /> : null}

      {/* Barre du haut — style WhatsApp */}
      <View style={[styles.topBar, { paddingTop: insets.top + 6 }]}>
        <TouchableOpacity onPress={onMinimizeHint} style={styles.topIconHit} accessibilityLabel="Réduire">
          <Ionicons name="contract-outline" size={26} color="#FFF" />
        </TouchableOpacity>
        <View style={styles.topTitleWrap}>
          <Text style={styles.topName} numberOfLines={1}>
            {name || 'Contact'}
          </Text>
          <Text style={styles.topStatus} numberOfLines={1}>
            {statusLine}
          </Text>
        </View>
        {isVideo ? (
          <View style={styles.topIconHit} />
        ) : (
          <TouchableOpacity onPress={openAddPeople} style={styles.topIconHit} accessibilityLabel="Ajouter">
            <Ionicons name="person-add-outline" size={26} color="#FFF" />
          </TouchableOpacity>
        )}
      </View>

      {peerRaisedHand ? (
        <View style={styles.peerBanner}>
          <Ionicons name="hand-left" size={18} color="#FFF" />
          <Text style={styles.peerBannerText}>{name} a levé la main</Text>
        </View>
      ) : null}
      {peerScreenSharing ? (
        <View style={[styles.peerBanner, styles.peerBannerAlt]}>
          <Ionicons name="desktop-outline" size={18} color="#FFF" />
          <Text style={styles.peerBannerText}>{name} partage son écran</Text>
        </View>
      ) : null}

      {isVideo ? (
        <View style={styles.videoBackground}>
          {/* Flux distant — toujours monté (audio web) ; taille = plein écran ou PiP */}
          <View
            style={peerVideoFullscreen ? styles.videoLayerFull : styles.videoLayerPip}
            pointerEvents={peerVideoFullscreen ? 'none' : 'box-none'}
          >
            {isWeb ? (
              <View style={StyleSheet.absoluteFill}>
                {createElement('video', {
                  ref: (el: HTMLVideoElement | null) => {
                    remoteVideoElRef.current = el;
                  },
                  autoPlay: true,
                  playsInline: true,
                  muted: false,
                  style: {
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    background: '#0b111d',
                  },
                })}
                {showRemoteWaitingOverlay && peerVideoFullscreen ? (
                  <View style={[styles.videoPlaceholder, styles.videoPlaceholderOverlay]}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                    <Text style={styles.videoPlaceholderText}>
                      {callState === 'ringing' ? 'En attente de réponse…' : 'Connexion vidéo…'}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : remoteStreamUrl && RTCViewNative ? (
              <View style={StyleSheet.absoluteFill}>
                <RTCViewNative
                  key={`remote-video-${remoteStreamKey}`}
                  streamURL={remoteStreamUrl}
                  style={styles.nativeVideoFill}
                  objectFit="cover"
                  zOrder={0}
                  zOrderMediaOverlay={Platform.OS === 'android'}
                />
                {showRemoteWaitingOverlay && peerVideoFullscreen ? (
                  <View style={[styles.videoPlaceholder, styles.videoPlaceholderOverlay]}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                    <Text style={styles.videoPlaceholderText}>
                      {callState === 'ringing' ? 'En attente de réponse…' : 'Connexion vidéo…'}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : (
              <View style={[styles.videoPlaceholder, !peerVideoFullscreen && styles.videoPlaceholderPip]}>
                {!peerVideoFullscreen ? (
                  <Image source={{ uri: peerAvatarUri }} style={styles.pipAvatar} />
                ) : (
                  <>
                    <ActivityIndicator size="large" color={Colors.primary} />
                    <Text style={styles.videoPlaceholderText}>
                      {callState === 'ringing' ? 'En attente de réponse…' : 'Connexion vidéo…'}
                    </Text>
                  </>
                )}
              </View>
            )}
            {!peerVideoFullscreen ? (
              <Pressable
                style={styles.pipTapTarget}
                onPress={toggleVideoLayoutFocus}
                accessibilityLabel="Agrandir la vidéo du correspondant"
                accessibilityRole="button"
              />
            ) : null}
          </View>

          <View style={[styles.videoSideTools, { top: insets.top + 56 }]}>
            <TouchableOpacity style={styles.sideToolBtn} onPress={openAddPeople} accessibilityLabel="Ajouter">
              <Ionicons name="person-add" size={22} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.sideToolBtn} onPress={() => void flipCamera()} accessibilityLabel="Caméra">
              <Ionicons name="camera-reverse-outline" size={22} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.sideToolBtn}
              onPress={() => setEffectsModalOpen(true)}
              accessibilityLabel="Effets"
            >
              <Ionicons name="color-wand-outline" size={22} color="#FFF" />
            </TouchableOpacity>
          </View>

          {!cameraOff ? (
            <View
              style={peerVideoFullscreen ? styles.videoLayerPip : styles.videoLayerFull}
              pointerEvents={peerVideoFullscreen ? 'box-none' : 'none'}
            >
              <View style={StyleSheet.absoluteFill} pointerEvents="none">
                {isWeb ? (
                  createElement('video', {
                    ref: (el: HTMLVideoElement | null) => {
                      localVideoElRef.current = el;
                    },
                    autoPlay: true,
                    playsInline: true,
                    muted: true,
                    style: { width: '100%', height: '100%', objectFit: 'cover' },
                  })
                ) : localStreamUrl && RTCViewNative ? (
                  <RTCViewNative
                    key={`local-video-${localStreamKey}`}
                    streamURL={localStreamUrl}
                    style={styles.nativeVideoFill}
                    objectFit="cover"
                    mirror
                    zOrderMediaOverlay
                  />
                ) : (
                  <Image source={{ uri: myAvatarUri }} style={styles.selfViewImage} />
                )}
              </View>
              {pipEffect !== 'none' ? (
                <View
                  style={[StyleSheet.absoluteFill, { backgroundColor: PIP_EFFECT_LAYER[pipEffect] }]}
                  pointerEvents="none"
                />
              ) : null}
              {peerVideoFullscreen ? (
                <TouchableOpacity
                  style={styles.pipFlipHit}
                  onPress={() => void flipCamera()}
                  accessibilityLabel="Changer de caméra"
                >
                  <Ionicons name="camera-reverse-outline" size={18} color="#FFF" />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.pipFlipHit, styles.pipFlipHitFullscreen]}
                  onPress={() => void flipCamera()}
                  accessibilityLabel="Changer de caméra"
                >
                  <Ionicons name="camera-reverse-outline" size={22} color="#FFF" />
                </TouchableOpacity>
              )}
              {peerVideoFullscreen ? (
                <Pressable
                  style={styles.pipTapTarget}
                  onPress={toggleVideoLayoutFocus}
                  accessibilityLabel="Agrandir ma caméra"
                  accessibilityRole="button"
                />
              ) : null}
            </View>
          ) : null}
        </View>
      ) : (
        <View style={styles.audioStage}>
          <View style={styles.avatarRingWrap}>
            <Animated.View
              style={[
                styles.pulseRing,
                {
                  transform: [{ scale: pulseAnim }],
                  opacity: callState === 'ringing' ? 0.35 : 0,
                },
              ]}
            />
            <Image source={{ uri: peerAvatarUri }} style={styles.callerAvatar} />
          </View>
        </View>
      )}

      {/* Dock inférieur façon WhatsApp : … | vidéo | haut-parleur | micro | puis raccrocher */}
      <View style={styles.bottomDock}>
        <View style={styles.dockPill}>
          <TouchableOpacity
            style={styles.dockCircle}
            onPress={() => setMoreMenuOpen(true)}
            accessibilityLabel="Plus d’options"
          >
            <Ionicons name="ellipsis-horizontal" size={24} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.dockCircle,
              !isVideo && styles.dockCircleMuted,
              isVideo && cameraOff && styles.dockCircleMuted,
            ]}
            onPress={
              isVideo
                ? toggleCamera
                : () => Alert.alert('AfriWonder', 'Passez un appel vidéo pour activer la caméra.')
            }
            accessibilityLabel={isVideo ? 'Caméra' : 'Vidéo indisponible'}
          >
            <Ionicons
              name={isVideo ? (cameraOff ? 'videocam-off' : 'videocam') : 'videocam-off'}
              size={24}
              color="#FFF"
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.dockCircle, speakerOn && styles.dockCircleOn]}
            onPress={toggleSpeaker}
            accessibilityLabel="Haut-parleur"
          >
            <Ionicons
              name={speakerOn ? 'volume-high' : 'volume-mute'}
              size={24}
              color={dockIconColor(speakerOn)}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.dockCircle, muted && styles.dockCircleOn]}
            onPress={toggleMute}
            accessibilityLabel="Micro"
          >
            <Ionicons name={muted ? 'mic-off' : 'mic'} size={24} color={dockIconColor(muted)} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.endCallFab} onPress={endCall} accessibilityLabel="Raccrocher">
          <Ionicons name="call" size={30} color="#FFF" style={{ transform: [{ rotate: '135deg' }] }} />
        </TouchableOpacity>
      </View>

      {floatingReactions.length > 0 ? (
        <View style={styles.reactionOverlay} pointerEvents="none">
          {floatingReactions.map((fr) => (
            <Text key={fr.id} style={styles.reactionFloat}>
              {fr.emoji}
            </Text>
          ))}
        </View>
      ) : null}

      <CallMoreOptionsSheet
        visible={moreMenuOpen}
        onClose={() => setMoreMenuOpen(false)}
        connectionLabel={connectionDisplay.labelFr}
        connectionBars={connectionDisplay.bars}
        connectionQuality={connectionDisplay.quality}
        myRaisedHand={myRaisedHand}
        onToggleRaiseHand={() => {
          setMyRaisedHand((r) => {
            const next = !r;
            emitCallRelay('call:raise_hand', { raised: next });
            return next;
          });
        }}
        onPickReaction={(emoji) => {
          if (!ALLOWED_CALL_REACTIONS.has(emoji)) return;
          emitCallRelay('call:reaction', { emoji });
          pushFloatingReaction(emoji);
          setMoreMenuOpen(false);
        }}
        onShareScreen={() => void toggleScreenShare()}
        showScreenShare={isWebRuntime && isVideo}
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

      <Modal
        visible={effectsModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setEffectsModalOpen(false)}
      >
        <View style={styles.fxRoot}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setEffectsModalOpen(false)} />
          <View style={styles.fxSheet}>
            <Text style={styles.fxTitle}>Effets (votre aperçu)</Text>
            <Text style={styles.fxHint}>S’appliquent à votre caméra locale uniquement.</Text>
            <View style={styles.fxChips}>
              {(
                [
                  { key: 'none' as const, label: 'Aucun' },
                  { key: 'soft' as const, label: 'Clair' },
                  { key: 'warm' as const, label: 'Chaud' },
                  { key: 'cool' as const, label: 'Froid' },
                ]
              ).map(({ key, label }) => (
                <TouchableOpacity
                  key={key}
                  style={[styles.fxChip, pipEffect === key && styles.fxChipOn]}
                  onPress={() => {
                    setPipEffect(key);
                    setEffectsModalOpen(false);
                  }}
                >
                  <Text style={[styles.fxChipText, pipEffect === key && styles.fxChipTextOn]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.fxClose} onPress={() => setEffectsModalOpen(false)}>
              <Text style={styles.fxCloseText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0B141A' },
  /** Lecture audio distante (appels vocaux natifs) — invisible mais monté dans l’arbre RN. */
  hiddenRemoteRtc: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
    left: -9999,
    top: -9999,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingBottom: 8,
    zIndex: 20,
  },
  topIconHit: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  topTitleWrap: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
  topName: { color: '#FFF', fontSize: 18, fontWeight: '700', textAlign: 'center' },
  topStatus: { color: 'rgba(255,255,255,0.72)', fontSize: 14, marginTop: 2, textAlign: 'center' },
  audioStage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  videoBackground: {
    flex: 1,
    width,
    backgroundColor: '#101822',
    position: 'relative',
  },
  videoLayerFull: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
    backgroundColor: '#101822',
  },
  videoLayerPip: {
    position: 'absolute',
    bottom: 200,
    right: 16,
    width: 112,
    height: 158,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.28)',
    backgroundColor: '#000',
    zIndex: 12,
  },
  videoPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 280 },
  videoPlaceholderOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(16,24,34,0.88)',
    minHeight: 0,
  },
  videoPlaceholderPip: { minHeight: 0, padding: 8 },
  pipAvatar: { width: '100%', height: '100%', borderRadius: 12 },
  videoPlaceholderText: { color: 'rgba(255,255,255,0.55)', fontSize: 14, marginTop: 12 },
  nativeVideoFill: { width: '100%', height: '100%' },
  videoSideTools: {
    position: 'absolute',
    right: 12,
    zIndex: 15,
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
  },
  sideToolBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pipFlipHit: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 14,
  },
  pipFlipHitFullscreen: {
    top: undefined,
    bottom: 200,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  pipTapTarget: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 13,
  },
  selfViewImage: { width: '100%', height: '100%' },
  avatarRingWrap: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 3,
    borderColor: Colors.primary,
  },
  callerAvatar: { width: 148, height: 148, borderRadius: 74, borderWidth: 3, borderColor: 'rgba(255,255,255,0.22)' },
  bottomDock: {
    alignItems: 'center',
    paddingTop: 8,
    paddingHorizontal: 20,
    zIndex: 20,
  },
  dockPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    backgroundColor: 'rgba(22,35,46,0.92)',
    borderRadius: 36,
    paddingVertical: 14,
    paddingHorizontal: 22,
    marginBottom: 18,
  },
  dockCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dockCircleOn: {
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  dockCircleMuted: {
    opacity: 0.45,
  },
  endCallFab: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#E53935',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
  },
  peerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    zIndex: 19,
  },
  peerBannerAlt: {
    backgroundColor: 'rgba(27,94,32,0.55)',
  },
  peerBannerText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  reactionOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 260,
    alignItems: 'center',
    zIndex: 18,
    gap: 10,
  },
  reactionFloat: {
    fontSize: 52,
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  fxRoot: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  fxSheet: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#1c252e',
    borderRadius: 14,
    padding: 18,
    zIndex: 2,
  },
  fxTitle: { color: '#FFF', fontSize: 17, fontWeight: '700' },
  fxHint: { color: 'rgba(255,255,255,0.65)', fontSize: 13, marginTop: 6, marginBottom: 14 },
  fxChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  fxChip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  fxChipOn: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  fxChipText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  fxChipTextOn: { color: Colors.primary },
  fxClose: { marginTop: 16, alignSelf: 'center' },
  fxCloseText: { color: 'rgba(255,255,255,0.75)', fontSize: 15, fontWeight: '600' },
});
