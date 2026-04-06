import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Eye, ArrowLeft, Gift, Share2, Volume2, VolumeX, WifiOff, Wifi } from 'lucide-react';
import { api } from '@/api/expressClient';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';
import { useAgoraAudience } from '@/hooks/useAgora';
import { useLiveSocket } from '@/hooks/useLiveSocket';

const MAX_CHAT = 200;

const GIFTS = [
  { id: 'rose', name: 'Rose', emoji: '🌹', coins: 10 },
  { id: 'heart', name: 'Cœur', emoji: '❤️', coins: 50 },
  { id: 'fire', name: 'Feu', emoji: '🔥', coins: 100 },
  { id: 'diamond', name: 'Diamant', emoji: '💎', coins: 200 },
  { id: 'crown', name: 'Couronne', emoji: '👑', coins: 500 },
];

function FloatingReaction({ emoji, onDone }) {
  return (
    <motion.div
      className="absolute bottom-24 right-4 z-30 pointer-events-none text-3xl"
      initial={{ opacity: 1, y: 0, scale: 1 }}
      animate={{ opacity: 0, y: -200, x: (Math.random() - 0.5) * 60, scale: 1.6 }}
      transition={{ duration: 2.2, ease: 'easeOut' }}
      onAnimationComplete={onDone}
    >
      {emoji}
    </motion.div>
  );
}

