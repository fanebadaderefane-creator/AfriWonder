import React, { useState, useEffect, useRef } from 'react';
import { api } from '@/api/expressClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Send, Gift, Eye, Shield, X, ShoppingBag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import GiftAnimation from '../components/live/GiftAnimation';
import { useAgoraAudience } from '@/hooks/useAgora';

const GIFTS = [
  { id: 'heart', name: 'Cœur', amount: 100, icon: '❤️' },
  { id: 'star', name: 'Étoile', amount: 500, icon: '⭐' },
  { id: 'fire', name: 'Feu', amount: 1000, icon: '🔥' },
  { id: 'crown', name: 'Couronne', amount: 5000, icon: '👑' },
  { id: 'diamond', name: 'Diamant', amount: 10000, icon: '💎' },
  { id: 'plane', name: 'Avion', amount: 25000, icon: '✈️' }
];

export default function LiveView() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [liveId, setLiveId] = useState(null);
  const [user, setUser] = useState(null);
  const [message, setMessage] = useState('');
  const [showGifts, setShowGifts] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [giftAnimations, setGiftAnimations] = useState([]);
  const [selectedUserBan, setSelectedUserBan] = useState(null);
  const chatEndRef = useRef(null);
  const sessionIdRef = useRef(null);
  const heartbeatRef = useRef(null);
  const remoteVideoRef = useRef(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setLiveId(params.get('id'));

    const getUser = async () => {
      try {
        const u = await api.auth.me();
        setUser(u);
      } catch {}
    };
    getUser();
  }, []);

  const { data: live, refetch: refetchLive } = useQuery({
    queryKey: ['live', liveId],
    queryFn: () => api.live.getById(liveId),
    enabled: !!liveId,
    refetchInterval: 5000,
  });

  const { data: tokenData } = useQuery({
    queryKey: ['live-token', liveId, 'audience'],
    queryFn: () => api.live.getStreamToken(liveId, 'audience'),
    enabled: !!liveId && live?.status === 'live',
  });
  const agoraToken = tokenData?.appId && tokenData?.channel ? tokenData : null;
  const { remoteVideoTrack, error: agoraError, leave: leaveAgora } = useAgoraAudience(agoraToken, remoteVideoRef);
  const hasAgora = !!agoraToken;

  useEffect(() => {
    if (agoraError) toast.error(agoraError);
  }, [agoraError]);

  useEffect(() => {
    if (live?.status !== 'live' && leaveAgora) leaveAgora();
  }, [live?.status, leaveAgora]);

  const messages = (live?.chat_messages ?? []).filter((m) => !m.is_deleted);

  useEffect(() => {
    if (!liveId || !user?.id || live?.status !== 'live') return;
    const sessionId = `${user.id}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    sessionIdRef.current = sessionId;
    api.live.joinViewer(liveId, sessionId).then(() => refetchLive()).catch(() => {});
    return () => {
      if (sessionIdRef.current) {
        api.live.leaveViewer(liveId, sessionIdRef.current).catch(() => {});
      }
    };
  }, [liveId, user?.id, live?.status]);

  useEffect(() => {
    if (!liveId || !user?.id || live?.status !== 'live' || !sessionIdRef.current) return;
    heartbeatRef.current = setInterval(() => {
      api.live.heartbeat(liveId, sessionIdRef.current).catch(() => {});
    }, 30000);
    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, [liveId, user?.id, live?.status]);

  const bannedUsers = [];

  const { data: followers = [] } = useQuery({
    queryKey: ['following', user?.id, live?.creator_id],
    queryFn: async () => {
      if (!user?.id || !live?.creator_id) return [];
      const f = await api.users.getFollowing({
        follower_id: user.id,
        following_id: live.creator_id
      });
      return f;
    },
    enabled: !!user?.id && !!live?.creator_id
  });

  const isCreator = live?.creator_id === user?.id;

  const { data: wallet } = useQuery({
    queryKey: ['live-wallet'],
    queryFn: () => api.live.getWallet(),
    enabled: !!user?.id && showGifts,
  });

  const { data: liveOrdersData } = useQuery({
    queryKey: ['orders-live', liveId],
    queryFn: () => api.orders.list({ live_id: liveId, page: 1, limit: 10 }),
    enabled: !!liveId && !!user?.id && isCreator,
    refetchInterval: 15000,
  });
  const liveOrders = liveOrdersData?.orders ?? [];
  const liveOrdersTotal = liveOrdersData?.pagination?.total ?? 0;

  const sendMessageMutation = useMutation({
    mutationFn: () => api.live.sendChatMessage(liveId, message.trim()),
    onSuccess: () => {
      setMessage('');
      queryClient.invalidateQueries({ queryKey: ['live', liveId] });
    },
    onError: (e) => toast.error(e.apiMessage || e.response?.data?.error || e.message || 'Erreur envoi'),
  });

  const sendGiftMutation = useMutation({
    mutationFn: async (gift) => {
      const res = await api.live.sendGift(liveId, {
        giftId: gift.id,
        giftName: gift.name,
        giftIcon: gift.icon || gift.name,
        amount: gift.amount,
        quantity: 1,
        message: undefined,
      });
      setGiftAnimations(prev => [...prev, { id: res?.id || Date.now(), gift, quantity: 1, position: { x: window.innerWidth / 2, y: window.innerHeight / 2 } }]);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['live', liveId] });
      setShowGifts(false);
    },
    onError: (e) => toast.error(e.apiMessage || e.response?.data?.error?.message || e.message || 'Solde insuffisant ou live terminé'),
  });

  const banUserMutation = useMutation({
    mutationFn: (userToBan) => api.live.ban(liveId, { userId: userToBan.sender_id, reason: 'Modération', durationMinutes: 60 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['live', liveId] });
      setSelectedUserBan(null);
      toast.success('Utilisateur banni du chat');
    },
    onError: (e) => toast.error(e.apiMessage || e.response?.data?.error || e.message),
  });

  const likeMutation = useMutation({
    mutationFn: () => api.live.like(liveId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['live', liveId] }),
  });

  const followMutation = useMutation({
    mutationFn: async () => {
      if (isFollowing) {
        const f = await api.users.getFollowing({ follower_id: user.id, following_id: live.creator_id });
        if (f.length > 0) return api.entities.Follow.delete(f[0].id);
      } else {
        await api.users.toggleFollow({
          follower_id: user.id,
          follower_name: user.full_name,
          follower_avatar: user.profile_image,
          following_id: live.creator_id,
          following_name: live.creator_name,
          following_avatar: live.creator_avatar
        });
      }
    },
    onSuccess: () => {
      setIsFollowing(!isFollowing);
      queryClient.invalidateQueries({ queryKey: ['following', user?.id, live?.creator_id] });
    }
  });

  useEffect(() => {
    if (followers.length > 0) {
      setIsFollowing(true);
    }
  }, [followers]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!live) {
    return <div className="h-screen flex items-center justify-center text-white bg-black">Live non trouvé</div>;
  }

  return (
    <div className="h-screen flex flex-col bg-black overflow-hidden">
      {/* Video Stream: Agora si token disponible, sinon placeholder */}
      <div className="relative flex-1 bg-gradient-to-br from-gray-900 to-black flex items-center justify-center overflow-hidden">
        {hasAgora ? (
          <>
            <div ref={remoteVideoRef} className="absolute inset-0 w-full h-full bg-black [&>video]:object-contain [&>video]:w-full [&>video]:h-full" />
            {!remoteVideoTrack && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                <div className="text-center text-white">
                  <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="font-medium">Connexion au flux...</p>
                  <p className="text-sm text-gray-400 mt-1">{live.title}</p>
                </div>
              </div>
            )}
          </>
        ) : live?.status === 'ended' && live?.replay_url ? (
          <>
            <div className="absolute inset-0 w-full h-full bg-black">
              <iframe
                src={live.replay_url}
                title="Replay du live"
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="text-center text-white">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-pink-500 to-red-500 flex items-center justify-center">
                <span className="text-4xl">{live.creator_name?.[0]?.toUpperCase()}</span>
              </div>
              <h2 className="text-2xl font-bold mb-2">{live.title}</h2>
              <p className="text-gray-300">{live.creator_name}</p>
              {live?.status === 'live' && (
                <p className="text-gray-500 text-sm mt-2">Configurez Agora (backend) pour le flux vidéo réel</p>
              )}
              {live?.status === 'ended' && !live?.replay_url && (
                <p className="text-gray-500 text-sm mt-2">Ce live est terminé. Replay non disponible.</p>
              )}
            </div>
          </div>
        )}

        {/* Top Bar */}
        <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 to-transparent p-4 z-10">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-white">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              {live?.status === 'live' ? (
                <>
                  <Badge className="bg-red-500 text-white animate-pulse">🔴 EN DIRECT</Badge>
                  <Badge className="bg-black/60 text-white">
                    <Eye className="w-3 h-3 mr-1" />
                    {live.viewers_count}
                  </Badge>
                </>
              ) : live?.replay_url ? (
                <Badge className="bg-gray-600 text-white">Replay</Badge>
              ) : (
                <Badge className="bg-gray-600 text-white">Terminé</Badge>
              )}
            </div>
          </div>
        </div>

        {/* Creator Info */}
        <div className="absolute top-16 left-4 right-4 z-10">
          <div className="flex items-center justify-between bg-black/60 backdrop-blur-sm rounded-full px-3 py-2">
            <div className="flex items-center gap-2">
              <Avatar className="w-8 h-8">
                <AvatarImage src={live.creator_avatar} />
                <AvatarFallback>{live.creator_name?.[0]}</AvatarFallback>
              </Avatar>
              <span className="text-white text-sm font-semibold">{live.creator_name}</span>
            </div>
            {user?.id !== live.creator_id && (
              <Button
                onClick={() => followMutation.mutate()}
                disabled={followMutation.isPending}
                size="sm"
                className={isFollowing ? 'bg-gray-600 hover:bg-gray-700' : 'bg-red-600 hover:bg-red-700'}
              >
                {isFollowing ? '✓ Suivi' : '+ Suivre'}
              </Button>
            )}
          </div>
        </div>

        {/* Gift Animations */}
        <AnimatePresence>
          {giftAnimations.map(anim => (
            <GiftAnimation
              key={anim.id}
              gift={anim.gift}
              position={anim.position}
              onComplete={() => {
                setGiftAnimations(prev => prev.filter(g => g.id !== anim.id));
              }}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Chat Section */}
      <div className="h-64 bg-gray-900 flex flex-col border-t border-gray-700">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          <AnimatePresence>
            {messages.slice(-30).map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className={`flex items-start gap-2 group ${msg.message_type === 'gift' ? 'bg-yellow-500/20 px-2 py-1 rounded' : ''}`}
              >
                <Avatar className="w-5 h-5 flex-shrink-0">
                  <AvatarImage src={msg.sender_avatar} />
                  <AvatarFallback className="text-xs">{msg.sender_name?.[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className={`text-xs font-semibold ${msg.sender_role === 'creator' ? 'text-red-400' : 'text-white'}`}>
                      {msg.sender_name}
                    </span>
                    {msg.sender_role === 'creator' && <Badge className="text-xs bg-red-500">Créateur</Badge>}
                  </div>
                  <p className="text-xs text-gray-300 break-words">{msg.message}</p>
                </div>

                {/* Ban Button */}
                {isCreator && msg.sender_id !== user.id && (
                  <Button
                    onClick={() => setSelectedUserBan(msg)}
                    size="icon"
                    variant="ghost"
                    className="h-5 w-5 opacity-0 group-hover:opacity-100 text-red-500"
                  >
                    <Shield className="w-3 h-3" />
                  </Button>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={chatEndRef} />
        </div>

        {/* Message Input */}
        {user && !isBanned && live?.status === 'live' && (
          <div className="flex items-center gap-2 p-3 bg-gray-800 border-t border-gray-700">
            <Input
              placeholder="Message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessageMutation.mutate()}
              className="flex-1 bg-gray-700 border-gray-600 text-white placeholder:text-gray-400 text-sm h-8"
            />
            <Button
              onClick={() => sendMessageMutation.mutate()}
              disabled={!message.trim() || sendMessageMutation.isPending}
              size="icon"
              className="h-8 w-8 bg-red-600 hover:bg-red-700"
            >
              <Send className="w-3 h-3" />
            </Button>
            <div className="relative">
              <Button
                onClick={() => setShowGifts(!showGifts)}
                size="icon"
                className="h-8 w-8 bg-yellow-600 hover:bg-yellow-700"
              >
                <Gift className="w-3 h-3" />
              </Button>

              {showGifts && (
                <div className="absolute bottom-12 right-0 bg-gray-800 rounded-lg p-2 space-y-1 z-50 min-w-[180px]">
                  <p className="text-xs text-gray-400 px-1 pb-1 border-b border-gray-700">
                    Solde : {Number(wallet?.balance ?? 0).toLocaleString()} FCFA
                  </p>
                  <p className="text-xs text-gray-500 px-1 py-0.5">
                    Le créateur reçoit 90 %. AfriWonder prélève 10 % sur les cadeaux.
                  </p>
                  <a
                    href={createPageUrl('RechargeWallet')}
                    className="block text-xs text-amber-400 hover:underline px-1 py-1"
                  >
                    Recharger le portefeuille
                  </a>
                  {GIFTS.map((gift) => (
                    <button
                      key={gift.id}
                      onClick={() => sendGiftMutation.mutate(gift)}
                      disabled={sendGiftMutation.isPending}
                      className="w-full text-left text-xs text-white hover:bg-gray-700 px-2 py-1 rounded"
                    >
                      {gift.name} ({gift.amount.toLocaleString()} FCFA)
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {isBanned && (
          <div className="p-3 bg-red-600/20 text-red-300 text-xs text-center">
            Vous avez été banni du chat de ce live
          </div>
        )}
      </div>

      {/* Ban Modal */}
      {selectedUserBan && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/50 flex items-end z-50">
          <motion.div initial={{ y: 100 }} animate={{ y: 0 }} className="w-full bg-gray-800 rounded-t-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-bold">Bannir {selectedUserBan.sender_name}?</h3>
              <Button variant="ghost" size="icon" onClick={() => setSelectedUserBan(null)}>
                <X className="w-4 h-4 text-white" />
              </Button>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setSelectedUserBan(null)} variant="outline" className="flex-1">
                Annuler
              </Button>
              <Button
                onClick={() => banUserMutation.mutate(selectedUserBan)}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                Bannir du chat
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}

