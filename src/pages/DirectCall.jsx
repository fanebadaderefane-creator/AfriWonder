import React, { useState, useEffect, useRef } from 'react';
import { api } from '@/api/expressClient';
import { useMutation } from '@tanstack/react-query';
import { Loader2, Phone, PhoneOff, Mic, MicOff, Video, VideoOff, Share2 } from 'lucide-react';
import { toast } from "sonner";
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { motion, AnimatePresence } from 'framer-motion';

export default function DirectCallPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const receiverId = searchParams.get('receiverId');
  const [user, setUser] = useState(null);
  const [receiver, setReceiver] = useState(null);
  const [callStatus, setCallStatus] = useState('ringing'); // ringing, active, ended
  const [callType, _setCallType] = useState('video'); // audio, video
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [callStartTime, setCallStartTime] = useState(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  useEffect(() => {
    const getUser = async () => {
      try {
        const u = await api.auth.me();
        setUser(u);

        if (receiverId) {
          const users = await api.users.list();
          const r = users.find(usr => usr.id === receiverId);
          if (r) setReceiver(r);
        }
      } catch (_e) {
        navigate(createPageUrl('Home'));
      }
    };
    getUser();
  }, [navigate, receiverId]);

  // Track call duration
  useEffect(() => {
    if (callStatus !== 'active' || !callStartTime) return;

    const interval = setInterval(() => {
      setCallDuration(Math.floor((Date.now() - callStartTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [callStatus, callStartTime]);

  // Initialize media
  useEffect(() => {
    const initMedia = async () => {
      try {
        if (callType === 'video') {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 1280, height: 720 },
            audio: true
          });
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
        } else {
          const _stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        }
      } catch (_e) {
        toast.error('Impossible d\'accéder à la caméra/microphone');
      }
    };

    if (user && callStatus === 'ringing') {
      initMedia();
    }
  }, [user, callStatus, callType]);

  const createCallMutation = useMutation({
    mutationFn: async () => {
      const call = await api.entities.DirectCall.create({
        caller_id: user.id,
        caller_name: user.full_name,
        caller_avatar: user.profile_image,
        receiver_id: receiverId,
        receiver_name: receiver.full_name,
        receiver_avatar: receiver.profile_image,
        call_type: callType,
        status: 'ringing',
        room_id: `room_${user.id}_${receiverId}_${Date.now()}`
      });
      return call;
    }
  });

  const _endCallMutation = useMutation({
    mutationFn: async (callId) => {
      await api.entities.DirectCall.update(callId, {
        status: 'ended',
        ended_at: new Date().toISOString(),
        duration_seconds: callDuration
      });
    }
  });

  const handleInitiateCall = async () => {
    try {
      const _call = await createCallMutation.mutateAsync();
      setCallStartTime(Date.now());
      setCallStatus('active');
      toast.success('Appel lancé');
    } catch (_e) {
      toast.error('Erreur appel');
    }
  };

  const handleEndCall = async () => {
    // Stop media
    if (localVideoRef.current?.srcObject) {
      localVideoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }

    setCallStatus('ended');
    toast.success(`Appel terminé - ${Math.floor(callDuration / 60)}m ${callDuration % 60}s`);

    setTimeout(() => {
      navigate(createPageUrl('Inbox'));
    }, 2000);
  };

  const formatDuration = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (!user || !receiver) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black flex flex-col">
      {/* Video Container */}
      <div className="flex-1 relative">
        {/* Remote video (full screen) */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />

        {/* Local video (picture-in-picture) */}
        <div className="absolute bottom-4 right-4 w-24 h-32 rounded-lg overflow-hidden border-2 border-white shadow-lg">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        </div>

        {/* Status overlay */}
        <AnimatePresence>
          {callStatus === 'ringing' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center bg-black/40"
            >
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4 animate-pulse">
                  <Phone className="w-10 h-10 text-white" />
                </div>
                <p className="text-white text-lg font-semibold">{receiver.full_name}</p>
                <p className="text-white/70 text-sm mt-1">Appel en attente...</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Duration timer */}
        {callStatus === 'active' && (
          <div className="absolute top-4 left-4 bg-black/60 text-white px-4 py-2 rounded-full font-mono">
            {formatDuration(callDuration)}
          </div>
        )}

        {/* User info */}
        {callStatus === 'ringing' && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2">
            <div className="text-center">
              <p className="text-white font-semibold">{receiver.full_name}</p>
              <p className="text-white/70 text-sm">Type: {callType === 'video' ? 'Appel vidéo' : 'Appel audio'}</p>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-gradient-to-_t from-black to-transparent p-6">
        <div className="flex items-center justify-center gap-4">
          {/* Microphone toggle */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsMicOn(!isMicOn)}
            className={`w-12 h-12 rounded-full flex items-center justify-center ${
              isMicOn ? 'bg-white/20' : 'bg-red-500'
            }`}
          >
            {isMicOn ? (
              <Mic className="w-6 h-6 text-white" />
            ) : (
              <MicOff className="w-6 h-6 text-white" />
            )}
          </motion.button>

          {/* Camera toggle (video only) */}
          {callType === 'video' && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsCameraOn(!isCameraOn)}
              className={`w-12 h-12 rounded-full flex items-center justify-center ${
                isCameraOn ? 'bg-white/20' : 'bg-red-500'
              }`}
            >
              {isCameraOn ? (
                <Video className="w-6 h-6 text-white" />
              ) : (
                <VideoOff className="w-6 h-6 text-white" />
              )}
            </motion.button>
          )}

          {/* End call button */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={callStatus === 'ringing' ? handleInitiateCall : handleEndCall}
            disabled={createCallMutation.isPending}
            className={`w-16 h-16 rounded-full flex items-center justify-center ${
              callStatus === 'ringing'
                ? 'bg-green-500 hover:bg-green-600'
                : 'bg-red-500 hover:bg-red-600'
            }`}
          >
            {createCallMutation.isPending ? (
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            ) : callStatus === 'ringing' ? (
              <Phone className="w-8 h-8 text-white" />
            ) : (
              <PhoneOff className="w-8 h-8 text-white" />
            )}
          </motion.button>

          {/* Share screen toggle */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            className="w-12 h-12 rounded-full flex items-center justify-center bg-white/20"
          >
            <Share2 className="w-6 h-6 text-white" />
          </motion.button>
        </div>
      </div>
    </div>
  );
}

