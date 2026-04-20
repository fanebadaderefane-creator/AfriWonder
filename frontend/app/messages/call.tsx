import React, { useCallback, useEffect, useMemo, useRef, useState, createElement } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  Dimensions,
  Platform,
  Alert,
} from 'react-native';
import { Colors } from '../../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import socketService from '../../src/services/socketService';
import { useAuthStore } from '../../src/store/authStore';
import apiClient from '../../src/api/client';

const { width } = Dimensions.get('window');

/**
 * Appel direct WebRTC 1-1 (audio / vidéo).
 *
 *  - Sur **web** : utilise les API natives `RTCPeerConnection` + `getUserMedia` du navigateur,
 *    avec signalisation Socket.IO via `call:invite`, `call:accept`, `call:signal`, `call:end`
 *    (déjà relayés côté backend `backend/src/index.ts`). TURN credentials récupérées depuis
 *    `GET /api/calls/turn-credentials`.
 *  - Sur **natif** (Expo Go) : `react-native-webrtc` n'est pas dispo en runtime managé. On affiche
 *    l'écran d'appel avec un message clair indiquant que l'appel doit être pris depuis le web.
 *    Les contrôles UX restent identiques (mute / haut-parleur / vidéo on/off / raccrocher).
 *
 *  Paramètres acceptés via `useLocalSearchParams` :
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

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ringTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Refs WebRTC (web only). Sur natif, ces refs restent vides — UI de fallback. */
  const pcRef = useRef<any>(null);
  const localStreamRef = useRef<any>(null);
  const remoteStreamRef = useRef<any>(null);
  const localVideoElRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoElRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioElRef = useRef<HTMLAudioElement | null>(null);
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([]);
  const startedAtRef = useRef<number | null>(null);

  const stopAllMedia = useCallback(() => {
    if (Platform.OS !== 'web') return;
    try {
      const local = localStreamRef.current as MediaStream | null;
      local?.getTracks().forEach((t) => t.stop());
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
  }, []);

  const finishCall = useCallback(
    (reason: 'ended' | 'failed' | 'declined' = 'ended') => {
      if (callState === 'ended') return;
      setCallState('ended');
      if (timerRef.current) clearInterval(timerRef.current);
      if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current);
      stopAllMedia();
      if (otherUserId && myUserId) {
        socketService.emit('call:end', {
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
   * Bootstrap WebRTC sur web : récupère TURN, crée la PeerConnection, ouvre micro/caméra,
   * démarre la signalisation socket.io.
   */
  useEffect(() => {
    if (Platform.OS !== 'web') return;
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
      if (isVideo && remoteVideoElRef.current) {
        remoteVideoElRef.current.srcObject = stream;
        remoteVideoElRef.current.play().catch(() => {});
      }
      if (remoteAudioElRef.current) {
        remoteAudioElRef.current.srcObject = stream;
        remoteAudioElRef.current.play().catch(() => {});
      }
    };

    const setupLocalEl = (stream: MediaStream) => {
      if (isVideo && localVideoElRef.current) {
        localVideoElRef.current.srcObject = stream;
        localVideoElRef.current.play().catch(() => {});
      }
    };

    const sendSignal = (signal: SignalPayload) => {
      socketService.emit('call:signal', {
        callId: callIdRef.current,
        fromUserId: myUserId,
        toUserId: otherUserId,
        signal,
      });
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
          await pc.setRemoteDescription(sig.sdp as RTCSessionDescriptionInit);
          await flushPendingIce();
          if (sig.sdp.type === 'offer') {
            const ans = await pc.createAnswer();
            await pc.setLocalDescription(ans);
            sendSignal({ kind: 'sdp', sdp: { type: ans.type, sdp: ans.sdp } });
          }
        } else if (sig.kind === 'ice') {
          if (!sig.candidate) return;
          if (pc.remoteDescription) {
            await pc.addIceCandidate(sig.candidate);
          } else {
            pendingIceRef.current.push(sig.candidate);
          }
        }
      } catch (e) {
        console.warn('[Call] signal handling failed', e);
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
        console.warn('[Call] offer failed', e);
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

        const pc = new RTCPeerConnection({ iceServers });
        pcRef.current = pc;

        const remoteStream = new MediaStream();
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
          } else if (s === 'failed' || s === 'closed') {
            finishCall('failed');
          }
        };

        const constraints: MediaStreamConstraints = {
          audio: true,
          video: isVideo
            ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }
            : false,
        };
        const local = await navigator.mediaDevices.getUserMedia(constraints);
        if (cancelled) {
          local.getTracks().forEach((t) => t.stop());
          return;
        }
        localStreamRef.current = local;
        local.getTracks().forEach((t) => pc.addTrack(t, local));
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
          // Notifie l'invité via Socket.io. On attend ensuite `call:accept` (handlePeerAccepted)
          // avant de créer l'offre SDP — sinon le receveur n'a pas encore son listener prêt.
          socketService.emit('call:invite', {
            callId: callIdRef.current,
            fromUserId: myUserId,
            toUserId: otherUserId,
            type: isVideo ? 'video' : 'audio',
            callerName: user?.full_name || user?.username || 'Quelqu’un',
            callerAvatar: user?.profile_image || user?.avatar || '',
          });

          ringTimeoutRef.current = setTimeout(() => {
            if (callState !== 'connected') {
              setErrorMsg('Pas de réponse.');
              finishCall('ended');
            }
          }, CALL_RING_MS);
        } else {
          // Receveur : on a TOUT préparé (PC + listeners + getUserMedia) avant d'émettre `accept`.
          // L'offer SDP du caller arrivera ensuite via `call:signal` et `handleSignal` la traitera.
          socketService.emit('call:accept', {
            callId: callIdRef.current,
            fromUserId: myUserId,
            toUserId: otherUserId,
            type: isVideo ? 'video' : 'audio',
          });
          setCallState('connecting');
        }
      } catch (e: any) {
        console.error('[Call] setup failed', e);
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
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otherUserId, myUserId, isVideo, role]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  /** Toggle micro : disable/enable directement les pistes audio. */
  const toggleMute = useCallback(() => {
    setMuted((m) => {
      const next = !m;
      if (Platform.OS === 'web') {
        const local = localStreamRef.current as MediaStream | null;
        local?.getAudioTracks().forEach((t) => (t.enabled = !next));
      }
      return next;
    });
  }, []);

  /** Toggle caméra (vidéo only). */
  const toggleCamera = useCallback(() => {
    if (!isVideo) return;
    setCameraOff((v) => {
      const next = !v;
      if (Platform.OS === 'web') {
        const local = localStreamRef.current as MediaStream | null;
        local?.getVideoTracks().forEach((t) => (t.enabled = !next));
      }
      return next;
    });
  }, [isVideo]);

  const toggleSpeaker = useCallback(() => {
    setSpeakerOn((v) => !v);
    if (Platform.OS === 'web' && remoteAudioElRef.current) {
      try {
        remoteAudioElRef.current.muted = speakerOn ? true : false;
      } catch {
        /* ignore */
      }
    }
  }, [speakerOn]);

  const endCall = useCallback(() => finishCall('ended'), [finishCall]);

  const callStatusLabel = useMemo(() => {
    if (errorMsg) return errorMsg;
    if (callState === 'ringing') return 'Appel en cours…';
    if (callState === 'connecting') return 'Connexion…';
    if (callState === 'connected') return formatTime(duration);
    return 'Appel terminé';
  }, [callState, duration, errorMsg]);

  const isWeb = Platform.OS === 'web';

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Audio remote sink — toujours présent sur web pour entendre l'autre. */}
      {isWeb
        ? createElement('audio', {
            ref: (el: HTMLAudioElement | null) => {
              remoteAudioElRef.current = el;
            },
            autoPlay: true,
            playsInline: true,
            style: { display: 'none' },
          })
        : null}

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
          ) : (
            <View style={styles.videoPlaceholder}>
              <Ionicons name="videocam-off" size={48} color="rgba(255,255,255,0.3)" />
              <Text style={styles.videoPlaceholderText}>Appel vidéo : ouvrez sur le web</Text>
            </View>
          )}
          {!cameraOff && (
            <View style={styles.selfView}>
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
              ) : (
                <Image
                  source={{ uri: avatar || 'https://i.pravatar.cc/150?img=8' }}
                  style={styles.selfViewImage}
                />
              )}
            </View>
          )}
        </View>
      ) : (
        <View style={styles.audioBackground}>
          <Animated.View
            style={[
              styles.pulseRing,
              {
                transform: [{ scale: pulseAnim }],
                opacity: callState === 'ringing' ? 0.3 : 0,
              },
            ]}
          />
          <Image source={{ uri: avatar || 'https://i.pravatar.cc/150' }} style={styles.callerAvatar} />
        </View>
      )}

      <View style={styles.callInfo}>
        <Text style={styles.callerName}>{name || 'Contact'}</Text>
        <Text style={styles.callStatus}>{callStatusLabel}</Text>
        {!isWeb ? (
          <Text style={styles.nativeHint}>Les appels audio/vidéo sont disponibles sur le web pour le moment.</Text>
        ) : null}
      </View>

      <View style={styles.controls}>
        <View style={styles.controlsRow}>
          <TouchableOpacity
            style={[styles.controlBtn, muted && styles.controlBtnActive]}
            onPress={toggleMute}
            accessibilityLabel={muted ? 'Activer le micro' : 'Couper le micro'}
          >
            <Ionicons name={muted ? 'mic-off' : 'mic'} size={24} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.controlBtn, !speakerOn && styles.controlBtnActive]}
            onPress={toggleSpeaker}
            accessibilityLabel="Haut-parleur"
          >
            <Ionicons name={speakerOn ? 'volume-high' : 'volume-mute'} size={24} color="#FFF" />
          </TouchableOpacity>
          {isVideo && (
            <TouchableOpacity
              style={[styles.controlBtn, cameraOff && styles.controlBtnActive]}
              onPress={toggleCamera}
              accessibilityLabel={cameraOff ? 'Allumer la caméra' : 'Couper la caméra'}
            >
              <Ionicons name={cameraOff ? 'videocam-off' : 'videocam'} size={24} color="#FFF" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.controlBtn}
            onPress={() => router.back()}
            accessibilityLabel="Ouvrir le chat"
          >
            <Ionicons name="chatbubble" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.endCallBtn} onPress={endCall} accessibilityLabel="Terminer l’appel">
          <Ionicons name="call" size={32} color="#FFF" style={{ transform: [{ rotate: '135deg' }] }} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B141A', justifyContent: 'space-between', alignItems: 'center' },
  videoBackground: {
    flex: 1,
    width,
    backgroundColor: '#1a1a2e',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  videoPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  videoPlaceholderText: { color: 'rgba(255,255,255,0.55)', fontSize: 14, marginTop: 12 },
  selfView: {
    position: 'absolute',
    top: 80,
    right: 20,
    width: 100,
    height: 140,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: '#000',
  },
  selfViewImage: { width: '100%', height: '100%' },
  audioBackground: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  pulseRing: { position: 'absolute', width: 180, height: 180, borderRadius: 90, borderWidth: 3, borderColor: Colors.primary },
  callerAvatar: { width: 130, height: 130, borderRadius: 65, borderWidth: 3, borderColor: 'rgba(255,255,255,0.2)' },
  callInfo: { alignItems: 'center', paddingVertical: 20, paddingHorizontal: 24 },
  callerName: { color: '#FFF', fontSize: 26, fontWeight: 'bold', marginBottom: 6, textAlign: 'center' },
  callStatus: { color: 'rgba(255,255,255,0.7)', fontSize: 16 },
  nativeHint: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 10, textAlign: 'center', maxWidth: 280 },
  controls: { width: '100%', alignItems: 'center', paddingBottom: 30 },
  controlsRow: { flexDirection: 'row', justifyContent: 'center', gap: 24, marginBottom: 30 },
  controlBtn: {
    alignItems: 'center',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
  },
  controlBtnActive: { backgroundColor: 'rgba(255,255,255,0.3)' },
  endCallBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FF3D00',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
