import React, { useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Phone, PhoneOff } from 'lucide-react';
import { toast } from 'sonner';
import { createPageUrl } from '@/utils';
import { useCallSocket } from '@/hooks/useCallSocket';

/** Évite les toasts en double si plusieurs sockets reçoivent le même invite. */
const recentGroupCallInvites = new Map();
function shouldToastGroupCallInvite(callId) {
  const key = String(callId);
  const now = Date.now();
  const prev = recentGroupCallInvites.get(key);
  if (prev && now - prev < 4000) return false;
  recentGroupCallInvites.set(key, now);
  window.setTimeout(() => recentGroupCallInvites.delete(key), 5000);
  return true;
}

const recentGroupCallEnded = new Map();
function shouldToastGroupCallEnded(callId) {
  const key = String(callId);
  const now = Date.now();
  const prev = recentGroupCallEnded.get(key);
  if (prev && now - prev < 4000) return false;
  recentGroupCallEnded.set(key, now);
  window.setTimeout(() => recentGroupCallEnded.delete(key), 5000);
  return true;
}

export default function IncomingCallListener({ user }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [incomingCall, setIncomingCall] = useState(null);
  const userIdRef = useRef(user?.id);
  userIdRef.current = user?.id;

  const { emit } = useCallSocket({
    userId: user?.id,
    onInvite: (payload) => {
      if (!payload?.fromUserId || location.pathname.includes('/DirectCall')) return;
      setIncomingCall(payload);
    },
    onEnd: () => setIncomingCall(null),
    onDecline: () => setIncomingCall(null),
    onGroupCallInvite: (payload) => {
      const uid = userIdRef.current;
      if (!payload?.callId || !payload?.groupId || !uid || payload.startedBy === uid) return;
      if (location.pathname.includes('/GroupCallLobby')) return;
      if (!shouldToastGroupCallInvite(payload.callId)) return;
      const who = payload.startedByName || 'Un membre';
      const kind = payload.type === 'audio' ? 'audio' : 'vidéo';
      const path = `${createPageUrl('GroupCallLobby')}?callId=${encodeURIComponent(payload.callId)}&groupId=${encodeURIComponent(payload.groupId)}`;
      const url = typeof window !== 'undefined' ? `${window.location.origin}${path}` : path;
      toast.message(`${who} lance un appel ${kind}`, {
        duration: 25_000,
        action: {
          label: 'Rejoindre',
          onClick: () => {
            window.location.assign(url);
          },
        },
      });
    },
    onGroupCallEnded: (payload) => {
      if (!payload?.callId) return;
      if (location.pathname.includes('/GroupCallLobby')) return;
      if (location.pathname.includes('/GroupChat')) return;
      if (!shouldToastGroupCallEnded(payload.callId)) return;
      toast.info('Appel groupe terminé', { duration: 5000 });
    },
  });

  if (!incomingCall) return null;

  const callerName = incomingCall.callerName || 'Appel entrant';
  const callType = incomingCall.type || 'audio';
  const callId = incomingCall.callId;

  const handleDecline = () => {
    emit('call:decline', {
      toUserId: incomingCall.fromUserId,
      fromUserId: user.id,
      callId,
      reason: 'declined',
    });
    setIncomingCall(null);
  };

  const handleAccept = () => {
    emit('call:accept', {
      toUserId: incomingCall.fromUserId,
      fromUserId: user.id,
      callId,
      type: callType,
    });
    setIncomingCall(null);
    navigate(
      `${createPageUrl('DirectCall')}?mode=incoming&callerId=${incomingCall.fromUserId}&type=${callType}&callId=${callId}`
    );
  };

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[120] w-[min(92vw,420px)] rounded-2xl bg-slate-950/95 border border-blue-400/30 shadow-2xl backdrop-blur p-4">
      <p className="text-xs uppercase tracking-wide text-blue-300/80 mb-1">Afriwonder Call</p>
      <p className="text-white font-semibold truncate">{callerName}</p>
      <p className="text-blue-100/70 text-sm mb-4">{callType === 'video' ? 'Appel video entrant' : 'Appel vocal entrant'}</p>
      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          className="w-11 h-11 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center text-white"
          onClick={handleDecline}
          aria-label="Refuser"
        >
          <PhoneOff className="w-5 h-5" />
        </button>
        <button
          type="button"
          className="w-11 h-11 rounded-full bg-green-600 hover:bg-green-700 flex items-center justify-center text-white"
          onClick={handleAccept}
          aria-label="Accepter"
        >
          <Phone className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