export default function LiveViewerPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const streamId = searchParams.get('id');

  const videoRef = useRef(null);
  const chatEndRef = useRef(null);
  const wakeLockRef = useRef(null);
  const sessionIdRef = useRef(null);
  const heartbeatRef = useRef(null);

  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [viewers, setViewers] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showGifts, setShowGifts] = useState(false);
  const [reactions, setReactions] = useState([]);
  const [dataSaver, setDataSaver] = useState(false);
  const [agoraToken, setAgoraToken] = useState(null);

  useEffect(() => {
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!conn?.addEventListener) return;
    const check = () => setDataSaver(conn.saveData || ['slow-2g', '2g', '3g'].includes(conn.effectiveType));
    check();
    conn.addEventListener('change', check);
    return () => conn.removeEventListener('change', check);
  }, []);

  useEffect(() => {
    api.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: liveData, isLoading } = useQuery({
    queryKey: ['live-viewer', streamId],
    queryFn: () => api.live.getById(streamId),
    enabled: !!streamId,
    refetchInterval: false,
    staleTime: Infinity,
  });

  useEffect(() => {
    if (!liveData) return;
    setViewers(liveData.viewers_count ?? 0);
    setMessages((liveData.chat_messages ?? []).slice(-MAX_CHAT));
  }, [liveData]);

  useEffect(() => {
    if (!streamId) return;
    let renewTimer = null;

    const fetchToken = async () => {
      try {
        const data = await api.live.getStreamToken(streamId, 'audience');
        setAgoraToken(data);
        if (data?.expireTime) {
          const renewIn = (data.expireTime * 1000) - Date.now() - 2 * 60 * 1000;
          if (renewIn > 0) renewTimer = window.setTimeout(fetchToken, renewIn);
        }
      } catch {
        toast.error('Impossible de rejoindre le live');
      }
    };

    fetchToken();
    return () => {
      if (renewTimer) window.clearTimeout(renewTimer);
    };
  }, [streamId]);

  const { remoteAudioTrack, error: agoraError } = useAgoraAudience(agoraToken, videoRef, { dataSaverMode: dataSaver });

  useEffect(() => {
    if (!remoteAudioTrack?.setVolume) return;
    remoteAudioTrack.setVolume(isMuted ? 0 : 100);
  }, [remoteAudioTrack, isMuted]);

  useEffect(() => {
    if (!('wakeLock' in navigator)) return;
    let lock = null;
    const acquire = async () => {
      try {
        lock = await navigator.wakeLock.request('screen');
        wakeLockRef.current = lock;
      } catch (_) {}
    };
    acquire();
    const onVisible = () => {
      if (document.visibilityState === 'visible') acquire();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      lock?.release().catch(() => {});
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  useEffect(() => {
    if (!streamId || !user?.id) return;
    const sessionId = `${user.id}_${Date.now()}`;
    sessionIdRef.current = sessionId;
    api.live.joinViewer(streamId, sessionId).catch(() => {});
    return () => {
      api.live.leaveViewer(streamId, sessionId).catch(() => {});
      sessionIdRef.current = null;
    };
  }, [streamId, user?.id]);

  useEffect(() => {
    if (!streamId || !user?.id || !sessionIdRef.current) return;
    heartbeatRef.current = window.setInterval(() => {
      api.live.heartbeat(streamId, sessionIdRef.current).catch(() => {});
    }, 30000);
    return () => {
      if (heartbeatRef.current) window.clearInterval(heartbeatRef.current);
    };
  }, [streamId, user?.id]);

  const addReaction = useCallback((emoji) => {
    const id = Date.now() + Math.random();
    setReactions((prev) => [...prev, { id, emoji }]);
  }, []);

  useLiveSocket({
    streamId,
    userId: user?.id,
    onChat: (payload) => {
      setMessages((prev) => {
        const next = [...prev, payload];
        return next.length > MAX_CHAT ? next.slice(-MAX_CHAT) : next;
      });
    },
    onGift: (payload) => {
      addReaction(payload.emoji || '🎁');
      toast.success(`${payload.sender_name} a envoyé ${payload.gift_name || 'un cadeau'} !`);
    },
    onViewers: (payload) => setViewers(payload.count ?? 0),
    onLike: () => addReaction('❤️'),
    onEnded: () => {
      toast.info('Le live est terminé');
      window.setTimeout(() => navigate(createPageUrl('Lives')), 3000);
    },
  });

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(async () => {
    const text = newMessage.trim();
    if (!text || !streamId) return;
    if (!user) {
      toast.error('Connecte-toi pour chatter');
      return;
    }
    setNewMessage('');
    try {
      await api.live.sendChatMessage(streamId, text);
    } catch {
      toast.error('Message non envoyé');
    }
  }, [newMessage, streamId, user]);

  const handleLike = useCallback(async () => {
    if (hasLiked || !streamId) return;
    setHasLiked(true);
    addReaction('❤️');
    try {
      await api.live.like(streamId);
    } catch {
      setHasLiked(false);
    }
  }, [hasLiked, streamId, addReaction]);

  const sendGift = useCallback(async (gift) => {
    if (!user) {
      toast.error('Connecte-toi pour envoyer des cadeaux');
      return;
    }
    try {
      await api.live.sendGift(streamId, {
        giftId: gift.id,
        giftName: gift.name,
        giftIcon: gift.emoji,
        amount: gift.coins,
        quantity: 1,
      });
      addReaction(gift.emoji);
      setShowGifts(false);
    } catch (err) {
      toast.error(err?.apiMessage || 'Solde insuffisant');
    }
  }, [streamId, user, addReaction]);

  const handleShare = useCallback(async () => {
    if (!navigator.share) return;
    try {
      await navigator.share({ title: liveData?.title, url: window.location.href });
    } catch (_) {}
  }, [liveData?.title]);

  if (!streamId) {
    return <div className="flex min-h-screen items-center justify-center bg-black text-white">Live introuvable</div>;
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="relative h-screen w-full select-none overflow-hidden bg-black touch-none">
      <div ref={videoRef} className="absolute inset-0 h-full w-full" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/40" />

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <AnimatePresence>
          {reactions.map((reaction) => (
            <FloatingReaction
              key={reaction.id}
              emoji={reaction.emoji}
              onDone={() => setReactions((prev) => prev.filter((item) => item.id !== reaction.id))}
            />
          ))}
        </AnimatePresence>
      </div>

      <div className="absolute left-0 right-0 top-0 z-20 flex items-center justify-between px-4 pb-3 pt-10">
        <button onClick={() => navigate(-1)} className="flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white">
          <ArrowLeft size={18} />
        </button>

        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-lg bg-red-600 px-2.5 py-1 text-xs font-bold text-white">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
            LIVE
          </span>
          <span className="flex items-center gap-1 rounded-lg bg-black/50 px-2 py-1 text-xs text-white">
            <Eye size={11} />
            {viewers.toLocaleString('fr-FR')}
          </span>
          {dataSaver ? (
            <span className="flex items-center gap-1 rounded-lg bg-amber-500/80 px-2 py-1 text-xs text-white">
              <Wifi size={11} />
              Éco
            </span>
          ) : null}
        </div>

        <div className="flex gap-2">
          <button onClick={() => setIsMuted((value) => !value)} className="flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white">
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <button onClick={handleShare} className="flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white">
            <Share2 size={18} />
          </button>
        </div>
      </div>

      <div className="absolute left-4 right-16 top-20 z-10">
        <div className="mb-1 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-500 text-xs font-bold text-white">
            {liveData?.creator?.username?.[0]?.toUpperCase() || 'C'}
          </div>
          <span className="text-xs font-medium text-white/80">{liveData?.creator?.username}</span>
        </div>
        <p className="line-clamp-1 text-sm font-semibold text-white drop-shadow">{liveData?.title}</p>
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-20">
        <div className="scrollbar-none flex max-h-48 flex-col gap-1.5 overflow-y-auto px-3 pb-2">
          {messages.map((msg, index) => (
            <motion.div
              key={msg.id || index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex max-w-[85%] items-start gap-1.5"
            >
              <span className="shrink-0 text-xs font-semibold text-orange-400">{msg.username || msg.sender_name}</span>
              <span className="break-words text-xs text-white/90">{msg.message || msg.content}</span>
            </motion.div>
          ))}
          <div ref={chatEndRef} />
        </div>

        <div className="flex items-center gap-2 px-3 pb-8 pt-1">
          <div className="flex flex-1 items-center gap-2 rounded-full bg-white/10 px-3 py-2.5 backdrop-blur-md">
            <input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Dis quelque chose..."
              className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/40"
            />
            {newMessage ? (
              <button onClick={sendMessage} className="shrink-0 text-sm font-bold text-orange-400">
                Envoyer
              </button>
            ) : null}
          </div>

          <button
            onClick={() => setShowGifts((value) => !value)}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-pink-500 text-white shadow-lg transition-transform active:scale-90"
          >
            <Gift size={20} />
          </button>

          <button
            onClick={handleLike}
            className={`flex h-11 w-11 items-center justify-center rounded-full transition-all active:scale-90 ${
              hasLiked ? 'scale-110 bg-red-500 text-white' : 'bg-white/10 text-white'
            }`}
          >
            <Heart size={20} fill={hasLiked ? 'white' : 'none'} />
          </button>
        </div>

        <AnimatePresence>
          {showGifts ? (
            <motion.div
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 60 }}
              className="absolute bottom-24 left-2 right-2 rounded-2xl border border-white/10 bg-black/95 p-4 backdrop-blur-xl"
            >
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-white">Envoyer un cadeau</p>
                <button onClick={() => setShowGifts(false)} className="text-xs text-white/50">Fermer</button>
              </div>
              <div className="grid grid-cols-5 gap-3">
                {GIFTS.map((gift) => (
                  <button
                    key={gift.id}
                    onClick={() => sendGift(gift)}
                    className="flex flex-col items-center gap-1 rounded-xl bg-white/8 p-2 transition-transform hover:bg-white/15 active:scale-95"
                  >
                    <span className="text-2xl">{gift.emoji}</span>
                    <span className="text-[10px] text-white/70">{gift.coins} coins</span>
                  </button>
                ))}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      {agoraError ? (
        <div className="absolute left-1/2 top-1/2 z-40 w-72 -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-black/90 p-6 text-center">
          <WifiOff size={36} className="mx-auto mb-3 text-red-400" />
          <p className="font-semibold text-white">Connexion impossible</p>
          <p className="mt-1 text-xs text-white/50">{agoraError}</p>
          <button onClick={() => window.location.reload()} className="mt-4 w-full rounded-full bg-orange-500 px-5 py-2 text-sm font-semibold text-white">
            Réessayer
          </button>
        </div>
      ) : null}
    </div>
  );
}
