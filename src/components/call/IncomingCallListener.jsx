import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Phone, PhoneOff } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { useCallSocket } from '@/hooks/useCallSocket';

export default function IncomingCallListener({ user }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [incomingCall, setIncomingCall] = useState(null);

  const { emit } = useCallSocket({
    userId: user?.id,
    onInvite: (payload) => {
      if (!payload?.fromUserId || location.pathname.includes('/DirectCall')) return;
      setIncomingCall(payload);
    },
    onEnd: () => setIncomingCall(null),
    onDecline: () => setIncomingCall(null),
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
