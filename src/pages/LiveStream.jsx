import React, { useState, useEffect, useRef } from 'react';
import { api } from '@/api/expressClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowLeft, Camera, Radio, Eye, Heart, Mic } from 'lucide-react';
import { toast } from "sonner";
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { motion, AnimatePresence } from 'framer-motion';
import { useAgoraHost } from '@/hooks/useAgora';

const categories = ['gaming', 'music', 'education', 'sports', 'art', 'other'];

export default function LiveStreamPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const _videoRef = useRef(null);
  const localVideoRef = useRef(null);
  const [user, setUser] = useState(null);
  const [step, setStep] = useState('setup'); // 'setup' | 'streaming' | 'ended'
  const [loading, setLoading] = useState(false);

  const [streamData, setStreamData] = useState({
    title: '',
    description: '',
    category: 'other',
    // CDC: tags (max 5) et restriction d'âge, stockés côté UI pour méta (backend pourra les supporter ensuite)
    tags: '',
    ageRestriction: 'all', // all | 13+ | 18+
  });

  const [liveStream, setLiveStream] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [totalDuration, setTotalDuration] = useState(0);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [replayUrl, setReplayUrl] = useState('');
  const durationRef = useRef(null);

  useEffect(() => {
    const getUser = async () => {
      try {
        const u = await api.auth.me();
        setUser(u);
      } catch (_e) {
        navigate(createPageUrl('Home'));
      }
    };
    getUser();
  }, [navigate]);

  const { data: liveData, refetch: refetchLive } = useQuery({
    queryKey: ['live', liveStream?.id],
    queryFn: () => api.live.getById(liveStream.id),
    enabled: !!liveStream?.id && step === 'streaming',
    refetchInterval: 3000,
  });

  const { data: tokenData, isError: tokenError } = useQuery({
    queryKey: ['live-token', liveStream?.id, 'host'],
    queryFn: () => api.live.getStreamToken(liveStream.id, 'host'),
    enabled: !!liveStream?.id && step === 'streaming',
    retry: 1,
  });
  const { data: agoraStatus } = useQuery({
    queryKey: ['live-agora-status'],
    queryFn: () => api.live.getAgoraStatus(),
    enabled: step === 'streaming' && !!liveStream?.id && !!(tokenData && !tokenData?.appId),
  });
  const agoraToken = tokenData?.token != null ? tokenData : null;
  const { localVideoTrack, localAudioTrack, leave: leaveAgora, error: agoraError, audioOnlyMode } = useAgoraHost(agoraToken, localVideoRef);
  const hasAgora = !!(agoraToken?.appId && agoraToken?.channel);
  const agoraDiagnostic = !hasAgora && step === 'streaming'
    ? (tokenError ? 'Backend inaccessible. Lancez : cd backend && npm run dev' : agoraStatus?.message || (tokenData && !tokenData?.appId ? 'Redémarrez le backend (cd backend && npm run dev) après avoir ajouté AGORA_APP_ID et AGORA_APP_CERTIFICATE dans backend/.env' : 'Configurez Agora (backend) pour le flux vidéo réel'))
    : '';

  useEffect(() => {
    if (agoraError && !audioOnlyMode) toast.error(agoraError);
  }, [agoraError, audioOnlyMode]);

  useEffect(() => {
    if (step !== 'streaming' || !liveStream?.id) return;
    const start = Date.now();
    durationRef.current = setInterval(() => {
      setTotalDuration(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => {
      if (durationRef.current) clearInterval(durationRef.current);
    };
  }, [step, liveStream?.id]);

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const startStream = async () => {
    if (!streamData.title.trim()) {
      toast.error('Ajouter un titre au live');
      return;
    }
    setLoading(true);
    try {
      const stream = await api.live.start({
        title: streamData.title,
        description: streamData.description,
        category: streamData.category,
      });
      setLiveStream(stream);
      setStep('streaming');
      toast.success('Live commencé ! 🎉');
    } catch (err) {
      toast.error(err.apiMessage || err.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  const endStreamMutation = useMutation({
    mutationFn: async (options = {}) => {
      await leaveAgora();
      return api.live.end(liveStream?.id, options);
    },
    onSuccess: (stream) => {
      setShowEndConfirm(false);
      setReplayUrl('');
      setStep('ended');
      if (stream) setLiveStream(stream);
      toast.success('Live terminé !');
    },
    onError: (err) => {
      toast.error(err.apiMessage || err.message || 'Erreur');
      setLoading(false);
    },
  });

  const sendChatMutation = useMutation({
    mutationFn: () => api.live.sendChatMessage(liveStream?.id, newComment.trim()),
    onSuccess: () => {
      setNewComment('');
      refetchLive();
    },
    onError: (e) => toast.error(e.response?.data?.error?.message || e.message || 'Erreur'),
  });

  const viewerCount = liveData?.viewers_count ?? 0;
  const totalGifts = liveData?.total_gifts_amount ?? 0;
  const totalLikes = liveData?.total_likes ?? 0;
  const comments = liveData?.chat_messages ?? [];

  const addComment = () => {
    if (!newComment.trim()) return;
    sendChatMutation.mutate();
  };

  if (!user) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="h-screen bg-black flex flex-col">
      <AnimatePresence mode="wait">
        {/* Setup Step */}
        {step === 'setup' && (
          <motion.div
            key="setup"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(createPageUrl('Home'))}
                className="text-white hover:bg-white/10"
              >
                <ArrowLeft className="w-6 h-6" />
              </Button>
              <h1 className="text-white text-lg font-bold">Commencer un Live</h1>
              <div className="w-10" />
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="space-y-4">
                <label className="block text-white font-medium">Titre du live</label>
                <Input
                  placeholder="Ex: Gaming session, Musique..."
                  value={streamData.title}
                  maxLength={100}
                  onChange={(e) => setStreamData(prev => ({ ...prev, title: e.target.value }))}
                  className="bg-gray-900 border-gray-800 text-white placeholder:text-gray-500"
                />
              </div>

              <div className="space-y-4">
                <label className="block text-white font-medium">Description</label>
                <Textarea
                  placeholder="Décrivez votre live..."
                  value={streamData.description}
                  maxLength={500}
                  onChange={(e) => setStreamData(prev => ({ ...prev, description: e.target.value }))}
                  className="bg-gray-900 border-gray-800 text-white placeholder:text-gray-500 h-24"
                />
              </div>

              <div className="space-y-4">
                <label className="block text-white font-medium">Catégorie</label>
                <Select value={streamData.category} onValueChange={(v) => setStreamData(prev => ({ ...prev, category: v }))}>
                  <SelectTrigger className="bg-gray-900 border-gray-800 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat} className="capitalize">{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                <label className="block text-white font-medium">Tags (max 5, séparés par des virgules)</label>
                <Input
                  placeholder="musique, live, bamako..."
                  value={streamData.tags}
                  onChange={(e) => setStreamData(prev => ({ ...prev, tags: e.target.value }))}
                  className="bg-gray-900 border-gray-800 text-white placeholder:text-gray-500"
                />
              </div>

              <div className="space-y-4">
                <label className="block text-white font-medium">Restriction d'âge</label>
                <Select
                  value={streamData.ageRestriction}
                  onValueChange={(v) => setStreamData(prev => ({ ...prev, ageRestriction: v }))}
                >
                  <SelectTrigger className="bg-gray-900 border-gray-800 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tout public</SelectItem>
                    <SelectItem value="13+">13+</SelectItem>
                    <SelectItem value="18+">18+</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                <p className="text-sm text-blue-400">
                  💡 Conseil: Assurez-vous que votre caméra et microphone sont activés avant de commencer.
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-blue-500/50 text-blue-400 hover:bg-blue-500/20"
                    onClick={async () => {
                      try {
                        const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                        s.getTracks().forEach((t) => t.stop());
                        toast.success('Caméra et micro OK');
                      } catch (e) {
                        toast.error('Activez caméra/micro dans les paramètres du navigateur.');
                      }
                    }}
                  >
                    Vérifier accès caméra
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-amber-500/50 text-amber-400 hover:bg-amber-500/20"
                    onClick={async () => {
                      try {
                        const status = await api.live.getAgoraStatus();
                        if (status?.configured) {
                          toast.success('Connexion Agora OK – Prêt pour le live');
                        } else {
                          toast.error(status?.message || 'Agora non configuré. Vérifiez le backend.');
                        }
                      } catch (e) {
                        toast.error('Backend inaccessible ou Agora non configuré.');
                      }
                    }}
                  >
                    Test connexion Agora
                  </Button>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-800">
              <Button
                onClick={startStream}
                disabled={loading || !streamData.title.trim()}
                className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white h-12 rounded-xl flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Radio className="w-5 h-5" />
                    Commencer le Live
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        )}

        {/* Streaming Step */}
        {step === 'streaming' && (
          <motion.div
            key="streaming"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col"
          >
            {/* Video area: flux Agora si token disponible, sinon placeholder */}
            <div className="flex-1 bg-gradient-to-br from-gray-900 to-black relative overflow-hidden">
              {hasAgora ? (
                <>
                  <div ref={localVideoRef} className="absolute inset-0 w-full h-full bg-black object-contain [&>video]:object-contain [&>video]:w-full [&>video]:h-full" />
                  {!localVideoTrack && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                      <div className="text-center text-white">
                        {audioOnlyMode ? (
                          <>
                            <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-4">
                              <Mic className="w-8 h-8 text-amber-400" />
                            </div>
                            <p className="font-medium text-amber-300">Diffusion audio uniquement</p>
                            <p className="text-sm text-gray-400 mt-1">Caméra non disponible. Le micro fonctionne.</p>
                          </>
                        ) : agoraError ? (
                          <>
                            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                              <Camera className="w-8 h-8 text-red-400" />
                            </div>
                            <p className="font-medium text-red-300">Caméra/micro : {agoraError}</p>
                            <p className="text-sm text-gray-400 mt-2">Vérifiez : permissions navigateur, caméra branchée, essayez Chrome.</p>
                          </>
                        ) : (
                          <>
                            <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                            <p className="font-medium">Préparation de la caméra...</p>
                        <p className="text-sm text-gray-400 mt-1">Autorisez l’accès caméra et micro si demandé</p>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center mx-auto mb-4 animate-pulse">
                      <Camera className="w-12 h-12 text-white" />
                    </div>
                    <p className="text-white font-bold">{streamData.title}</p>
                    <p className="text-gray-400 text-sm mt-2">{agoraDiagnostic}</p>
                  </div>
                </div>
              )}

              {/* Top overlay */}
              <div className="absolute top-0 left-0 right-0 p-4 z-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 bg-red-500 px-3 py-1 rounded-full">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    <span className="text-white font-bold text-sm">LIVE</span>
                  </div>
                  <div className="text-white text-sm font-medium">{formatDuration(totalDuration)}</div>
                </div>
              </div>

              {/* Comments */}
              <div className="absolute bottom-32 left-4 right-4 z-10 space-y-2 max-h-40 overflow-y-auto">
                {comments.filter((c) => !c.is_deleted).slice(-20).reverse().map((comment) => (
                  <motion.div
                    key={comment.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-black/50 backdrop-blur rounded-full px-3 py-1 w-fit text-xs"
                  >
                    <span className="text-orange-400 font-medium">{comment.sender_name}:</span>
                    <span className="text-white ml-1">{comment.message}</span>
                  </motion.div>
                ))}
              </div>

              {/* Bottom controls */}
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black to-transparent z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex gap-2">
                    <div className="flex items-center gap-1 bg-black/50 px-3 py-1 rounded-full">
                      <Eye className="w-4 h-4 text-white" />
                      <span className="text-white text-sm font-medium">{viewerCount}</span>
                    </div>
                    <div className="flex items-center gap-1 bg-black/50 px-3 py-1 rounded-full">
                      <Heart className="w-4 h-4 text-red-500" />
                      <span className="text-white text-sm font-medium">{totalLikes}</span>
                    </div>
                    <div className="flex items-center gap-1 bg-black/50 px-3 py-1 rounded-full text-amber-400 text-sm">
                      {Number(totalGifts).toLocaleString()} FCFA
                    </div>
                  </div>
                  <Button
                    onClick={() => setShowEndConfirm(true)}
                    disabled={endStreamMutation.isPending}
                    className="bg-red-600 hover:bg-red-700 text-white rounded-full px-6"
                  >
                    Terminer
                  </Button>
                </div>

                {/* Comment input */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Votre commentaire..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addComment()}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50 rounded-full"
                  />
                  <Button
                    onClick={addComment}
                    className="bg-orange-500 hover:bg-orange-600 text-white rounded-full px-4"
                  >
                    Envoyer
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Confirmation fin de live + option replay */}
        {showEndConfirm && (
          <div className="absolute inset-0 z-20 bg-black/80 flex items-center justify-center p-4">
            <div className="bg-gray-900 rounded-2xl p-6 max-w-sm w-full space-y-4">
              <h3 className="text-lg font-bold text-white">Terminer le live ?</h3>
              <Input
                placeholder="URL du replay (optionnel)"
                value={replayUrl}
                onChange={(e) => setReplayUrl(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
              />
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowEndConfirm(false)}>
                  Annuler
                </Button>
                <Button
                  className="flex-1 bg-red-600 hover:bg-red-700"
                  disabled={endStreamMutation.isPending}
                  onClick={() => endStreamMutation.mutate(replayUrl.trim() ? { replay_url: replayUrl.trim() } : {})}
                >
                  {endStreamMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Terminer'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Ended Step */}
        {step === 'ended' && (
          <motion.div
            key="ended"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col items-center justify-center p-6"
          >
            <div className="text-center space-y-6 max-w-sm">
              <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
                <span className="text-4xl">✓</span>
              </div>
              
              <h1 className="text-2xl font-bold text-white">Live terminé !</h1>
              
              <div className="bg-gray-900 rounded-2xl p-6 space-y-3 text-left">
                <div className="flex justify-between">
                  <span className="text-gray-400">Spectateurs</span>
                  <span className="text-white font-semibold">{liveStream?.viewers_count ?? viewerCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Durée</span>
                  <span className="text-white font-semibold">{liveStream?.duration_minutes != null ? `${liveStream.duration_minutes} min` : formatDuration(totalDuration)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Cadeaux reçus</span>
                  <span className="text-white font-semibold">{Number(liveStream?.total_gifts_amount ?? totalGifts).toLocaleString()} FCFA</span>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => navigate(createPageUrl('Home'))}
                  variant="outline"
                  className="flex-1 rounded-xl"
                >
                  Accueil
                </Button>
                <Button
                  onClick={() => {
                    setStep('setup');
                    setStreamData({ title: '', description: '', category: 'other' });
                    setLiveStream(null);
                    setTotalDuration(0);
                  }}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white rounded-xl"
                >
                  Nouveau Live
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

