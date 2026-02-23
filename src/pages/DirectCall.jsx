import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '@/api/expressClient';
import {
  Loader2,
  PhoneOff,
  Mic,
  MicOff,
  Video,
  VideoOff,
  MoreVertical,
  Volume2,
  VolumeX,
  MessageCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import BottomNav from '@/components/navigation/BottomNav';
import { useCallSocket } from '@/hooks/useCallSocket';

const buildIceServers = () => {
  const servers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];

  const turnUrl = import.meta.env.VITE_TURN_URL;
  const turnUsername = import.meta.env.VITE_TURN_USERNAME;
  const turnCredential = import.meta.env.VITE_TURN_CREDENTIAL;
  if (turnUrl && turnUsername && turnCredential) {
    servers.push({
      urls: turnUrl,
      username: turnUsername,
      credential: turnCredential,
    });
  }
  return { iceServers: servers };
};

export default function DirectCallPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode') || 'outgoing'; // outgoing | incoming
  const receiverId = searchParams.get('receiverId');
  const callerId = searchParams.get('callerId');
  const requestedType = searchParams.get('type');
  const callIdFromUrl = searchParams.get('callId');
  const fallbackCallId = useRef(`call-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);
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

  const endAndLeave = useCallback((silent = false) => {
    setCallStatus('ended');
    closePeer();
    stopMedia();
    if (!silent) {
      toast.success(`Appel termine - ${Math.floor(callDuration / 60)}m ${callDuration % 60}s`);
    }
    setTimeout(() => navigate(createPageUrl('Inbox')), 800);
  }, [callDuration, closePeer, navigate, stopMedia]);

  const ensurePeerConnection = useCallback(async (emitFn, myUserId, remoteId) => {
    if (peerRef.current) return peerRef.current;
    const pc = new RTCPeerConnection(buildIceServers());
    peerRef.current = pc;

    pc.onicecandidate = (event) => {
      if (!event.candidate || !myUserId || !remoteId) return;
      emitFn('call:signal', {
        toUserId: remoteId,
        fromUserId: myUserId,
        callId,
        signal: { kind: 'candidate', candidate: event.candidate },
      });
    };

    pc.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => {
        remoteStreamRef.current.addTrack(track);
      });
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStreamRef.current;
      if (remoteAudioRef.current) remoteAudioRef.current.srcObject = remoteStreamRef.current;
      if (!callStartTime) setCallStartTime(Date.now());
      setCallStatus('active');
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected' || pc.connectionState === 'closed') {
        if (!disposedRef.current) {
          toast.error('Connexion appel interrompue');
          endAndLeave(true);
        }
      }
    };

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => pc.addTrack(track, localStreamRef.current));
    }

    return pc;
  }, [callId, callStartTime, endAndLeave]);

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
      if (payload?.fromUserId !== targetUserId || payload?.callId !== callId) return;
      const pc = await ensurePeerConnection(emit, user.id, targetUserId);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      emit('call:signal', {
        toUserId: targetUserId,
        fromUserId: user.id,
        callId,
        signal: { kind: 'offer', sdp: pc.localDescription },
      });
      setCallStatus('active');
      setCallStartTime(Date.now());
      toast.success('Appel accepte');
    },
    onDecline: (payload) => {
      if (mode !== 'outgoing') return;
      if (payload?.fromUserId !== targetUserId || payload?.callId !== callId) return;
      toast.error('Appel refuse');
      endAndLeave(true);
    },
    onEnd: (payload) => {
      if (payload?.callId !== callId) return;
      if (payload?.endedBy === user?.id) return;
      toast.info('Appel termine par l autre utilisateur');
      endAndLeave(true);
    },
    onSignal: async (payload) => {
      if (!user?.id || !targetUserId) return;
      if (payload?.callId !== callId || payload?.fromUserId !== targetUserId) return;

      const signal = payload.signal;
      if (!signal?.kind) return;

      const pc = await ensurePeerConnection(emit, user.id, targetUserId);
      if (signal.kind === 'offer') {
        await pc.setRemoteDescription(signal.sdp);
        await applyPendingCandidates(pc);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        emit('call:signal', {
          toUserId: targetUserId,
          fromUserId: user.id,
          callId,
          signal: { kind: 'answer', sdp: pc.localDescription },
        });
        setCallStatus('active');
        if (!callStartTime) setCallStartTime(Date.now());
      } else if (signal.kind === 'answer') {
        await pc.setRemoteDescription(signal.sdp);
        await applyPendingCandidates(pc);
      } else if (signal.kind === 'candidate') {
        if (pc.remoteDescription) {
          await pc.addIceCandidate(signal.candidate);
        } else {
          pendingCandidatesRef.current.push(signal.candidate);
        }
      }
    },
  });

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const me = await api.auth.me();
        setUser(me);
        if (!targetUserId) return;
        const users = await api.users.list({ page: 1, limit: 80 });
        const target = users.find((u) => u.id === targetUserId);
        if (target) setRemoteUser(target);
      } catch (_e) {
        navigate(createPageUrl('Home'));
      }
    };
    loadUsers();
  }, [navigate, targetUserId]);

  useEffect(() => {
    if (!user || callStatus === 'ended' || mediaInitDoneRef.current) return;
    mediaInitDoneRef.current = true;

    const initMedia = async () => {
      try {
        const constraints = callType === 'video'
          ? { audio: true, video: { width: 1280, height: 720 } }
          : { audio: true, video: false };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      } catch (_e) {
        if (!mediaErrorShownRef.current) {
          mediaErrorShownRef.current = true;
          toast.error("Impossible d'acceder a la camera/microphone");
        }
      }
    };

    initMedia();
  }, [user, callStatus, callType]);

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
    if (callStatus !== 'active' || !callStartTime) return;
    const interval = setInterval(() => {
      setCallDuration(Math.floor((Date.now() - callStartTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [callStatus, callStartTime]);

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
    if (videoTrack) videoTrack.enabled = callType === 'video' ? isCameraOn : false;
  }, [isCameraOn, callType]);

  useEffect(() => {
    if (!remoteAudioRef.current) return;
    remoteAudioRef.current.muted = !isSpeakerOn;
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
    endAndLeave();
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

  return (
    <div className="fixed inset-0 bg-black flex flex-col overflow-hidden">
      <audio ref={remoteAudioRef} autoPlay className="hidden" />
      <div className="flex-1 relative">
        {callType === 'video' ? (
          <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950" />
        )}

        <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/45 pointer-events-none" />

        <div className="absolute top-4 left-4 right-4 flex items-start justify-between z-20">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-red-600/90 flex items-center justify-center mt-0.5">
              <div className="w-2.5 h-2.5 rounded-full bg-white" />
            </div>
            <div>
              <p className="text-white font-semibold leading-tight">{remoteUser.full_name || remoteUser.username || 'Afriwonder'}</p>
              <p className="text-white/90 text-xs font-medium mt-0.5">
                {callStatus === 'ringing' ? 'En attente...' : formatDuration(callDuration)}
              </p>
            </div>
          </div>

          <button type="button" className="w-9 h-9 rounded-full bg-black/35 backdrop-blur flex items-center justify-center text-white">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>

        <div className="absolute top-16 right-4 z-20 w-20 h-24 rounded-2xl bg-slate-700/90 border border-white/20 overflow-hidden flex items-center justify-center">
          <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          <span className="absolute bottom-2 left-2 text-[11px] font-semibold text-white">You</span>
        </div>

        {callType === 'audio' && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="w-40 h-40 rounded-full overflow-hidden border-4 border-white/20 shadow-2xl bg-slate-700">
              {remoteUser.profile_image ? (
                <img src={remoteUser.profile_image} alt={remoteUser.full_name || 'profile'} className="w-full h-full object-cover" />
              ) : null}
            </div>
          </div>
        )}

        <div className="absolute left-1/2 -translate-x-1/2 z-20" style={{ bottom: 'calc(180px + env(safe-area-inset-bottom, 0px))' }}>
          <div className="px-4 py-1.5 rounded-full bg-green-600 text-white text-xs font-semibold shadow-lg">
            HD - Strong Connection
          </div>
        </div>
      </div>

      <div className="fixed left-0 right-0 px-5 z-40" style={{ bottom: 'calc(88px + env(safe-area-inset-bottom, 0px))' }}>
        <div className="mx-auto max-w-md rounded-full bg-black/50 backdrop-blur border border-white/10 px-4 py-3">
          <div className="flex items-center justify-between">
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={() => setIsMicOn(!isMicOn)}
              className={`w-12 h-12 rounded-full flex items-center justify-center ${isMicOn ? 'bg-white/18' : 'bg-red-500'}`}
            >
              {isMicOn ? <Mic className="w-5 h-5 text-white" /> : <MicOff className="w-5 h-5 text-white" />}
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={() => callType === 'video' && setIsCameraOn(!isCameraOn)}
              className={`w-12 h-12 rounded-full flex items-center justify-center ${callType === 'video' && !isCameraOn ? 'bg-red-500' : 'bg-white/18'}`}
            >
              {callType === 'video' ? (
                isCameraOn ? <Video className="w-5 h-5 text-white" /> : <VideoOff className="w-5 h-5 text-white" />
              ) : (
                <VideoOff className="w-5 h-5 text-white/70" />
              )}
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
              onClick={() => setIsSpeakerOn(!isSpeakerOn)}
              className={`w-12 h-12 rounded-full flex items-center justify-center ${isSpeakerOn ? 'bg-white/18' : 'bg-red-500'}`}
            >
              {isSpeakerOn ? <Volume2 className="w-5 h-5 text-white" /> : <VolumeX className="w-5 h-5 text-white" />}
            </motion.button>

            <motion.button whileTap={{ scale: 0.92 }} className="w-12 h-12 rounded-full flex items-center justify-center bg-white/18">
              <MessageCircle className="w-5 h-5 text-white" />
            </motion.button>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
