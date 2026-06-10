import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '@/api/expressClient';
import {
  Loader2,
  PhoneOff,
  Mic,
  MicOff,
  Video,
  VideoOff,
  RefreshCcw,
  Volume2,
  VolumeX,
  Sparkles,
  Pencil,
  Link2,
  ImagePlus,
  ChevronDown,
  X,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { useCallSocket } from '@/hooks/useCallSocket';
import { getWebRtcConfiguration, setTemporaryTurnCredentials } from '@/lib/webrtcIceServers';
import { loadPreferences } from '@/lib/preferences';
import {
  callIdsEqual,
  callUserIdsEqual,
  normalizeInboundCallSignal,
  pickOutboundCallSdp,
} from '@/lib/callSignalingPayload';

export default function DirectCallPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode') || 'outgoing'; // outgoing | incoming
  const receiverId = searchParams.get('receiverId');
  const callerId = searchParams.get('callerId');
  const requestedType = searchParams.get('type');
  const autoAccept = searchParams.get('autoAccept') === '1';
  const callIdFromUrl = searchParams.get('callId');
  const buildFallbackUuid = () =>
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
      const rand = Math.floor(Math.random() * 16);
      const value = char === 'x' ? rand : (rand & 0x3) | 0x8;
      return value.toString(16);
    });
  const fallbackCallId = useRef(
    (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : buildFallbackUuid()
  );
  const callId = callIdFromUrl || fallbackCallId.current;

  const [user, setUser] = useState(null);
  const [remoteUser, setRemoteUser] = useState(null);
  const [callStatus, setCallStatus] = useState(mode === 'outgoing' ? 'ringing' : 'active'); // ringing | active | ended
  const [callType] = useState(requestedType === 'video' ? 'video' : 'audio');
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [callStartTime, setCallStartTime] = useState(null);
  const [endedDuration, setEndedDuration] = useState(0);
  const [postCallView, setPostCallView] = useState(null); // null | no-answer | ended
  const [qualitySubmitted, setQualitySubmitted] = useState(false);
  const [callQuality, setCallQuality] = useState({ level: 'unknown', rttMs: null, jitterMs: null, packetLossPct: null });
  const [autoVideoPaused, setAutoVideoPaused] = useState(false);
  const [callDataSaverEnabled] = useState(() => !!loadPreferences().callDataSaver);
  /** Libellé sous l’appel : état ICE / connexion (remplace un texte statique trompeur). */
  const [linkStatusLabel, setLinkStatusLabel] = useState('Préparation…');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await api.get('/calls/turn-credentials');
        const payload = res?.data?.data || null;
        if (!mounted || !payload) return;
        setTemporaryTurnCredentials(payload);
      } catch {
        // endpoint optionnel: fallback STUN/env
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const targetUserId = mode === 'outgoing' ? receiverId : callerId;

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(new MediaStream());
  const peerRef = useRef(null);
  const mediaInitDoneRef = useRef(false);
  const mediaErrorShownRef = useRef(false);
  const inviteSentRef = useRef(false);
  const disposedRef = useRef(false);
  const pendingCandidatesRef = useRef([]);
  const sessionEnsuredRef = useRef(false);
  const activePersistedRef = useRef(false);
  const terminalPersistedRef = useRef(false);
  const autoAcceptedRef = useRef(false);
  const receiverAcceptSentRef = useRef(false);
  const technicalQualitySentRef = useRef(false);
  const qosSnapshotRef = useRef({ level: 'unknown', rttMs: null, jitterMs: null, packetLossPct: null });
  const poorQualityStreakRef = useRef(0);
  const goodQualityStreakRef = useRef(0);

  const persistSessionState = useCallback(async (nextStatus, durationSec) => {
    if (!callId || !targetUserId) return;
    try {
      await api.calls.updateSessionState(callId, {
        status: nextStatus,
        duration: typeof durationSec === 'number' ? durationSec : undefined,
      });
    } catch (err) {
      const status = err?.response?.status;
      if (status === 404) {
        try {
          await api.calls.ensureSession({
            callId,
            peerUserId: targetUserId,
            role: mode === 'outgoing' ? 'caller' : 'receiver',
            status: nextStatus === 'active' ? 'active' : 'pending',
          });
          await api.calls.updateSessionState(callId, {
            status: nextStatus,
            duration: typeof durationSec === 'number' ? durationSec : undefined,
          });
          return;
        } catch {
          // keep silent: call UI must continue.
        }
      }
      // Non bloquant: l'UI d'appel continue même si la persistance échoue.
    }
  }, [callId, targetUserId, mode]);

  const stopMedia = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
  }, []);

  const closePeer = useCallback(() => {
    if (peerRef.current) {
      peerRef.current.ontrack = null;
      peerRef.current.onicecandidate = null;
      peerRef.current.onconnectionstatechange = null;
      peerRef.current.close();
      peerRef.current = null;
    }
  }, []);

  const restartIceIfPossible = useCallback(() => {
    try {
      peerRef.current?.restartIce?.();
    } catch {
      /* ignore */
    }
  }, []);

  const endAndLeave = useCallback((silent = false, options = {}) => {
    const { postView = 'ended', autoNavigateMs = null } = options;
    setCallStatus('ended');
    setEndedDuration(callDuration);
    closePeer();
    stopMedia();
    if (!silent) {
      toast.success(`Appel termine - ${Math.floor(callDuration / 60)}m ${callDuration % 60}s`);
    }
    setPostCallView(postView);
    if (typeof autoNavigateMs === 'number') {
      window.setTimeout(() => navigate(createPageUrl('Inbox')), autoNavigateMs);
    }
  }, [callDuration, closePeer, navigate, stopMedia]);

  const updateLinkStatusFromPeer = useCallback((pc) => {
    if (!pc) return;
    const ice = pc.iceConnectionState;
    const conn = pc.connectionState;
    if (ice === 'failed' || conn === 'failed' || conn === 'closed') return;
    if (ice === 'checking' || conn === 'connecting') {
      setLinkStatusLabel('Connexion en cours…');
      return;
    }
    if (ice === 'disconnected') {
      setLinkStatusLabel('Signal faible — reconnexion…');
      return;
    }
    if (ice === 'connected' || ice === 'completed') {
      const hasTurn = !!import.meta.env.VITE_TURN_URL?.trim();
      setLinkStatusLabel(hasTurn ? 'Connecté' : 'Connecté (STUN seul — TURN recommandé en 4G)');
      return;
    }
    if (conn === 'connected') {
      setLinkStatusLabel('Connecté');
    }
  }, []);

  const deriveQualityLevel = useCallback((rttMs, jitterMs, packetLossPct) => {
    const safeRtt = Number.isFinite(rttMs) ? Number(rttMs) : null;
    const safeJitter = Number.isFinite(jitterMs) ? Number(jitterMs) : null;
    const safeLoss = Number.isFinite(packetLossPct) ? Number(packetLossPct) : null;
    if (safeLoss !== null && safeLoss > 8) return 'poor';
    if (safeRtt !== null && safeRtt > 420) return 'poor';
    if (safeJitter !== null && safeJitter > 60) return 'poor';
    if (safeLoss !== null && safeLoss > 3) return 'fair';
    if (safeRtt !== null && safeRtt > 220) return 'fair';
    if (safeJitter !== null && safeJitter > 30) return 'fair';
    if (safeRtt !== null || safeJitter !== null || safeLoss !== null) return 'good';
    return 'unknown';
  }, []);

  const ensurePeerConnection = useCallback(async (emitFn, myUserId, remoteId) => {
    if (peerRef.current) return peerRef.current;
    const pc = new RTCPeerConnection(getWebRtcConfiguration());
    peerRef.current = pc;

    pc.onicecandidate = (event) => {
      if (!myUserId || !remoteId) return;
      emitFn('call:signal', {
        toUserId: remoteId,
        fromUserId: myUserId,
        callId,
        signal: {
          kind: 'ice',
          candidate: event.candidate ? event.candidate.toJSON() : null,
        },
      });
    };

    pc.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => {
        if (track.kind === 'audio') track.enabled = true;
        remoteStreamRef.current.addTrack(track);
      });
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStreamRef.current;
        void remoteVideoRef.current.play?.().catch(() => {});
      }
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = remoteStreamRef.current;
        remoteAudioRef.current.muted = false;
        void remoteAudioRef.current.play().catch(() => {});
      }
      if (!callStartTime) setCallStartTime(Date.now());
      setCallStatus('active');
      if (!activePersistedRef.current) {
        activePersistedRef.current = true;
        persistSessionState('active');
      }
    };

    pc.oniceconnectionstatechange = () => {
      updateLinkStatusFromPeer(pc);
    };

    pc.onconnectionstatechange = () => {
      updateLinkStatusFromPeer(pc);
      if (pc.connectionState === 'failed') {
        if (!disposedRef.current) {
          toast.error('Connexion appel interrompue');
          endAndLeave(true);
        }
      }
      if (pc.connectionState === 'disconnected') {
        setLinkStatusLabel('Signal faible — reconnexion…');
        window.setTimeout(() => {
          if (!disposedRef.current) restartIceIfPossible();
        }, 1500);
      }
      if (pc.connectionState === 'closed' && !disposedRef.current) {
        /* fermeture normale après endAndLeave */
      }
    };

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => pc.addTrack(track, localStreamRef.current));
    }

    return pc;
  }, [callId, callStartTime, endAndLeave, restartIceIfPossible, updateLinkStatusFromPeer, persistSessionState]);

  const applyPendingCandidates = useCallback(async (pc) => {
    if (!pendingCandidatesRef.current.length) return;
    const queue = [...pendingCandidatesRef.current];
    pendingCandidatesRef.current = [];
    for (const c of queue) {
      try {
        await pc.addIceCandidate(c);
      } catch {
        // ignore malformed candidate
      }
    }
  }, []);

  const { emit } = useCallSocket({
    userId: user?.id,
    onAccept: async (payload) => {
      if (mode !== 'outgoing') return;
      if (!callUserIdsEqual(payload?.fromUserId, targetUserId) || !callIdsEqual(payload?.callId, callId)) return;
      const pc = await ensurePeerConnection(emit, user.id, targetUserId);
      const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: callType === 'video' });
      await pc.setLocalDescription(offer);
      const outbound = pickOutboundCallSdp(pc, offer);
      if (!outbound) return;
      emit('call:signal', {
        toUserId: targetUserId,
        fromUserId: user.id,
        callId,
        signal: { kind: 'sdp', sdp: outbound },
      });
      setLinkStatusLabel('Connexion en cours…');
      toast.success('Appel accepte');
    },
    onDecline: (payload) => {
      if (mode !== 'outgoing') return;
      if (payload?.fromUserId !== targetUserId || payload?.callId !== callId) return;
      toast.error('Pas de reponse');
      if (!terminalPersistedRef.current) {
        terminalPersistedRef.current = true;
        persistSessionState('declined', callDuration);
      }
      endAndLeave(true, { postView: 'no-answer' });
    },
    onMissed: (payload) => {
      if (payload?.callId !== callId) return;
      if (mode === 'outgoing') {
        toast.info('Appel manqué');
        if (!terminalPersistedRef.current) {
          terminalPersistedRef.current = true;
          persistSessionState('missed', callDuration);
        }
        endAndLeave(true, { postView: 'no-answer' });
      }
    },
    onEnd: (payload) => {
      if (payload?.callId !== callId) return;
      if (payload?.endedBy === user?.id) return;
      toast.info('Appel termine par l autre utilisateur');
      if (!terminalPersistedRef.current) {
        terminalPersistedRef.current = true;
        persistSessionState('ended', callDuration);
      }
      endAndLeave(true, { postView: 'ended' });
    },
    onSignal: async (payload) => {
      if (!user?.id || !targetUserId) return;
      if (!callIdsEqual(payload?.callId, callId) || !callUserIdsEqual(payload?.fromUserId, targetUserId)) return;

      const signal = payload.signal;
      if (!signal?.kind) return;

      const pc = await ensurePeerConnection(emit, user.id, targetUserId);
      const normalized = normalizeInboundCallSignal(signal, pc.signalingState);
      if (!normalized) return;

      if (normalized.kind === 'sdp') {
        const remoteSdp = normalized.sdp;
        try {
          await pc.setRemoteDescription(remoteSdp);
        } catch (firstErr) {
          if (remoteSdp.type === 'offer' && pc.signalingState === 'have-local-offer') {
            await pc.setLocalDescription({ type: 'rollback' });
            await pc.setRemoteDescription(remoteSdp);
          } else {
            throw firstErr;
          }
        }
        await applyPendingCandidates(pc);
        if (remoteSdp.type === 'offer') {
          const answer = await pc.createAnswer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: callType === 'video',
          });
          await pc.setLocalDescription(answer);
          const outbound = pickOutboundCallSdp(pc, answer);
          if (outbound) {
            emit('call:signal', {
              toUserId: targetUserId,
              fromUserId: user.id,
              callId,
              signal: { kind: 'sdp', sdp: outbound },
            });
          }
        }
        setLinkStatusLabel('Connexion en cours…');
      } else if (normalized.kind === 'ice') {
        if (normalized.candidate === null) return;
        if (pc.remoteDescription) {
          await pc.addIceCandidate(normalized.candidate);
        } else {
          pendingCandidatesRef.current.push(normalized.candidate);
        }
      }
    },
  });

  useEffect(() => {
    if (!user?.id || !targetUserId || sessionEnsuredRef.current) return;
    sessionEnsuredRef.current = true;
    api.calls
      .ensureSession({
        callId,
        peerUserId: targetUserId,
        role: mode === 'outgoing' ? 'caller' : 'receiver',
        status: 'pending',
      })
      .catch(() => {
        // Non bloquant pour garder le flux d'appel fluide.
      });
  }, [user?.id, targetUserId, callId, mode]);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const me = await api.auth.me();
        if (targetUserId && targetUserId === me.id) {
          toast.error("Vous ne pouvez pas vous appeler vous-même");
          navigate(createPageUrl('Inbox'));
          return;
        }
        setUser(me);
        if (!targetUserId) return;
        const users = await api.users.list({ page: 1, limit: 80 });
        const target = users.find((u) => u.id === targetUserId) || null;
        if (target) {
          setRemoteUser(target);
          return;
        }
        try {
          const fallbackTarget = await api.users.getById(targetUserId);
          if (fallbackTarget?.id) setRemoteUser(fallbackTarget);
        } catch {
          toast.error('Contact introuvable pour cet appel');
          navigate(createPageUrl('Inbox'));
        }
      } catch (_e) {
        navigate(createPageUrl('Home'));
      }
    };
    loadUsers();
  }, [navigate, targetUserId]);

  useEffect(() => {
    const handleOnline = () => {
      setLinkStatusLabel('Réseau revenu — reprise de la connexion…');
      restartIceIfPossible();
    };
    const handleOffline = () => {
      setLinkStatusLabel('Hors ligne — appel en attente du réseau');
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [restartIceIfPossible]);

  useEffect(() => {
    // Attendre remoteUser : l’UI principale (et le <video> local en mode vidéo) n’est montée qu’après.
    if (!user || !remoteUser || callStatus === 'ended' || mediaInitDoneRef.current) return;
    mediaInitDoneRef.current = true;

    const initMedia = async () => {
      try {
        const constraints =
          callType === 'video'
            ? {
                audio: { echoCancellation: true, noiseSuppression: true },
                video: {
                  facingMode: 'user',
                  width: { ideal: 1280, max: 1280 },
                  height: { ideal: 720, max: 720 },
                },
              }
            : {
                audio: { echoCancellation: true, noiseSuppression: true },
                video: false,
              };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        if (autoAccept && mode === 'incoming' && !receiverAcceptSentRef.current && user?.id && targetUserId) {
          receiverAcceptSentRef.current = true;
          autoAcceptedRef.current = true;
          await ensurePeerConnection(emit, user.id, targetUserId);
          emit('call:accept', {
            toUserId: targetUserId,
            fromUserId: user.id,
            callId,
            type: callType,
          });
          setLinkStatusLabel('Connexion en cours…');
        }
      } catch (_e) {
        if (!mediaErrorShownRef.current) {
          mediaErrorShownRef.current = true;
          toast.error("Impossible d'acceder a la camera/microphone");
        }
      }
    };

    initMedia();
  }, [user, remoteUser, callStatus, callType]);

  /** Si getUserMedia a fini après le premier paint, rattacher le flux au <video> local. */
  useEffect(() => {
    if (callType !== 'video') return;
    const stream = localStreamRef.current;
    const el = localVideoRef.current;
    if (stream && el && el.srcObject !== stream) el.srcObject = stream;
  }, [callType, user, remoteUser, callStatus]);

  useEffect(() => {
    if (!user || !remoteUser || !targetUserId || inviteSentRef.current || mode !== 'outgoing') return;
    inviteSentRef.current = true;
    emit('call:invite', {
      toUserId: targetUserId,
      fromUserId: user.id,
      callId,
      type: callType,
      callerName: user.full_name || user.username || 'AfriWonder',
      callerAvatar: user.profile_image || '',
    });
  }, [user, remoteUser, targetUserId, mode, callType, callId, emit]);

  useEffect(() => {
    if (mode === 'incoming' && user && remoteUser && !callStartTime) {
      setCallStartTime(Date.now());
    }
  }, [mode, user, remoteUser, callStartTime]);

  useEffect(() => {
    if (mode !== 'outgoing' || callStatus !== 'ringing' || postCallView) return;
    const timeout = window.setTimeout(() => {
      if (!terminalPersistedRef.current) {
        terminalPersistedRef.current = true;
        persistSessionState('missed', callDuration);
      }
      endAndLeave(true, { postView: 'no-answer' });
    }, 30000);
    return () => window.clearTimeout(timeout);
  }, [mode, callStatus, postCallView, endAndLeave, persistSessionState, callDuration]);

  useEffect(() => {
    if (callStatus !== 'active' || !callStartTime) return;
    const interval = setInterval(() => {
      setCallDuration(Math.floor((Date.now() - callStartTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [callStatus, callStartTime]);

  useEffect(() => {
    if (callStatus !== 'active' || !peerRef.current) return;
    let cancelled = false;
    const readStats = async () => {
      const pc = peerRef.current;
      if (!pc || cancelled) return;
      try {
        const stats = await pc.getStats();
        let rttMs = null;
        let jitterMs = null;
        let packetLossPct = null;
        let packetsReceived = null;
        let packetsLost = null;
        stats.forEach((report) => {
          if (report.type === 'candidate-pair' && report.state === 'succeeded' && Number.isFinite(report.currentRoundTripTime)) {
            rttMs = Math.round(Number(report.currentRoundTripTime) * 1000);
          }
          if (report.type === 'inbound-rtp' && !report.isRemote) {
            if (Number.isFinite(report.jitter)) jitterMs = Math.round(Number(report.jitter) * 1000);
            if (Number.isFinite(report.packetsReceived)) packetsReceived = Number(report.packetsReceived);
            if (Number.isFinite(report.packetsLost)) packetsLost = Number(report.packetsLost);
          }
        });
        if (packetsReceived !== null && packetsLost !== null && packetsReceived + packetsLost > 0) {
          packetLossPct = Math.round((packetsLost / (packetsReceived + packetsLost)) * 1000) / 10;
        }
        const level = deriveQualityLevel(rttMs, jitterMs, packetLossPct);
        const snapshot = { level, rttMs, jitterMs, packetLossPct };
        qosSnapshotRef.current = snapshot;
        setCallQuality(snapshot);
      } catch {
        // ignore metrics read failures
      }
    };
    readStats();
    const id = window.setInterval(readStats, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [callStatus, deriveQualityLevel]);

  useEffect(() => {
    if (callType !== 'video' || callStatus !== 'active') return;
    if (!isCameraOn) {
      poorQualityStreakRef.current = 0;
      goodQualityStreakRef.current = 0;
      return;
    }
    if (callQuality.level === 'poor' || (callDataSaverEnabled && callQuality.level === 'fair')) {
      poorQualityStreakRef.current += 1;
      goodQualityStreakRef.current = 0;
      const threshold = callDataSaverEnabled ? 1 : 2;
      if (poorQualityStreakRef.current >= threshold && !autoVideoPaused) {
        setAutoVideoPaused(true);
        setLinkStatusLabel('Réseau faible — vidéo réduite pour stabiliser l’audio');
        toast.info('Réseau faible: vidéo temporairement réduite');
      }
      return;
    }
    if (callQuality.level === 'good') {
      goodQualityStreakRef.current += 1;
      poorQualityStreakRef.current = 0;
      if (goodQualityStreakRef.current >= 2 && autoVideoPaused) {
        setAutoVideoPaused(false);
        setLinkStatusLabel('Réseau stabilisé — vidéo restaurée');
        toast.success('Connexion améliorée: vidéo restaurée');
      }
      return;
    }
    // Niveau "fair" ou inconnu: on évite les oscillations.
    poorQualityStreakRef.current = 0;
    goodQualityStreakRef.current = 0;
  }, [callType, callStatus, callQuality.level, autoVideoPaused, isCameraOn, callDataSaverEnabled]);

  useEffect(() => {
    if (!callDataSaverEnabled || callType !== 'video' || callStatus !== 'active') return;
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const effectiveType = String(connection?.effectiveType || '').toLowerCase();
    const saveData = !!connection?.saveData;
    const slowType = ['slow-2g', '2g', '3g'].includes(effectiveType);
    if ((saveData || slowType) && isCameraOn && !autoVideoPaused) {
      setAutoVideoPaused(true);
      setLinkStatusLabel('Économie de données active — vidéo réduite');
    }
  }, [callDataSaverEnabled, callType, callStatus, isCameraOn, autoVideoPaused]);

  useEffect(() => {
    if (postCallView !== 'ended' || technicalQualitySentRef.current) return;
    technicalQualitySentRef.current = true;
    const q = qosSnapshotRef.current;
    api.platformFeedback.create({
      type: 'comment',
      content: `[CALL_QOS] callId=${callId}; level=${q.level}; rttMs=${q.rttMs ?? 'na'}; jitterMs=${q.jitterMs ?? 'na'}; packetLossPct=${q.packetLossPct ?? 'na'}; durationSec=${endedDuration}; type=${callType}`,
    }).catch(() => {});
  }, [postCallView, callId, endedDuration, callType]);

  useEffect(() => {
    return () => {
      disposedRef.current = true;
      closePeer();
      stopMedia();
    };
  }, [closePeer, stopMedia]);

  useEffect(() => {
    if (!localStreamRef.current) return;
    const audioTrack = localStreamRef.current.getAudioTracks()[0];
    if (audioTrack) audioTrack.enabled = isMicOn;
  }, [isMicOn]);

  useEffect(() => {
    if (!localStreamRef.current) return;
    const videoTrack = localStreamRef.current.getVideoTracks()[0];
    if (videoTrack) videoTrack.enabled = callType === 'video' ? (isCameraOn && !autoVideoPaused) : false;
  }, [isCameraOn, callType, autoVideoPaused]);

  useEffect(() => {
    if (!remoteAudioRef.current) return;
    /** Web : le bouton HP route via setSinkId si dispo — ne pas couper la piste distante (muted = silence total). */
    remoteAudioRef.current.muted = false;
    if (!remoteAudioRef.current.paused) return;
    void remoteAudioRef.current.play().catch(() => {});
  }, [isSpeakerOn]);

  const handleEndCall = () => {
    if (user?.id && targetUserId) {
      emit('call:end', {
        toUserId: targetUserId,
        fromUserId: user.id,
        callId,
        endedBy: user.id,
      });
    }
    if (!terminalPersistedRef.current) {
      terminalPersistedRef.current = true;
      persistSessionState('completed', callDuration);
    }
    endAndLeave(false, { postView: 'ended' });
  };

  const handleSubmitCallQuality = async (isGood) => {
    if (qualitySubmitted) return;
    try {
      const q = qosSnapshotRef.current;
      await api.platformFeedback.create({
        type: 'comment',
        content: `[CALL_QUALITY] callId=${callId}; rating=${isGood ? 'good' : 'bad'}; durationSec=${endedDuration}; mode=${mode}; type=${callType}; qos=${q.level}; rttMs=${q.rttMs ?? 'na'}; jitterMs=${q.jitterMs ?? 'na'}; packetLossPct=${q.packetLossPct ?? 'na'}`,
      });
      setQualitySubmitted(true);
      toast.success('Merci pour votre retour');
    } catch {
      toast.error('Impossible d envoyer le feedback pour le moment');
    }
  };

  const formatDuration = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (!user || !remoteUser) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (postCallView === 'no-answer') {
    return (
      <div className="fixed inset-0 bg-[#b78f6f] flex flex-col items-center justify-center px-6">
        <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px)] [background-size:56px_56px]" />
        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="w-28 h-28 rounded-full overflow-hidden bg-white/40 shadow-lg mb-6">
            {remoteUser.profile_image ? (
              <img src={remoteUser.profile_image} alt={remoteUser.full_name || 'profil'} className="w-full h-full object-cover" />
            ) : null}
          </div>
          <p className="text-white/95 text-4xl font-semibold mb-2">Pas de reponse</p>
          <p className="text-white/75 text-sm">Cet utilisateur n&apos;a pas decroche.</p>
        </div>

        <div className="relative z-10 w-full max-w-sm mt-20 flex items-center justify-between px-3">
          <button
            type="button"
            onClick={() => navigate(createPageUrl('Inbox'))}
            className="flex flex-col items-center gap-3 text-white"
          >
            <span className="w-16 h-16 rounded-full bg-white/90 text-black flex items-center justify-center text-4xl leading-none">X</span>
            <span className="text-lg font-medium">Fermer</span>
          </button>

          <button
            type="button"
            onClick={() => navigate(`${createPageUrl('DirectCall')}?mode=outgoing&receiverId=${targetUserId}&type=${callType}`)}
            className="flex flex-col items-center gap-3 text-white"
          >
            <span className="w-16 h-16 rounded-full bg-sky-500 text-white flex items-center justify-center">
              <Video className="w-7 h-7" />
            </span>
            <span className="text-lg font-medium">Rappeler</span>
          </button>
        </div>
      </div>
    );
  }

  if (postCallView === 'ended') {
    return (
      <div className="fixed inset-0 bg-black text-white">
        <button
          type="button"
          onClick={() => navigate(createPageUrl('Inbox'))}
          aria-label="Fermer"
          className="absolute top-6 right-6 z-20 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="h-full flex flex-col items-center pt-24 px-8 text-center">
          <div className="w-28 h-28 rounded-full overflow-hidden bg-white/15 mb-6">
            {remoteUser.profile_image ? (
              <img src={remoteUser.profile_image} alt={remoteUser.full_name || 'profil'} className="w-full h-full object-cover" />
            ) : null}
          </div>

          <p className="text-5xl font-semibold mb-2">Appel termine</p>
          <p className="text-3xl font-medium mb-16">{formatDuration(endedDuration)}</p>

          <p className="text-2xl leading-tight mb-10">Comment etait la qualite de votre appel ?</p>

          <div className="flex items-center gap-16 mb-12">
            <button
              type="button"
              onClick={() => handleSubmitCallQuality(true)}
              className="flex flex-col items-center gap-3"
              disabled={qualitySubmitted}
            >
              <span className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
                <ThumbsUp className="w-8 h-8" />
              </span>
              <span className="text-2xl">Bonne</span>
            </button>
            <button
              type="button"
              onClick={() => handleSubmitCallQuality(false)}
              className="flex flex-col items-center gap-3"
              disabled={qualitySubmitted}
            >
              <span className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
                <ThumbsDown className="w-8 h-8" />
              </span>
              <span className="text-2xl">Mauvaise</span>
            </button>
          </div>

          <p className="text-white/70 text-lg max-w-md leading-relaxed">
            Nous pourrons utiliser vos donnees pour la personnalisation, l&apos;innovation et la recherche.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black flex flex-col overflow-hidden">
      <audio ref={remoteAudioRef} autoPlay className="hidden" />
      <div className="flex-1 relative">
        {callType === 'video' ? (
          <>
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className={`w-full h-full object-cover ${callStatus === 'ringing' ? 'hidden' : 'block'}`}
            />
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${callStatus === 'ringing' ? 'block' : 'hidden'}`}
            />
          </>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950" />
        )}

        <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/45 pointer-events-none" />

        <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-20">
          <button
            type="button"
            onClick={() => navigate(createPageUrl('Inbox'))}
            className="w-9 h-9 rounded-full bg-black/35 backdrop-blur flex items-center justify-center text-white"
            aria-label="Retour"
          >
            <ChevronDown className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={() => navigate(createPageUrl('Inbox'))}
            className="w-9 h-9 rounded-full bg-black/35 backdrop-blur flex items-center justify-center text-white"
            aria-label="Fermer l appel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="absolute left-1/2 -translate-x-1/2 top-20 z-20 flex flex-col items-center text-center">
          <div className="w-28 h-28 rounded-full overflow-hidden bg-white/20 mb-4">
            {remoteUser.profile_image ? (
              <img src={remoteUser.profile_image} alt={remoteUser.full_name || 'profil'} className="w-full h-full object-cover" />
            ) : null}
          </div>
          <p className="text-white text-3xl font-semibold">{remoteUser.full_name || remoteUser.username || 'AfriWonder'}</p>
          <p className="text-white/85 text-lg mt-1">
            {callStatus === 'ringing' ? 'Appel en cours...' : formatDuration(callDuration)}
          </p>
        </div>

        <div className="absolute left-4 top-1/3 z-20 flex flex-col gap-4">
          {[Sparkles, Pencil, Link2, ImagePlus].map((Icon, index) => (
            <button
              key={`tool-${index}`}
              type="button"
              className="w-9 h-9 flex items-center justify-center text-white/95"
              aria-label="Outil d appel"
            >
              <Icon className="w-5 h-5" />
            </button>
          ))}
        </div>

        {callType === 'video' && callStatus !== 'ringing' ? (
          <div className="absolute top-16 right-4 z-20 w-20 h-24 rounded-2xl bg-slate-700/90 border border-white/20 overflow-hidden flex items-center justify-center">
            <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            <span className="absolute bottom-2 left-2 text-[11px] font-semibold text-white">You</span>
          </div>
        ) : null}

        {callType === 'audio' && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="w-40 h-40 rounded-full overflow-hidden border-4 border-white/20 shadow-2xl bg-slate-700">
              {remoteUser.profile_image ? (
                <img src={remoteUser.profile_image} alt={remoteUser.full_name || 'profile'} className="w-full h-full object-cover" />
              ) : null}
            </div>
          </div>
        )}

        <div className="absolute left-1/2 -translate-x-1/2 z-20" style={{ bottom: 'calc(170px + env(safe-area-inset-bottom, 0px))' }}>
          <div className="max-w-[min(92vw,320px)] px-4 py-1.5 rounded-full bg-black/55 text-white text-xs font-medium text-center shadow-lg backdrop-blur-sm border border-white/10">
            {linkStatusLabel}
            {callStatus === 'active' && callQuality.level !== 'unknown' ? ` · Qualité ${callQuality.level === 'good' ? 'bonne' : callQuality.level === 'fair' ? 'moyenne' : 'faible'}` : ''}
          </div>
        </div>
      </div>

      <div className="fixed left-0 right-0 px-5 z-40" style={{ bottom: 'calc(40px + env(safe-area-inset-bottom, 0px))' }}>
        <div className="mx-auto max-w-md rounded-full bg-black/55 backdrop-blur border border-white/10 px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={() => {
                if (callType !== 'video') return;
                const next = !isCameraOn;
                setIsCameraOn(next);
                if (!next) setAutoVideoPaused(false);
              }}
              className={`w-12 h-12 rounded-full flex items-center justify-center ${callType === 'video' && (!isCameraOn || autoVideoPaused) ? 'bg-red-500' : 'bg-white/18'}`}
            >
              {callType === 'video' ? (
                (isCameraOn && !autoVideoPaused) ? <Video className="w-5 h-5 text-white" /> : <VideoOff className="w-5 h-5 text-white" />
              ) : (
                <VideoOff className="w-5 h-5 text-white/70" />
              )}
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={() => setIsMicOn(!isMicOn)}
              className={`w-12 h-12 rounded-full flex items-center justify-center ${isMicOn ? 'bg-white/18' : 'bg-red-500'}`}
            >
              {isMicOn ? <Mic className="w-5 h-5 text-white" /> : <MicOff className="w-5 h-5 text-white" />}
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleEndCall}
              className="w-14 h-14 rounded-full flex items-center justify-center bg-red-600 hover:bg-red-700"
            >
              <PhoneOff className="w-7 h-7 text-white" />
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={() => setIsSpeakerOn((v) => !v)}
              className={`w-12 h-12 rounded-full flex items-center justify-center ${isSpeakerOn ? 'bg-white/18' : 'bg-red-500'}`}
            >
              {isSpeakerOn ? <Volume2 className="w-5 h-5 text-white" /> : <VolumeX className="w-5 h-5 text-white" />}
            </motion.button>

            <motion.button whileTap={{ scale: 0.92 }} className="w-12 h-12 rounded-full flex items-center justify-center bg-white/18">
              <RefreshCcw className="w-5 h-5 text-white" />
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
}
