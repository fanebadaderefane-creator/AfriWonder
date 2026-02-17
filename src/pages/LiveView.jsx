import React, { useState, useEffect, useRef } from 'react';
import { api } from '@/api/expressClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Send, Gift, Eye, Shield, X, Volume2, VolumeX, Languages, Heart, ThumbsUp, Flame, Download, Share2, Flag, Maximize2, BarChart3 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import GiftAnimation from '../components/live/GiftAnimation';
import AdvancedGiftAnimation from '../components/live/AdvancedGiftAnimation';
import LiveReplayPlayer from '../components/live/LiveReplayPlayer';
import { useAgoraAudience } from '@/hooks/useAgora';
import { useLiveSocket } from '@/hooks/useLiveSocket';
import { speak, isTtsSupported } from '@/lib/liveTts';
import { translateToBambara, translateToFrench, detectLanguage } from '@/lib/liveTranslate';

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
  const [giftAnimations, setGiftAnimations] = useState([]);
  const [selectedUserBan, setSelectedUserBan] = useState(null);
  const [isBanned, setIsBanned] = useState(false);
  const [showTipModal, setShowTipModal] = useState(false);
  const [tipAmount, setTipAmount] = useState(500);
  const [tipMessage, setTipMessage] = useState('');
  const [tipAnonymous, setTipAnonymous] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [chatLang, setChatLang] = useState('fr'); // 'fr' | 'bm' — affichage chat
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const [subscribeAmount, setSubscribeAmount] = useState(500);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [showPolls, setShowPolls] = useState(false);
  const [activePolls, setActivePolls] = useState([]);
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
    refetchInterval: 30000,
  });

  // Récupérer les polls actifs (avec votes utilisateur si connecté)
  const { data: pollsData = [] } = useQuery({
    queryKey: ['live-polls', liveId, user?.id],
    queryFn: () => api.live.getPolls(liveId),
    enabled: !!liveId && live?.status === 'live',
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (pollsData && pollsData.length > 0) {
      setActivePolls(pollsData);
    }
  }, [pollsData]);

  useLiveSocket({
    streamId: liveId,
    userId: user?.id,
    onChat: (payload) => {
      queryClient.setQueryData(['live', liveId], (prev) => {
        if (!prev) return prev;
        const existing = prev.chat_messages ?? [];
        const seen = new Set(existing.map((m) => m.id));
        if (payload?.id && seen.has(payload.id)) return prev;
        return { ...prev, chat_messages: [...existing, payload], total_messages: (prev.total_messages ?? 0) + 1 };
      });
    },
    onGift: (payload) => {
      if (payload && payload.sender_id !== user?.id) {
        const gift = { id: payload.gift_id ?? payload.id, name: payload.gift_name ?? payload.giftName, amount: payload.amount ?? payload.total_amount, icon: payload.gift_icon ?? payload.giftIcon ?? '🎁' };
        const tier = payload.tier ?? (payload.total_amount >= 10000 ? 'vip' : payload.total_amount >= 5000 ? 'premium' : payload.total_amount >= 1000 ? 'super' : payload.total_amount >= 500 ? 'featured' : 'standard');
        setGiftAnimations((a) => [...a, { id: payload.id || Date.now(), gift, quantity: payload.quantity ?? 1, position: { x: window.innerWidth / 2, y: window.innerHeight / 2 }, tier }]);
      }
      queryClient.setQueryData(['live', liveId], (prev) => {
        if (!prev) return prev;
        const existing = prev.chat_messages ?? [];
        const msg = payload ? { id: payload.id, sender_name: payload.sender_name, sender_avatar: payload.sender_avatar, message: `🎁 ${payload.gift_name ?? payload.giftName} x${payload.quantity ?? 1}`, message_type: 'gift', created_date: new Date().toISOString() } : null;
        return { ...prev, total_gifts_amount: (prev.total_gifts_amount ?? 0) + (payload?.total_amount ?? payload?.amount ?? 0), chat_messages: msg ? [...existing, msg] : existing, total_messages: msg ? (prev.total_messages ?? 0) + 1 : prev.total_messages };
      });
    },
    onTip: (payload) => {
      if (payload && payload.sender_id !== user?.id) {
        const amt = payload.amount ?? 0;
        const tier = payload.tier ?? (amt >= 10000 ? 'vip' : amt >= 5000 ? 'premium' : amt >= 1000 ? 'super' : amt >= 500 ? 'featured' : 'standard');
        setGiftAnimations((a) => [...a, { id: payload.id || Date.now(), gift: { id: 'tip', name: 'Don', amount: amt, icon: '💵' }, quantity: 1, position: { x: window.innerWidth / 2, y: window.innerHeight / 2 }, tier }]);
      }
      queryClient.setQueryData(['live', liveId], (prev) => {
        if (!prev) return prev;
        const existing = prev.chat_messages ?? [];
        const msg = payload ? { id: payload.id, sender_name: payload.sender_name ?? 'Anonyme', message: `💵 ${(payload.amount ?? 0).toLocaleString()} FCFA`, message_type: 'gift', created_date: new Date().toISOString() } : null;
        return { ...prev, total_tips_amount: (prev.total_tips_amount ?? 0) + (payload?.amount ?? 0), goal_amount: payload?.amount ? (prev.goal_amount ?? 0) + payload.amount : prev.goal_amount, chat_messages: msg ? [...existing, msg] : existing, total_messages: msg ? (prev.total_messages ?? 0) + 1 : prev.total_messages };
      });
    },
    onViewers: (payload) => {
      if (payload?.count != null) {
        queryClient.setQueryData(['live', liveId], (prev) => (prev ? { ...prev, viewers_count: payload.count } : prev));
      }
    },
    onLike: (payload) => {
      if (payload?.count != null) {
        queryClient.setQueryData(['live', liveId], (prev) => (prev ? { ...prev, total_likes: payload.count } : prev));
      }
    },
    onEnded: () => {
      queryClient.setQueryData(['live', liveId], (prev) => (prev ? { ...prev, status: 'ended' } : prev));
      refetchLive();
    },
    onChatClear: () => {
      queryClient.setQueryData(['live', liveId], (prev) => (prev ? { ...prev, chat_messages: [] } : prev));
    },
    onBanned: (payload) => {
      if (payload?.userId === user?.id) setIsBanned(true);
    },
    onPollCreated: (poll) => {
      setActivePolls(prev => [...prev, poll]);
      toast.info('Nouveau sondage disponible !');
      // Rafraîchir les polls pour récupérer le vote utilisateur
      queryClient.invalidateQueries({ queryKey: ['live-polls', liveId] });
    },
    onPollUpdated: (poll) => {
      setActivePolls(prev => prev.map(p => p.id === poll.id ? {
        ...poll,
        userVote: poll.userVote ?? p.userVote
      } : p));
      // Rafraîchir les polls pour récupérer le vote utilisateur
      queryClient.invalidateQueries({ queryKey: ['live-polls', liveId] });
    },
    onPollEnded: (poll) => {
      setActivePolls(prev => prev.filter(p => p.id !== poll.id));
    },
  });

  const { data: tokenData } = useQuery({
    queryKey: ['live-token', liveId, 'audience'],
    queryFn: () => api.live.getStreamToken(liveId, 'audience'),
    enabled: !!liveId && live?.status === 'live',
  });
  const agoraToken = tokenData?.appId && tokenData?.channel ? tokenData : null;
  const dataSaverMode = !!user?.data_saver_mode; // CDC: mode données réduites → qualité 160p
  const { remoteVideoTrack, remoteAudioTrack, error: agoraError, leave: leaveAgora } = useAgoraAudience(agoraToken, remoteVideoRef, { dataSaverMode });
  const hasAgora = !!agoraToken;
  const [videoVolume, setVideoVolume] = useState(1);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const videoAreaRef = useRef(null);

  useEffect(() => {
    if (agoraError) toast.error(agoraError);
  }, [agoraError]);

  useEffect(() => {
    if (live?.status !== 'live' && leaveAgora) leaveAgora();
  }, [live?.status, leaveAgora]);

  const messages = (live?.chat_messages ?? []).filter((m) => !m.is_deleted);

  // CDC: TTS lecture optionnelle des messages dons
  useEffect(() => {
    if (!ttsEnabled || !isTtsSupported() || messages.length === 0) return;
    const last = messages[messages.length - 1];
    if (last?.message_type === 'gift' && last?.message) {
      speak(last.message, { lang: 'fr-FR' });
    }
  }, [ttsEnabled, messages.length]);

  const formatChatMessage = (msg) => {
    const text = msg.message || '';
    if (chatLang === 'bm') return translateToBambara(text);
    if (chatLang === 'fr') return detectLanguage(text) === 'bm' ? translateToFrench(text) : text;
    return text;
  };

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

  const { data: followingData } = useQuery({
    queryKey: ['following', user?.id],
    queryFn: () => api.users.getFollowing(user.id, { limit: 500 }),
    enabled: !!user?.id
  });
  const followingList = followingData?.following ?? [];
  const isFollowing = !!(live?.creator_id && followingList.some((f) => f.id === live.creator_id));

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
    onError: (e) => {
      const msg = (e.apiMessage || e.response?.data?.error || e.message || '').toLowerCase();
      if (msg.includes('banned') || msg.includes('banni')) setIsBanned(true);
      toast.error(e.apiMessage || e.response?.data?.error || e.message || 'Erreur envoi');
    },
  });

  const sendTipMutation = useMutation({
    mutationFn: () => api.live.sendTip(liveId, { amount: tipAmount, message: tipMessage || undefined, is_anonymous: tipAnonymous }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['live', liveId] });
      setShowTipModal(false);
      setTipAmount(500);
      setTipMessage('');
      toast.success('Don envoyé !');
    },
    onError: (e) => toast.error(e.apiMessage || e.response?.data?.error || e.message),
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
      const tier = gift.amount >= 10000 ? 'vip' : gift.amount >= 5000 ? 'premium' : gift.amount >= 1000 ? 'super' : gift.amount >= 500 ? 'featured' : 'standard';
      setGiftAnimations(prev => [...prev, { id: res?.id || Date.now(), gift, quantity: 1, position: { x: window.innerWidth / 2, y: window.innerHeight / 2 }, tier }]);
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

  const reactionMutation = useMutation({
    mutationFn: (type) => api.live.reaction(liveId, type),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['live', liveId] }),
  });

  const subscribeMutation = useMutation({
    mutationFn: () => api.live.subscribeToCreator(live.creator_id, subscribeAmount),
    onSuccess: () => {
      setShowSubscribeModal(false);
      toast.success('Abonnement activé ! Don mensuel de ' + subscribeAmount + ' FCFA');
    },
    onError: (e) => toast.error(e?.apiMessage || e?.response?.data?.error || e?.message || 'Erreur abonnement'),
  });

  const reportMutation = useMutation({
    mutationFn: () => api.live.report(liveId, reportReason, reportDescription),
    onSuccess: () => {
      setShowReportModal(false);
      setReportReason('');
      setReportDescription('');
      toast.success('Signalement envoyé. Merci !');
    },
    onError: (e) => toast.error(e?.apiMessage || e?.response?.data?.error || e?.message || 'Erreur'),
  });

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: live?.title || 'Live AfriWonder',
          text: `Regardez ce live : ${live?.title}`,
          url,
        });
        toast.success('Partagé !');
      } catch (e) {
        if (e?.name !== 'AbortError') {
          navigator.clipboard?.writeText(url).then(() => toast.success('Lien copié'));
        }
      }
    } else {
      navigator.clipboard?.writeText(url).then(() => toast.success('Lien copié'));
    }
  };

  const creatorName = live?.creator?.username ?? live?.creator_name ?? 'Créateur';
  const creatorAvatar = live?.creator?.profile_image ?? live?.creator_avatar ?? null;

  const followMutation = useMutation({
    mutationFn: () => api.users.toggleFollow(live?.creator_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['following', user?.id] });
    }
  });

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!live) {
    return <div className="h-[100dvh] flex items-center justify-center text-white bg-black">Live non trouvé</div>;
  }

  return (
    <div className="h-[100dvh] flex flex-col bg-black overflow-hidden">
      {/* Video Stream: Agora si token disponible, sinon placeholder */}
      <div ref={videoAreaRef} className="relative flex-1 bg-gradient-to-br from-gray-900 to-black flex items-center justify-center overflow-hidden">
        {hasAgora ? (
          <>
            <div ref={remoteVideoRef} className="absolute inset-0 w-full h-full bg-black [&>video]:object-contain [&>video]:w-full [&>video]:h-full" />
            {/* CDC: contrôles vidéo volume + plein écran */}
            {live?.status === 'live' && remoteVideoTrack && (
              <div className="absolute bottom-20 right-4 z-10 flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-lg px-2 py-1.5">
                <button
                  type="button"
                  className="p-1 text-white hover:bg-white/20 rounded"
                  onClick={() => {
                    if (remoteAudioTrack) {
                      const mute = !isVideoMuted;
                      remoteAudioTrack.setVolume(mute ? 0 : videoVolume * 100);
                      setIsVideoMuted(mute);
                    }
                  }}
                  title={isVideoMuted ? 'Activer le son' : 'Couper le son'}
                >
                  {isVideoMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={isVideoMuted ? 0 : videoVolume * 100}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10) / 100;
                    setVideoVolume(v);
                    if (remoteAudioTrack && !isVideoMuted) remoteAudioTrack.setVolume(v * 100);
                  }}
                  className="w-16 h-1 accent-amber-500"
                />
                <button
                  type="button"
                  className="p-1 text-white hover:bg-white/20 rounded"
                  onClick={() => {
                    const el = videoAreaRef.current;
                    if (!el) return;
                    if (document.fullscreenElement) {
                      document.exitFullscreen?.();
                    } else {
                      el.requestFullscreen?.();
                    }
                  }}
                  title="Plein écran"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>
            )}
            {/* CDC: avertissement consommation data */}
            {live?.status === 'live' && (
              <div className="absolute bottom-16 left-4 right-4 z-10 bg-black/70 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-amber-200 border border-amber-500/30">
                <span className="font-medium">📶 Consommation data :</span>{' '}
                {dataSaverMode ? '~500 Mo/heure (qualité réduite)' : '~1,5 Go/heure'}
              </div>
            )}
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
          <LiveReplayPlayer
            liveId={liveId}
            replayUrl={live.replay_url}
            isCreator={isCreator}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="text-center text-white">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-pink-500 to-red-500 flex items-center justify-center">
                <span className="text-4xl">{creatorName?.[0]?.toUpperCase()}</span>
              </div>
              <h2 className="text-2xl font-bold mb-2">{live.title}</h2>
              <p className="text-gray-300">{creatorName}</p>
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
              <Button variant="ghost" size="icon" onClick={handleShare} className="text-white" title="Partager">
                <Share2 className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setShowReportModal(true)} className="text-white" title="Signaler">
                <Flag className="w-5 h-5" />
              </Button>
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

        {/* CDC: Don goal bar */}
        {live?.status === 'live' && live?.goal_target > 0 && (
          <div className="absolute top-14 left-4 right-4 z-10 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2">
            <div className="flex justify-between text-xs text-white mb-1">
              <span>Objectif dons</span>
              <span>{Number(live?.goal_amount ?? 0).toLocaleString()} / {Number(live?.goal_target).toLocaleString()} FCFA</span>
            </div>
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-500"
                style={{ width: `${Math.min(100, ((live?.goal_amount ?? 0) / (live?.goal_target || 1)) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Creator Info */}
        <div className={`absolute left-4 right-4 z-10 ${live?.goal_target ? 'top-24' : 'top-16'}`}>
          <div className="flex items-center justify-between bg-black/60 backdrop-blur-sm rounded-full px-3 py-2">
            <div className="flex items-center gap-2">
              <Avatar className="w-8 h-8">
                <AvatarImage src={creatorAvatar} />
                <AvatarFallback>{creatorName?.[0]}</AvatarFallback>
              </Avatar>
              <span className="text-white text-sm font-semibold">{creatorName}</span>
            </div>
            <div className="flex items-center gap-2">
              {user?.id !== live.creator_id && (
                <>
                  <Button
                    onClick={() => followMutation.mutate()}
                    disabled={followMutation.isPending}
                    size="sm"
                    className={isFollowing ? 'bg-gray-600 hover:bg-gray-700' : 'bg-red-600 hover:bg-red-700'}
                  >
                    {isFollowing ? '✓ Suivi' : '+ Suivre'}
                  </Button>
                  <Button
                    onClick={() => setShowSubscribeModal(true)}
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs border-amber-500/50 text-amber-400"
                    title="S'abonner (don mensuel)"
                  >
                    💜 S'abonner
                  </Button>
                </>
              )}
              {isCreator && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs border-amber-500/50 text-amber-400"
                  title="Exporter analytics"
                  onClick={async () => {
                    try {
                      const blob = await api.live.exportCreatorAnalytics('csv');
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'live-analytics.csv';
                      a.click();
                      URL.revokeObjectURL(url);
                      toast.success('Export téléchargé');
                    } catch (e) {
                      toast.error(e?.message || 'Erreur export');
                    }
                  }}
                >
                  <Download className="w-3 h-3" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Gift Animations - Utiliser AdvancedGiftAnimation pour premium/vip */}
        <AnimatePresence>
          {giftAnimations.map(anim => {
            const useAdvanced = anim.tier === 'premium' || anim.tier === 'vip';
            const AnimationComponent = useAdvanced ? AdvancedGiftAnimation : GiftAnimation;
            return (
              <AnimationComponent
                key={anim.id}
                gift={anim.gift}
                position={anim.position}
                tier={anim.tier}
                onComplete={() => {
                  setGiftAnimations(prev => prev.filter(g => g.id !== anim.id));
                }}
              />
            );
          })}
        </AnimatePresence>
      </div>

      {/* Chat Section */}
      <div className="h-64 bg-gray-900 flex flex-col border-t border-gray-700">
        {/* CDC: TTS + Traduction fr/bambara */}
        <div className="flex items-center gap-2 px-2 py-1 border-b border-gray-700">
          {isTtsSupported() && (
            <Button
              variant="ghost"
              size="sm"
              className={`h-7 text-xs ${ttsEnabled ? 'bg-amber-600/30 text-amber-300' : 'text-gray-400'}`}
              onClick={() => setTtsEnabled(!ttsEnabled)}
              title="Lecture vocale des dons"
            >
              <Volume2 className="w-3 h-3 mr-1" />
              TTS
            </Button>
          )}
          <div className="flex rounded overflow-hidden border border-gray-600">
            <button
              type="button"
              onClick={() => setChatLang('fr')}
              className={`px-2 py-0.5 text-xs ${chatLang === 'fr' ? 'bg-gray-600 text-white' : 'text-gray-400'}`}
              title="Français"
            >
              <Languages className="w-3 h-3 inline mr-1" />
              FR
            </button>
            <button
              type="button"
              onClick={() => setChatLang('bm')}
              className={`px-2 py-0.5 text-xs ${chatLang === 'bm' ? 'bg-gray-600 text-white' : 'text-gray-400'}`}
              title="Bambara"
            >
              BM
            </button>
          </div>
        </div>
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
                  <p className="text-xs text-gray-300 break-words">{formatChatMessage(msg)}</p>
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
            <div className="relative flex gap-1">
              {/* CDC: Réactions ❤️👍🔥 */}
              <Button
                onClick={() => reactionMutation.mutate('heart')}
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-pink-400 hover:bg-pink-500/20"
                title="Cœur"
              >
                <Heart className="w-4 h-4" />
              </Button>
              <Button
                onClick={() => reactionMutation.mutate('thumbs')}
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-amber-400 hover:bg-amber-500/20"
                title="Bravo"
              >
                <ThumbsUp className="w-4 h-4" />
              </Button>
              <Button
                onClick={() => reactionMutation.mutate('fire')}
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-orange-400 hover:bg-orange-500/20"
                title="Feu"
              >
                <Flame className="w-4 h-4" />
              </Button>
              {(live?.donations_enabled !== false) && (
                <Button
                  onClick={() => setShowTipModal(true)}
                  size="icon"
                  className="h-8 w-8 bg-amber-600 hover:bg-amber-700"
                  title="Don direct"
                >
                  💵
                </Button>
              )}
              <Button
                onClick={() => setShowGifts(!showGifts)}
                size="icon"
                className="h-8 w-8 bg-yellow-600 hover:bg-yellow-700"
              >
                <Gift className="w-3 h-3" />
              </Button>
              {activePolls.length > 0 && (
                <Button
                  onClick={() => setShowPolls(!showPolls)}
                  size="icon"
                  className="h-8 w-8 bg-purple-600 hover:bg-purple-700 relative"
                  title="Sondages"
                >
                  <BarChart3 className="w-3 h-3" />
                  {activePolls.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                      {activePolls.length}
                    </span>
                  )}
                </Button>
              )}

              {showGifts && (
                <div className="absolute bottom-12 right-0 bg-gray-800 rounded-lg p-2 space-y-1 z-50 min-w-[180px]">
                  <p className="text-xs text-gray-400 px-1 pb-1 border-b border-gray-700">
                    Solde : {Number(wallet?.balance ?? 0).toLocaleString()} FCFA
                  </p>
                  <p className="text-xs text-gray-500 px-1 py-0.5">
                    CDC: créateur 85%, plateforme 15%.
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

              {/* Panneau Polls pour spectateurs */}
              {showPolls && activePolls.length > 0 && (
                <div className="absolute bottom-12 right-0 bg-gray-800 rounded-lg p-3 space-y-3 z-50 min-w-[280px] max-h-[400px] overflow-y-auto">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-white font-bold text-sm flex items-center gap-2">
                      <BarChart3 className="w-4 h-4" />
                      Sondages
                    </h4>
                    <button onClick={() => setShowPolls(false)} className="text-gray-400 hover:text-white">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  {activePolls.map((poll) => {
                    const options = poll.options || [];
                    const totalVotes = poll.total_votes || 0;
                    const userVote = poll.userVote ?? null; // Vote de l'utilisateur récupéré depuis l'API
                    const hasVoted = userVote !== null;
                    return (
                      <div key={poll.id} className="bg-gray-900/50 rounded-lg p-3">
                        <p className="text-white text-xs font-medium mb-2">{poll.question}</p>
                        {options.map((opt, idx) => {
                          const percentage = totalVotes > 0 ? ((opt.votes || 0) / totalVotes) * 100 : 0;
                          const isVoted = userVote === idx;
                          return (
                            <button
                              key={idx}
                              onClick={async () => {
                                if (!user) {
                                  toast.error('Connectez-vous pour voter');
                                  return;
                                }
                                if (hasVoted) {
                                  toast.info('Vous avez déjà voté pour ce sondage');
                                  return;
                                }
                                try {
                                  await api.live.votePoll(liveId, poll.id, idx);
                                  toast.success('Vote enregistré !');
                                  // Rafraîchir les polls pour mettre à jour le vote
                                  queryClient.invalidateQueries({ queryKey: ['live-polls', liveId] });
                                } catch (err) {
                                  toast.error(err?.apiMessage || err?.message || 'Erreur vote');
                                }
                              }}
                              disabled={hasVoted}
                              className={`w-full text-left mb-2 p-2 rounded text-xs transition-all ${
                                isVoted
                                  ? 'bg-orange-500/30 border border-orange-500 cursor-default'
                                  : hasVoted
                                    ? 'bg-gray-800/50 cursor-not-allowed opacity-60'
                                    : 'bg-gray-800 hover:bg-gray-700'
                              }`}
                            >
                              <div className="flex justify-between text-white mb-1">
                                <span className={isVoted ? 'font-semibold' : ''}>{opt.text}</span>
                                <span className="text-orange-400">{percentage.toFixed(0)}%</span>
                              </div>
                              <div className="w-full bg-gray-700 rounded-full h-1.5">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${percentage}%` }}
                                  className="bg-orange-500 h-1.5 rounded-full"
                                />
                              </div>
                              {isVoted && <span className="text-orange-400 text-xs mt-1 block flex items-center gap-1">✓ Votre vote</span>}
                            </button>
                          );
                        })}
                        <p className="text-gray-400 text-xs mt-2 text-center">
                          {totalVotes} vote{totalVotes !== 1 ? 's' : ''}
                          {hasVoted && <span className="text-orange-400 ml-2">• Vous avez voté</span>}
                        </p>
                      </div>
                    );
                  })}
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

      {/* CDC: Modal signaler */}
      {showReportModal && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/50 flex items-end z-50">
          <motion.div initial={{ y: 100 }} animate={{ y: 0 }} className="w-full bg-gray-800 rounded-t-2xl p-4 space-y-3 max-h-[70vh] overflow-y-auto">
            <h3 className="text-white font-bold">Signaler ce live</h3>
            <p className="text-xs text-gray-400">Aidez-nous à maintenir une communauté sûre.</p>
            <div className="space-y-2">
              <label className="text-white text-sm">Raison</label>
              <select
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="w-full bg-gray-700 text-white rounded-lg p-2 text-sm"
              >
                <option value="">Sélectionnez</option>
                <option value="spam">Spam</option>
                <option value="harassment">Harcèlement</option>
                <option value="hate_speech">Discours haineux</option>
                <option value="explicit_content">Contenu explicite</option>
                <option value="misinformation">Désinformation</option>
                <option value="scam">Fraude</option>
                <option value="other">Autre</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-white text-sm">Détails (optionnel)</label>
              <Input
                placeholder="Décrivez le problème..."
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                className="bg-gray-700 text-white"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowReportModal(false)}>Annuler</Button>
              <Button className="flex-1 bg-red-600 hover:bg-red-700" onClick={() => reportMutation.mutate()} disabled={reportMutation.isPending || !reportReason}>
                Signaler
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* CDC: Modal abonnement créateur (don récurrent) */}
      {showSubscribeModal && user?.id !== live?.creator_id && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/50 flex items-end z-50">
          <motion.div initial={{ y: 100 }} animate={{ y: 0 }} className="w-full bg-gray-800 rounded-t-2xl p-4 space-y-3">
            <h3 className="text-white font-bold">S'abonner à {creatorName}</h3>
            <p className="text-xs text-gray-400">Don mensuel récurrent. Min 500 FCFA.</p>
            <div className="flex gap-2">
              {[500, 1000, 2500, 5000].map((a) => (
                <Button key={a} variant="outline" size="sm" onClick={() => setSubscribeAmount(a)} className={subscribeAmount === a ? 'border-amber-500' : ''}>
                  {a.toLocaleString()}
                </Button>
              ))}
            </div>
            <Input
              type="number"
              placeholder="Montant (FCFA)"
              value={subscribeAmount}
              onChange={(e) => setSubscribeAmount(Math.max(500, Number(e.target.value) || 500))}
              min={500}
              className="bg-gray-700 text-white"
            />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowSubscribeModal(false)}>Annuler</Button>
              <Button className="flex-1 bg-amber-600 hover:bg-amber-700" onClick={() => subscribeMutation.mutate()} disabled={subscribeMutation.isPending || subscribeAmount < 500}>
                S'abonner {subscribeAmount.toLocaleString()} FCFA/mois
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* CDC: Modal don direct */}
      {showTipModal && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/50 flex items-end z-50">
          <motion.div initial={{ y: 100 }} animate={{ y: 0 }} className="w-full bg-gray-800 rounded-t-2xl p-4 space-y-3">
            <h3 className="text-white font-bold">Envoyer un don</h3>
            <p className="text-xs text-gray-400">Min 100 - Max 1 000 000 FCFA. Commission 15%.</p>
            <div className="flex gap-2">
              {[100, 500, 1000, 5000, 10000].map((a) => (
                <Button key={a} variant="outline" size="sm" onClick={() => setTipAmount(a)} className={tipAmount === a ? 'border-amber-500' : ''}>
                  {a.toLocaleString()}
                </Button>
              ))}
            </div>
            <Input
              type="number"
              placeholder="Montant (FCFA)"
              value={tipAmount}
              onChange={(e) => setTipAmount(Number(e.target.value) || 100)}
              min={100}
              max={1000000}
              className="bg-gray-700 text-white"
            />
            <Input
              placeholder="Message (optionnel, max 200 car.)"
              value={tipMessage}
              onChange={(e) => setTipMessage(e.target.value.slice(0, 200))}
              className="bg-gray-700 text-white"
            />
            <label className="flex items-center gap-2 text-white text-sm">
              <input type="checkbox" checked={tipAnonymous} onChange={(e) => setTipAnonymous(e.target.checked)} />
              Don anonyme
            </label>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowTipModal(false)}>Annuler</Button>
              <Button className="flex-1 bg-amber-600 hover:bg-amber-700" onClick={() => sendTipMutation.mutate()} disabled={sendTipMutation.isPending || tipAmount < 100}>
                Envoyer {tipAmount.toLocaleString()} FCFA
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}

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

