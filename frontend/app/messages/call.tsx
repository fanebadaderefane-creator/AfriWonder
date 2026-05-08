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
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import socketService from '../../src/services/socketService';
import { useAuthStore } from '../../src/store/authStore';
import apiClient from '../../src/api/client';
import { profileAvatarUri } from '../../src/utils/avatarFallback';
import { startOutgoingRingbackPattern } from '../../src/call/callRingtone';
import { tryLoadReactNativeWebRtc } from '../../src/call/tryLoadReactNativeWebRtc';
import { connectionQualityFromRtcStatsReport } from '../../src/call/webrtcConnectionQuality';
import { formatCallStatusLine } from '../../src/call/callStatusLine';
import { devWarn } from '../../src/utils/devLog';
import { CallDuringMessageModal, CallMoreOptionsSheet } from '../../src/components/call/CallMoreMenu';

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
const mediaDevicesImpl: any = isWebRuntime ? navigator?.mediaDevices : nativeWebRTC?.mediaDevices;
const RTCViewNative: any = nativeWebRTC?.RTCView;

function newCallId(): string {
  return `call-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function CallScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const name = String(params.name || 'Contact');
  const avatar = String(params.avatar || '');
  const isVideo = String(params.type) === 'video';
  const otherUserId = String(params.otherUserId || '').trim();
  const peerAvatarUri = useMemo(
    () => profileAvatarUri(avatar, name.trim() || 'Contact'),
    [avatar, name],
  );
  const role = (String(params.role || 'caller') === 'receiver' ? 'receiver' : 'caller') as 'caller' | 'receiver';
  const initialCallId = String(params.callId || '').trim();

  const { user } = useAuthStore();
  const myUserId = String(user?.id || '');
  const callIdRef = useRef<string>(initialCallId || newCallId());

  const [callState, setCallState] = useState<'ringing' | 'connecting' | 'connected' | 'ended'>(
    role === 'caller' ? 'ringing' : 'connecting',
  );
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true);
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

  const screenShareDisplayStreamRef = useRef<MediaStream | null>(null);
  const facingModeRef = useRef<'user' | 'environment'>('user');

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ringTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectionWatchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Refs PeerConnection + flux média (web et natif lorsque l’appel démarre). */
  const pcRef = useRef<any>(null);
  const localStreamRef = useRef<any>(null);
  const remoteStreamRef = useRef<any>(null);
  const localVideoElRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoElRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioElRef = useRef<HTMLAudioElement | null>(null);
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([]);
  const startedAtRef = useRef<number | null>(null);
  const [remoteStreamUrl, setRemoteStreamUrl] = useState<string>('');
  const [localStreamUrl, setLocalStreamUrl] = useState<string>('');

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
          router.back();
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

  /** Timer durée d'appel. */
  useEffect(() => {
    if (callState !== 'connected') return;
    startedAtRef.current = startedAtRef.current ?? Date.now();
    timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callState]);

  /**
   * Bootstrap PeerConnection : web (navigateur) ou natif (`react-native-webrtc` présent dans la build).
   */
  useEffect(() => {
    const canRunCalls =
      isWebRuntime ||
      Boolean(nativeWebRTC && RTCPeerConnectionImpl && mediaDevicesImpl?.getUserMedia);
    if (!canRunCalls) return;

    if (!otherUserId) {
      setErrorMsg('Identifiant du correspondant manquant.');
      return;
    }
    if (!myUserId) {
      setErrorMsg('Vous devez être connecté pour lancer un appel.');
      return;
    }

    let cancelled = false;

    const setupRemoteEl = (stream: MediaStream) => {
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
        const url = (stream as any)?.toURL?.();
        if (url) setRemoteStreamUrl(url);
      }
    };

    const setupLocalEl = (stream: MediaStream) => {
      if (isWebRuntime && isVideo && localVideoElRef.current) {
        localVideoElRef.current.srcObject = stream;
        localVideoElRef.current.play().catch(() => {});
      }
      if (!isWebRuntime) {
        const url = (stream as any)?.toURL?.();
        if (url) setLocalStreamUrl(url);
      }
    };

    const sendSignal = (signal: SignalPayload) => {
      const payload = {
        callId: callIdRef.current,
        fromUserId: myUserId,
        toUserId: otherUserId,
        signal,
      };
      // SDP est critique : garantir l'émission même pendant une reconnexion socket.
      if (signal.kind === 'sdp') {
        void socketService.ensureConnectedEmit('call:signal', payload, 12_000).then((ok) => {
          if (!ok && !cancelled) {
            setErrorMsg('Connexion instable. Nouvelle tentative…');
          }
        });
        return;
      }
      socketService.emit('call:signal', payload);
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
        } catch {
          /* ignore bad candidate */
        }
      }
    };

    const handleSignal = async (payload: { callId: string; fromUserId: string; signal: SignalPayload }) => {
      if (payload?.callId !== callIdRef.current) return;
      const pc = pcRef.current as RTCPeerConnection | null;
      if (!pc) return;
      const sig = payload.signal;
      try {
        if (sig.kind === 'sdp' && sig.sdp) {
          const remoteDescription = isWebRuntime
            ? (sig.sdp as RTCSessionDescriptionInit)
            : new RTCSessionDescriptionImpl(sig.sdp);
          await pc.setRemoteDescription(remoteDescription);
          await flushPendingIce();
          if (sig.sdp.type === 'offer') {
            const ans = await pc.createAnswer();
            await pc.setLocalDescription(ans);
            sendSignal({ kind: 'sdp', sdp: { type: ans.type, sdp: ans.sdp } });
          }
        } else if (sig.kind === 'ice') {
          if (!sig.candidate) return;
          if (pc.remoteDescription) {
            const ice = isWebRuntime ? sig.candidate : new RTCIceCandidateImpl(sig.candidate);
            await pc.addIceCandidate(ice);
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
    const handlePeerAccepted = async () => {
      if (cancelled || role !== 'caller') return;
      setCallState('connecting');
      const pc = pcRef.current as RTCPeerConnection | null;
      if (!pc) return;
      try {
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: isVideo,
        });
        await pc.setLocalDescription(offer);
        sendSignal({ kind: 'sdp', sdp: { type: offer.type, sdp: offer.sdp } });
      } catch (e) {
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
        // Récupère credentials TURN si configuré côté serveur. STUN public en fallback.
        let iceServers: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }];
        try {
          const res = await apiClient.get('/calls/turn-credentials');
          const data = res.data?.data || res.data;
          if (data?.urls) {
            iceServers = [
              { urls: 'stun:stun.l.google.com:19302' },
              {
                urls: data.urls,
                username: data.username,
                credential: data.credential,
              },
            ];
          }
        } catch {
          /* TURN non configuré : STUN seul (LAN / réseaux ouverts). */
        }

        const pc = new RTCPeerConnectionImpl({ iceServers });
        pcRef.current = pc;

        const remoteStream = isWebRuntime ? new MediaStream() : new nativeWebRTC.MediaStream();
        remoteStreamRef.current = remoteStream;

        pc.ontrack = (ev: RTCTrackEvent) => {
          ev.streams[0]?.getTracks().forEach((t) => remoteStream.addTrack(t));
          setupRemoteEl(remoteStream);
        };

        pc.onicecandidate = (ev: RTCPeerConnectionIceEvent) => {
          if (ev.candidate) {
            sendSignal({ kind: 'ice', candidate: ev.candidate.toJSON() });
          }
        };

        pc.onconnectionstatechange = () => {
          const s = pc.connectionState;
          if (s === 'connected') {
            setCallState('connected');
            if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current);
            if (connectionWatchdogRef.current) clearTimeout(connectionWatchdogRef.current);
            if (isWebRuntime && remoteAudioElRef.current) {
              try {
                remoteAudioElRef.current.muted = false;
              } catch {
                /* ignore */
              }
            }
          } else if (s === 'failed' || s === 'closed') {
            finishCall('failed');
          }
        };

        if (!isWebRuntime) {
          try {
            await Audio.setAudioModeAsync({
              playsInSilentModeIOS: true,
              allowsRecordingIOS: true,
              interruptionModeIOS: InterruptionModeIOS.DoNotMix,
              interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
              shouldDuckAndroid: true,
              playThroughEarpieceAndroid: false,
              staysActiveInBackground: false,
            });
          } catch {
            /* ignore */
          }
        }

        const constraints: MediaStreamConstraints = {
          audio: true,
          video: isVideo
            ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }
            : false,
        };
        if (!mediaDevicesImpl?.getUserMedia) {
          throw new Error('MEDIA_DEVICES_UNAVAILABLE');
        }
        const local = await mediaDevicesImpl.getUserMedia(constraints);
        if (cancelled) {
          local.getTracks().forEach((t: any) => t.stop());
          return;
        }
        localStreamRef.current = local;
        local.getTracks().forEach((t: any) => pc.addTrack(t, local));
        setupLocalEl(local);

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
            if (callState !== 'connected') {
              setErrorMsg('Pas de réponse.');
              finishCall('ended');
            }
          }, CALL_RING_MS);
        } else {
          // Receveur : PC prêt avant accept — indispensable si l’app a été ouverte depuis une notification push.
          const accepted = await socketService.ensureConnectedEmit('call:accept', {
            callId: callIdRef.current,
            fromUserId: myUserId,
            toUserId: otherUserId,
            type: isVideo ? 'video' : 'audio',
          });
          if (!accepted) {
            setErrorMsg('Connexion indisponible. Réessayez.');
            finishCall('failed');
            return;
          }
          setCallState('connecting');
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
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otherUserId, myUserId, isVideo, role]);

  /** Tonalité d’attente pendant que le correspondant ne décroche pas (mobile + module d’appel présent). */
  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (!nativeWebRTC) return;
    if (role !== 'caller' || callState !== 'ringing') return;
    let stopOutgoing: (() => Promise<void>) | null = null;
    void startOutgoingRingbackPattern(0.58).then((fn) => {
      stopOutgoing = fn;
    });
    return () => {
      void stopOutgoing?.();
    };
  }, [role, callState]);

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
      if (!isWebRuntime && Platform.OS !== 'web') {
        void Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          allowsRecordingIOS: true,
          interruptionModeIOS: InterruptionModeIOS.DoNotMix,
          interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: !next,
          staysActiveInBackground: false,
        }).catch(() => {});
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
      });
    };
    tick();
    const id = setInterval(tick, 2500);
    return () => clearInterval(id);
  }, [callState]);

  const restoreCameraTrack = useCallback(async () => {
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
    }
  }, []);

  const flipCamera = useCallback(async () => {
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
      Alert.alert(
        'Partage d’écran',
        'Le partage d’écran n’est pas disponible sur l’application mobile. Utilisez AfriWonder dans un navigateur sur ordinateur pour cette fonctionnalité.',
      );
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
      }),
    [callState, duration, errorMsg, role],
  );

  const onMinimizeHint = useCallback(() => {
    Alert.alert('Appel', 'Pour terminer l’appel, utilisez le bouton rouge.');
  }, []);

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
          {isWeb ? (
            createElement('video', {
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
            })
          ) : remoteStreamUrl && RTCViewNative ? (
            <RTCViewNative streamURL={remoteStreamUrl} style={styles.nativeVideoFill} objectFit="cover" />
          ) : (
            <View style={styles.videoPlaceholder}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.videoPlaceholderText}>Connexion vidéo...</Text>
            </View>
          )}

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

          {!cameraOff && (
            <View style={styles.selfView}>
              <View style={StyleSheet.absoluteFill}>
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
                  <RTCViewNative streamURL={localStreamUrl} style={styles.nativeVideoFill} objectFit="cover" mirror />
                ) : (
                  <Image source={{ uri: peerAvatarUri }} style={styles.selfViewImage} />
                )}
              </View>
              {pipEffect !== 'none' ? (
                <View
                  style={[StyleSheet.absoluteFill, { backgroundColor: PIP_EFFECT_LAYER[pipEffect] }]}
                  pointerEvents="none"
                />
              ) : null}
              <TouchableOpacity
                style={styles.pipFlipHit}
                onPress={() => void flipCamera()}
                accessibilityLabel="Changer de caméra"
              >
                <Ionicons name="camera-reverse-outline" size={18} color="#FFF" />
              </TouchableOpacity>
            </View>
          )}
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
  videoPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 280 },
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
  selfView: {
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
