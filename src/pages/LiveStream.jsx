import React, { useState, useEffect, useRef } from 'react';
import { api } from '@/api/expressClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowLeft, Camera, Radio, Eye, Heart, Mic, Sparkles, MessageSquare, Users, BarChart3, X, Music, Monitor, TrendingUp, Volume2, VolumeX, Gift } from 'lucide-react';
import { toast } from "sonner";
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { motion, AnimatePresence } from 'framer-motion';
import { useAgoraHost } from '@/hooks/useAgora';
import { useLiveSocket } from '@/hooks/useLiveSocket';
import LiveAnalytics from '@/components/live/LiveAnalytics';

const categories = ['gaming', 'music', 'education', 'sports', 'art', 'other'];

export default function LiveStreamPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const streamIdFromUrl = searchParams.get('id');
  const queryClient = useQueryClient();
  const _videoRef = useRef(null);
  const localVideoRef = useRef(null);
  const previewVideoRef = useRef(null);
  const [user, setUser] = useState(null);
  const [step, setStep] = useState('setup'); // 'setup' | 'streaming' | 'ended'
  const [loading, setLoading] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(!!streamIdFromUrl);
  const [previewStream, setPreviewStream] = useState(null);

  const [streamData, setStreamData] = useState({
    title: '',
    description: '',
    category: 'other',
    // CDC: tags (max 5) et restriction d'âge, stockés côté UI pour méta (backend pourra les supporter ensuite)
    tags: '',
    ageRestriction: 'all', // all | 13+ | 18+
    goalAmount: 10000, // Objectif de dons en FCFA
  });

  const [liveStream, setLiveStream] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [totalDuration, setTotalDuration] = useState(0);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [replayUrl, setReplayUrl] = useState('');
  const [goalAmount, setGoalAmount] = useState(10000); // Objectif par défaut: 10,000 FCFA
  const [topSupporters, setTopSupporters] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState('normal'); // Filtre beauté actuel
  const [showFilters, setShowFilters] = useState(false);
  const [showQA, setShowQA] = useState(false);
  const [showPolls, setShowPolls] = useState(false);
  const [showCoHost, setShowCoHost] = useState(false);
  const [showMusic, setShowMusic] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showGiftsPanel, setShowGiftsPanel] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [polls, setPolls] = useState([]);
  const [backgroundMusic, setBackgroundMusic] = useState(null);
  const [musicVolume, setMusicVolume] = useState(0.3);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenShareTrack, setScreenShareTrack] = useState(null);
  const musicAudioRef = useRef(null);
  const durationRef = useRef(null);
  const clientRef = useRef(null);
  const autoStartedFromParamsRef = useRef(false);
  
  // Musiques de fond disponibles - charger depuis la config
  const [backgroundMusicTracks, setBackgroundMusicTracks] = useState([
    { id: 'none', name: 'Aucune', url: null },
  ]);

  useEffect(() => {
    // Charger la configuration des musiques
    fetch('/music/music-config.json')
      .then(res => res.json())
      .then(data => {
        if (data.tracks) {
          setBackgroundMusicTracks(data.tracks);
          if (data.defaultVolume !== undefined) {
            setMusicVolume(data.defaultVolume);
          }
        }
      })
      .catch(() => {
        // Fallback si le fichier n'existe pas
        setBackgroundMusicTracks([
          { id: 'none', name: 'Aucune', url: null },
          { id: 'ambient1', name: 'Ambient Chill', url: '/music/ambient-chill.mp3' },
          { id: 'ambient2', name: 'Upbeat Energy', url: '/music/upbeat-energy.mp3' },
          { id: 'ambient3', name: 'Relaxing Vibes', url: '/music/relaxing-vibes.mp3' },
        ]);
      });
  }, []);
  
  // Filtres beauté disponibles
  const beautyFilters = [
    { id: 'normal', name: 'Normal', filter: 'none' },
    { id: 'smooth', name: 'Lisse', filter: 'blur(0.5px) brightness(1.1)' },
    { id: 'bright', name: 'Lumineux', filter: 'brightness(1.2) contrast(1.1)' },
    { id: 'warm', name: 'Chaud', filter: 'sepia(20%) saturate(1.2) brightness(1.1)' },
    { id: 'cool', name: 'Froid', filter: 'hue-rotate(-10deg) saturate(0.9)' },
    { id: 'vintage', name: 'Vintage', filter: 'sepia(40%) saturate(1.2) hue-rotate(-20deg)' },
  ];

  useEffect(() => {
    const getUser = async () => {
      try {
        const u = await api.auth.me();
        setUser(u);
      } catch (e) {
        const status = e?.response?.status;
        // Ne renvoyer à l'accueil que si l'utilisateur n'est vraiment pas connecté.
        if (status === 401) {
          navigate(createPageUrl('Home'));
        } else {
          // Pour les erreurs 5xx ou réseau, on reste sur la page Live
          // afin de ne pas "casser" le flux quand l'utilisateur est déjà loggé.
          setUser(null);
        }
      }
    };
    getUser();
  }, [navigate]);

  // Prévisualisation caméra dans le setup
  useEffect(() => {
    if (step !== 'setup' || !previewVideoRef.current) return;
    
    let stream = null;
    navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      .then((s) => {
        stream = s;
        setPreviewStream(s);
        if (previewVideoRef.current) {
          previewVideoRef.current.srcObject = s;
        }
      })
      .catch((err) => {
        console.log('Preview caméra non disponible:', err);
      });

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setPreviewStream(null);
      }
      if (previewVideoRef.current) {
        previewVideoRef.current.srcObject = null;
      }
    };
  }, [step]);

  // Charger un stream existant (ex: live programmé démarré depuis Lives)
  useEffect(() => {
    if (!streamIdFromUrl || !user?.id) return;
    const loadExisting = async () => {
      try {
        let stream = await api.live.getById(streamIdFromUrl);
        if (!stream) {
          toast.error('Stream introuvable');
          navigate(createPageUrl('Lives'));
          return;
        }
        if (stream.creator_id !== user.id) {
          toast.error('Vous n\'êtes pas le créateur de ce live');
          navigate(createPageUrl('Lives'));
          return;
        }
        if (stream.status === 'scheduled') {
          await api.live.startScheduled(streamIdFromUrl);
          stream = await api.live.getById(streamIdFromUrl);
        }
        if (stream.status === 'live') {
          setLiveStream(stream);
          setStreamData((prev) => ({
            ...prev,
            title: stream.title || prev.title,
            description: stream.description || prev.description,
            category: stream.category || prev.category,
          }));
          setStep('streaming');
          toast.success('Live chargé !');
        } else if (stream.status === 'ended') {
          toast.error('Ce live est déjà terminé');
          navigate(createPageUrl('Lives'));
        }
      } catch (err) {
        toast.error(err?.apiMessage || err?.message || 'Erreur');
        navigate(createPageUrl('Lives'));
      } finally {
        setLoadingExisting(false);
      }
    };
    loadExisting();
  }, [streamIdFromUrl, user?.id, navigate]);

  // Préremplir depuis la page "Lancer un Live" (StartLive) via query params
  useEffect(() => {
    if (streamIdFromUrl) return;
    const title = searchParams.get('title');
    const category = searchParams.get('category');
    const description = searchParams.get('description');
    const goal = searchParams.get('goal');
    if (title || category || description || goal) {
      setStreamData((prev) => ({
        ...prev,
        ...(title != null && title !== '' && { title: decodeURIComponent(title) }),
        ...(category != null && category !== '' && { category }),
        ...(description != null && description !== '' && { description: decodeURIComponent(description) }),
        ...(goal != null && goal !== '' && !isNaN(Number(goal)) && { goalAmount: Number(goal) }),
      }));
    }
  }, [streamIdFromUrl]);  

  // Depuis StartLive : démarrer le live directement (pas d'écran "Aperçu caméra"), aller à l'interface streaming (capture 3)
  useEffect(() => {
    if (streamIdFromUrl || !user || autoStartedFromParamsRef.current || step !== 'setup') return;
    const title = searchParams.get('title');
    if (!title || title.trim() === '') return;
    autoStartedFromParamsRef.current = true;
    setLoading(true);
    const category = searchParams.get('category') || 'other';
    const description = searchParams.get('description') || '';
    const goal = searchParams.get('goal');
    const goalTarget = goal && !isNaN(Number(goal)) ? Number(goal) : 10000;
    api.live.start({
      title: decodeURIComponent(title.trim()),
      description: description ? decodeURIComponent(description) : undefined,
      category,
      goal_target: goalTarget > 0 ? goalTarget : undefined,
    })
      .then((stream) => {
        setLiveStream(stream);
        setGoalAmount(stream.goal_target || goalTarget || 10000);
        setStep('streaming');
        toast.success('Live commencé!');
      })
      .catch((err) => {
        autoStartedFromParamsRef.current = false;
        toast.error(err?.apiMessage || err?.message || 'Erreur au démarrage du live');
      })
      .finally(() => setLoading(false));
  }, [streamIdFromUrl, user?.id, step, searchParams]);

  const { data: liveData, refetch: refetchLive } = useQuery({
    queryKey: ['live', liveStream?.id],
    queryFn: () => api.live.getById(liveStream.id),
    enabled: !!liveStream?.id && step === 'streaming',
    refetchInterval: 3000,
  });

  // Récupérer les polls actifs (avec votes utilisateur si connecté)
  const { data: activePolls = [] } = useQuery({
    queryKey: ['live-polls', liveStream?.id, user?.id],
    queryFn: () => api.live.getPolls(liveStream.id),
    enabled: !!liveStream?.id && step === 'streaming',
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (activePolls && activePolls.length > 0) {
      setPolls(activePolls.map(poll => ({
        id: poll.id,
        question: poll.question,
        options: poll.options || [],
        totalVotes: poll.total_votes || 0,
        liveId: poll.live_id,
        status: poll.status,
        userVote: poll.userVote ?? null // Vote de l'utilisateur
      })));
    }
  }, [activePolls]);

  // Écouter les événements WebSocket pour les polls
  useLiveSocket({
    streamId: liveStream?.id,
    userId: user?.id,
    onPollCreated: (poll) => {
      setPolls(prev => [...prev, {
        id: poll.id,
        question: poll.question,
        options: poll.options || [],
        totalVotes: poll.total_votes || 0,
        liveId: poll.live_id,
        status: poll.status,
        userVote: poll.userVote ?? null
      }]);
      // Rafraîchir les polls pour récupérer le vote utilisateur
      queryClient.invalidateQueries({ queryKey: ['live-polls', liveStream?.id] });
    },
    onPollUpdated: (poll) => {
      setPolls(prev => prev.map(p => 
        p.id === poll.id ? {
          ...p,
          options: poll.options || p.options,
          totalVotes: poll.total_votes || p.totalVotes,
          userVote: poll.userVote ?? p.userVote
        } : p
      ));
      // Rafraîchir les polls pour récupérer le vote utilisateur
      queryClient.invalidateQueries({ queryKey: ['live-polls', liveStream?.id] });
    },
    onPollEnded: (poll) => {
      setPolls(prev => prev.filter(p => p.id !== poll.id));
    },
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
  const { localVideoTrack, localAudioTrack, leave: leaveAgora, error: agoraError, audioOnlyMode, retry: retryAgora } = useAgoraHost(agoraToken, localVideoRef);
  const hasAgora = !!(agoraToken?.appId && agoraToken?.channel);

  // Récupérer la référence au client Agora depuis le hook (nécessite modification du hook)
  // Pour l'instant, on va créer le client directement dans startScreenShare

  // Gestion de la musique de fond
  useEffect(() => {
    if (!backgroundMusic || !musicAudioRef.current || step !== 'streaming') return;
    
    const audio = musicAudioRef.current;
    audio.src = backgroundMusic.url;
    audio.volume = musicVolume;
    audio.loop = true;
    
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(err => {
        console.warn('Musique de fond non jouée:', err);
      });
    }

    return () => {
      audio.pause();
      audio.src = '';
    };
  }, [backgroundMusic, musicVolume, step]);

  // Partage d'écran avec gestion d'erreurs améliorée
  const startScreenShare = async () => {
    try {
      // Vérifier si le navigateur supporte le screen sharing
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        toast.error('Partage d\'écran non supporté sur ce navigateur');
        return;
      }

      const RTC = await import('agora-rtc-sdk-ng').then(m => m.default);
      
      // Créer le track de partage d'écran avec options
      const screenTrack = await RTC.createScreenVideoTrack({
        encoderConfig: {
          width: 1920,
          height: 1080,
          frameRate: 30,
          bitrate: 2000,
        },
      }, 'auto');
      
      setScreenShareTrack(screenTrack);
      
      // Désactiver la caméra locale
      if (localVideoTrack) {
        await localVideoTrack.setEnabled(false);
      }
      
      // Note: Le track sera automatiquement publié via le hook useAgoraHost
      // Si besoin de publier manuellement, il faudrait exposer le client depuis le hook
      
      // Afficher dans le conteneur
      const container = localVideoRef?.current;
      if (container) {
        screenTrack.play(container);
      }
      
      // Gérer l'arrêt du partage d'écran par l'utilisateur
      screenTrack.on('track-ended', () => {
        stopScreenShare();
      });
      
      setIsScreenSharing(true);
      toast.success('Partage d\'écran activé');
    } catch (err) {
      console.error('Erreur partage d\'écran:', err);
      let errorMessage = 'Erreur partage d\'écran';
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMessage = 'Permission de partage d\'écran refusée. Veuillez autoriser l\'accès.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMessage = 'Aucun écran disponible pour le partage';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errorMessage = 'Impossible d\'accéder à l\'écran. Vérifiez les autres applications.';
      } else if (err.message) {
        errorMessage = `Erreur: ${err.message}`;
      }
      
      toast.error(errorMessage);
      setIsScreenSharing(false);
    }
  };

  const stopScreenShare = async () => {
    try {
      const client = clientRef?.current;
      
      // Unpublish le track de partage d'écran
      if (client && screenShareTrack) {
        await client.unpublish([screenShareTrack]).catch(() => {});
      }
      
      // Fermer le track
      if (screenShareTrack) {
        screenShareTrack.close();
        setScreenShareTrack(null);
      }
      
      // Réactiver la caméra locale
      if (localVideoTrack) {
        await localVideoTrack.setEnabled(true);
        const container = localVideoRef?.current;
        if (container) {
          localVideoTrack.play(container, { mirror: true });
        }
      }
      
      setIsScreenSharing(false);
      toast.info('Partage d\'écran désactivé');
    } catch (err) {
      console.error('Erreur arrêt partage d\'écran:', err);
      setIsScreenSharing(false);
    }
  };
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
        goal_target: streamData.goalAmount && streamData.goalAmount > 0 ? streamData.goalAmount : undefined,
      });
      setLiveStream(stream);
      setGoalAmount(stream.goal_target || streamData.goalAmount || 0); // Définir l'objectif depuis le stream ou le formulaire
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
    mutationFn: () => {
      const message = newComment.trim();
      // Détecter si c'est une question (contient "?")
      const isQuestion = message.includes('?');
      return api.live.sendChatMessage(liveStream?.id, message);
    },
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
  
  // Récupérer l'objectif depuis le stream si disponible
  useEffect(() => {
    if (liveData?.goal_target && liveData.goal_target > 0) {
      setGoalAmount(liveData.goal_target);
    }
  }, [liveData?.goal_target]);
  
  // Calculer les top supporters depuis les messages de gifts/tips
  useEffect(() => {
    if (!liveData?.chat_messages) return;
    const supporterMap = new Map();
    
    liveData.chat_messages.forEach((msg) => {
      if (msg.message_type === 'gift' || msg.message_type === 'tip') {
        const senderId = msg.sender_id || msg.user_id;
        const senderName = msg.sender_name || 'Anonyme';
        const amount = msg.amount || 0;
        
        if (supporterMap.has(senderId)) {
          supporterMap.set(senderId, {
            id: senderId,
            name: senderName,
            avatar: msg.sender_avatar,
            total: supporterMap.get(senderId).total + amount,
            count: supporterMap.get(senderId).count + 1
          });
        } else {
          supporterMap.set(senderId, {
            id: senderId,
            name: senderName,
            avatar: msg.sender_avatar,
            total: amount,
            count: 1
          });
        }
      }
    });
    
    const supporters = Array.from(supporterMap.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
    
    setTopSupporters(supporters);
  }, [liveData?.chat_messages]);

  // Détecter les questions dans le chat (messages contenant "?")
  useEffect(() => {
    if (!liveData?.chat_messages) return;
    const detectedQuestions = liveData.chat_messages
      .filter((msg) => {
        const text = (msg.message || '').trim();
        return text.includes('?') && msg.message_type !== 'gift' && msg.message_type !== 'tip' && !msg.is_deleted;
      })
      .map((msg) => ({
        id: msg.id,
        sender: msg.sender_name || 'Anonyme',
        question: msg.message,
        answered: msg.is_answered || false,
        created_at: msg.created_at || msg.created_date,
      }))
      .slice(-20) // Garder les 20 dernières questions
      .reverse();
    
    setQuestions(detectedQuestions);
  }, [liveData?.chat_messages]);
  
  const goalProgress = goalAmount > 0 ? Math.min((totalGifts / goalAmount) * 100, 100) : 0;

  const addComment = () => {
    if (!newComment.trim()) return;
    sendChatMutation.mutate();
  };

  // Si on charge un live existant (depuis un lien avec id), afficher un loader.
  // Ne bloque pas l'écran si /auth/me renvoie 500 : l'API live renverra 401 si l'utilisateur n'est vraiment pas connecté.
  if (loadingExisting) {
    return (
      <div className="h-[100dvh] flex items-center justify-center bg-black">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  // Démarrage auto depuis StartLive : afficher le loader jusqu'à passage en streaming (pas l'écran "Aperçu caméra")
  if (loading && searchParams.get('title') && !streamIdFromUrl && step === 'setup') {
    return (
      <div className="h-[100dvh] flex flex-col items-center justify-center bg-black gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
        <p className="text-white font-medium">Démarrage du live...</p>
        <p className="text-sm text-gray-400">Préparation de la diffusion</p>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] bg-black flex flex-col">
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
              {/* Prévisualisation caméra */}
              <div className="space-y-2">
                <label className="block text-white font-medium">Aperçu caméra</label>
                <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden border-2 border-gray-700">
                  {previewStream ? (
                    <video
                      ref={previewVideoRef}
                      autoPlay
                      muted
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-center">
                        <Camera className="w-12 h-12 text-gray-500 mx-auto mb-2" />
                        <p className="text-gray-400 text-sm">Autorisez l'accès à la caméra</p>
                      </div>
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-400">Vérifiez que votre caméra fonctionne correctement</p>
              </div>

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

              <div className="space-y-4">
                <label className="block text-white font-medium">
                  Objectif de dons (FCFA) <span className="text-gray-400 text-xs">(optionnel)</span>
                </label>
                <Input
                  type="number"
                  placeholder="Ex: 10000"
                  value={streamData.goalAmount || ''}
                  onChange={(e) => setStreamData(prev => ({ ...prev, goalAmount: parseInt(e.target.value) || 0 }))}
                  className="bg-gray-900 border-gray-800 text-white placeholder:text-gray-500"
                  min="0"
                />
                <p className="text-xs text-gray-400">
                  Définissez un objectif de dons pour motiver votre audience. Laissez vide pour désactiver.
                </p>
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
                  <div 
                    ref={localVideoRef} 
                    className="absolute inset-0 w-full h-full bg-black object-contain [&>video]:object-contain [&>video]:w-full [&>video]:h-full transition-all duration-300"
                    style={{ 
                      filter: beautyFilters.find(f => f.id === selectedFilter)?.filter || 'none'
                    }}
                  />
                  {!localVideoTrack && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/70">
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
                            <p className="font-medium text-red-300">Caméra ou micro introuvable</p>
                            <p className="text-sm text-gray-400 mt-2 max-w-xs mx-auto">
                              Vérifiez les permissions du navigateur, branchez une caméra, ou essayez Chrome.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  retryAgora?.();
                                }}
                                className="px-6 py-3 rounded-lg border-2 border-white/50 bg-white/10 text-white font-medium hover:bg-white/20 transition-colors"
                              >
                                Réessayer
                              </button>
                              <button
                                type="button"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  await leaveAgora();
                                  try {
                                    if (liveStream?.id) await api.live.end(liveStream.id);
                                  } catch (_e) {}
                                  navigate(createPageUrl('Lives'));
                                }}
                                className="px-6 py-3 rounded-lg border-2 border-blue-500 bg-blue-500/20 text-blue-200 font-medium hover:bg-blue-500/30 transition-colors"
                              >
                                Retour
                              </button>
                            </div>
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
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center mx-auto mb-4 animate-pulse">
                      <Camera className="w-12 h-12 text-white" />
                    </div>
                    <p className="text-white font-bold">{streamData.title}</p>
                    <p className="text-gray-400 text-sm mt-2">{agoraDiagnostic}</p>
                  </div>
                </div>
              )}

              {/* Top overlay */}
              <div className="absolute top-0 left-0 right-0 p-4 z-10">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 bg-red-500 px-3 py-1 rounded-full">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    <span className="text-white font-bold text-sm">LIVE</span>
                  </div>
                  <div className="text-white text-sm font-medium">{formatDuration(totalDuration)}</div>
                </div>
                
                {/* Goals (Objectifs de dons) */}
                {goalAmount > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-black/70 backdrop-blur rounded-lg p-3 mb-2"
                  >
                    <div className="flex justify-between items-center text-white text-xs mb-1">
                      <span className="font-medium">Objectif: {goalAmount.toLocaleString()} FCFA</span>
                      <span className="text-blue-400 font-semibold">
                        {totalGifts.toLocaleString()} / {goalAmount.toLocaleString()}
                      </span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${goalProgress}%` }}
                        transition={{ duration: 0.5 }}
                        className={`h-full rounded-full ${
                          goalProgress >= 100 
                            ? 'bg-gradient-to-r from-green-500 to-emerald-500' 
                            : 'bg-gradient-to-r from-blue-500 to-indigo-500'
                        }`}
                      />
                    </div>
                    {goalProgress >= 100 && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-green-400 text-xs font-bold mt-1 text-center"
                      >
                        🎉 Objectif atteint !
                      </motion.p>
                    )}
                  </motion.div>
                )}
              </div>
              
              {/* Leaderboard Top Supporters */}
              {topSupporters.length > 0 && (
                <div className="absolute top-24 right-4 z-10 bg-black/80 backdrop-blur rounded-xl p-3 min-w-[200px] max-h-[300px] overflow-y-auto">
                  <h4 className="text-white font-bold text-sm mb-2 flex items-center gap-2">
                    <span className="text-yellow-400">🏆</span> Top Supporters
                  </h4>
                  <div className="space-y-2">
                    {topSupporters.map((supporter, idx) => (
                      <motion.div
                        key={supporter.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="flex items-center gap-2 text-white text-xs"
                      >
                        <span className={`font-bold ${
                          idx === 0 ? 'text-yellow-400' : 
                          idx === 1 ? 'text-gray-300' : 
                          idx === 2 ? 'text-blue-400' : 
                          'text-gray-400'
                        }`}>
                          #{idx + 1}
                        </span>
                        <span className="flex-1 truncate">{supporter.name}</span>
                        <span className="text-blue-400 font-semibold">
                          {supporter.total.toLocaleString()} FCFA
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Comments */}
              <div className="absolute bottom-32 left-4 right-4 z-10 space-y-2 max-h-40 overflow-y-auto">
                {comments.filter((c) => !c.is_deleted).slice(-20).reverse().map((comment) => (
                  <motion.div
                    key={comment.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-black/50 backdrop-blur rounded-full px-3 py-1 w-fit text-xs"
                  >
                    <span className="text-blue-400 font-medium">{comment.sender_name}:</span>
                    <span className="text-white ml-1">{comment.message}</span>
                  </motion.div>
                ))}
              </div>

              {/* Side controls - Filtres, Q&A, Polls, Co-host, Musique, Partage écran, Analytics */}
              <div className="absolute left-4 bottom-32 z-10 flex flex-col gap-2">
                <Button
                  onClick={() => setShowFilters(!showFilters)}
                  size="icon"
                  className="bg-black/70 hover:bg-black/90 text-white rounded-full h-10 w-10"
                  title="Filtres beauté"
                >
                  <Sparkles className="w-5 h-5" />
                </Button>
                <Button
                  onClick={() => setShowQA(!showQA)}
                  size="icon"
                  className="bg-black/70 hover:bg-black/90 text-white rounded-full h-10 w-10"
                  title="Q&A"
                >
                  <MessageSquare className="w-5 h-5" />
                </Button>
                <Button
                  onClick={() => setShowPolls(!showPolls)}
                  size="icon"
                  className="bg-black/70 hover:bg-black/90 text-white rounded-full h-10 w-10"
                  title="Sondages"
                >
                  <BarChart3 className="w-5 h-5" />
                </Button>
                <Button
                  onClick={() => setShowCoHost(!showCoHost)}
                  size="icon"
                  className="bg-black/70 hover:bg-black/90 text-white rounded-full h-10 w-10"
                  title="Inviter un invité"
                >
                  <Users className="w-5 h-5" />
                </Button>
                <Button
                  onClick={() => setShowMusic(!showMusic)}
                  size="icon"
                  className={`bg-black/70 hover:bg-black/90 text-white rounded-full h-10 w-10 ${backgroundMusic ? 'bg-blue-500/50' : ''}`}
                  title="Musique de fond"
                >
                  <Music className="w-5 h-5" />
                </Button>
                <Button
                  onClick={isScreenSharing ? stopScreenShare : startScreenShare}
                  size="icon"
                  className={`bg-black/70 hover:bg-black/90 text-white rounded-full h-10 w-10 ${isScreenSharing ? 'bg-green-500/50' : ''}`}
                  title="Partage d'écran"
                >
                  <Monitor className="w-5 h-5" />
                </Button>
                <Button
                  onClick={() => setShowAnalytics(!showAnalytics)}
                  size="icon"
                  className="bg-black/70 hover:bg-black/90 text-white rounded-full h-10 w-10"
                  title="Analytics"
                >
                  <TrendingUp className="w-5 h-5" />
                </Button>
                <Button
                  onClick={() => setShowGiftsPanel(!showGiftsPanel)}
                  size="icon"
                  className="bg-gradient-to-b from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-full h-10 w-10 border-2 border-blue-400/50 shadow-lg"
                  title="Cadeaux reçus"
                >
                  <Gift className="w-5 h-5" />
                </Button>
              </div>

              {/* Bouton Cadeaux flottant à droite (visible comme sur les captures) */}
              <div className="absolute right-4 top-1/2 -translate-y-1/2 z-10">
                <Button
                  onClick={() => setShowGiftsPanel(!showGiftsPanel)}
                  size="icon"
                  className="h-14 w-14 rounded-full bg-gradient-to-b from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white border-2 border-blue-400/50 shadow-xl"
                  title="Cadeaux reçus"
                >
                  <Gift className="w-7 h-7" />
                </Button>
              </div>

              {/* Panneau Cadeaux reçus */}
              {showGiftsPanel && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="fixed inset-x-0 bottom-0 top-auto max-h-[70vh] flex flex-col z-[100] bg-gray-900/98 backdrop-blur rounded-t-2xl border border-gray-700 border-b-0 shadow-2xl"
                >
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
                    <span className="text-sm font-semibold text-white flex items-center gap-2">
                      <Gift className="w-5 h-5 text-blue-400" />
                      Cadeaux reçus
                    </span>
                    <button type="button" onClick={() => setShowGiftsPanel(false)} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700" aria-label="Fermer">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3 bg-blue-600/20 border-b border-blue-500/30">
                    <span className="text-sm text-gray-300">Total reçu</span>
                    <span className="text-lg font-bold text-white">{Number(totalGifts).toLocaleString()} FCFA</span>
                  </div>
                  <p className="text-xs text-gray-400 px-4 py-2">Les spectateurs envoient des cadeaux (Basique, Premium, Luxe, Légendaire) depuis l'écran de visionnage.</p>
                  {topSupporters.length > 0 ? (
                    <div className="flex-1 overflow-y-auto p-4">
                      <h4 className="text-white font-bold text-sm mb-3">🏆 Top supporters</h4>
                      <div className="space-y-2">
                        {topSupporters.map((supporter, idx) => (
                          <div key={supporter.id} className="flex items-center justify-between bg-gray-800/80 rounded-lg px-3 py-2">
                            <span className={`font-bold text-sm ${idx === 0 ? 'text-amber-400' : idx === 1 ? 'text-gray-300' : idx === 2 ? 'text-blue-400' : 'text-gray-400'}`}>#{idx + 1} {supporter.name}</span>
                            <span className="text-blue-400 font-semibold text-sm">{supporter.total.toLocaleString()} FCFA</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center p-6 text-center">
                      <p className="text-gray-500 text-sm">Aucun cadeau reçu pour le moment.</p>
                      <p className="text-gray-600 text-xs mt-1">Les spectateurs verront l'icône Cadeaux sur l'écran de visionnage.</p>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Audio pour musique de fond */}
              <audio ref={musicAudioRef} />

              {/* Panneau Musique de fond */}
              {showMusic && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="absolute left-20 bottom-32 bg-black/90 backdrop-blur rounded-xl p-4 z-20 min-w-[250px]"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-white font-bold text-sm flex items-center gap-2">
                      <Music className="w-4 h-4" />
                      Musique de fond
                    </h4>
                    <button onClick={() => setShowMusic(false)} className="text-gray-400 hover:text-white">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="space-y-2 mb-3">
                    {backgroundMusicTracks.map((track) => (
                      <button
                        key={track.id}
                        onClick={() => {
                          setBackgroundMusic(track.id === 'none' ? null : track);
                          setShowMusic(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all ${
                          (backgroundMusic?.id === track.id) || (!backgroundMusic && track.id === 'none')
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                        }`}
                      >
                        {track.name}
                      </button>
                    ))}
                  </div>
                  {backgroundMusic && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <VolumeX className="w-4 h-4 text-gray-400" />
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={musicVolume}
                          onChange={(e) => setMusicVolume(parseFloat(e.target.value))}
                          className="flex-1"
                        />
                        <Volume2 className="w-4 h-4 text-gray-400" />
                      </div>
                      <p className="text-gray-400 text-xs text-center">
                        Volume: {Math.round(musicVolume * 100)}%
                      </p>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Panneau Analytics */}
              {showAnalytics && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="absolute left-20 bottom-32 bg-black/90 backdrop-blur rounded-xl p-4 z-20 min-w-[400px] max-h-[500px] overflow-y-auto"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-white font-bold text-sm flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      Analytics
                    </h4>
                    <button onClick={() => setShowAnalytics(false)} className="text-gray-400 hover:text-white">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <LiveAnalytics 
                    analytics={liveData?.analytics} 
                    liveData={liveData} 
                    liveId={liveStream?.id}
                  />
                </motion.div>
              )}

              {/* Panneau Filtres Beauté */}
              {showFilters && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="absolute left-20 bottom-32 bg-black/90 backdrop-blur rounded-xl p-4 z-20 min-w-[200px]"
                >
                  <h4 className="text-white font-bold text-sm mb-3">Filtres beauté</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {beautyFilters.map((filter) => (
                      <button
                        key={filter.id}
                        onClick={() => {
                          setSelectedFilter(filter.id);
                          setShowFilters(false);
                        }}
                        className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                          selectedFilter === filter.id
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                        }`}
                      >
                        {filter.name}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Panneau Q&A */}
              {showQA && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="absolute left-20 bottom-32 bg-black/90 backdrop-blur rounded-xl p-4 z-20 min-w-[300px] max-h-[400px] overflow-y-auto"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-white font-bold text-sm flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Questions & Réponses
                    </h4>
                    <button onClick={() => setShowQA(false)} className="text-gray-400 hover:text-white">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  {questions.length === 0 ? (
                    <p className="text-gray-400 text-xs text-center py-4">
                      Aucune question pour le moment. Les spectateurs peuvent poser des questions en ajoutant "?" dans leur message.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {questions.map((q) => (
                        <div key={q.id} className="bg-gray-800/50 rounded-lg p-2 hover:bg-gray-800/70 transition-colors">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <p className="text-white text-xs">
                                <span className="text-blue-400 font-medium">{q.sender}:</span> {q.question}
                              </p>
                              {q.answered && (
                                <p className="text-green-400 text-xs mt-1 flex items-center gap-1">
                                  <span>✓</span> Répondu
                                </p>
                              )}
                            </div>
                            {!q.answered && (
                              <button
                                onClick={async () => {
                                  try {
                                    await api.live.updateChatMessage(liveStream.id, q.id, { is_answered: true });
                                    setQuestions(prev => prev.map(qq => 
                                      qq.id === q.id ? { ...qq, answered: true } : qq
                                    ));
                                    toast.success('Question marquée comme répondue');
                                  } catch (err) {
                                    toast.error(err?.apiMessage || err?.message || 'Erreur');
                                  }
                                }}
                                className="text-xs text-blue-400 hover:text-blue-300 px-2 py-1 rounded bg-blue-500/20"
                              >
                                Marquer
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {/* Panneau Polls */}
              {showPolls && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="absolute left-20 bottom-32 bg-black/90 backdrop-blur rounded-xl p-4 z-20 min-w-[300px]"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-white font-bold text-sm flex items-center gap-2">
                      <BarChart3 className="w-4 h-4" />
                      Sondages
                    </h4>
                    <button onClick={() => setShowPolls(false)} className="text-gray-400 hover:text-white">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <Button
                    onClick={async () => {
                      const question = prompt('Question du sondage:');
                      if (question && question.trim()) {
                        const option1 = prompt('Option 1:');
                        const option2 = prompt('Option 2:');
                        if (option1 && option1.trim() && option2 && option2.trim()) {
                          try {
                            const newPoll = await api.live.createPoll(liveStream.id, {
                              question: question.trim(),
                              options: [
                                { text: option1.trim() },
                                { text: option2.trim() }
                              ]
                            });
                            setPolls([...polls, {
                              id: newPoll.id,
                              question: newPoll.question,
                              options: newPoll.options || [],
                              totalVotes: newPoll.total_votes || 0,
                              liveId: newPoll.live_id
                            }]);
                            toast.success('Sondage créé ! Les spectateurs peuvent maintenant voter.');
                          } catch (err) {
                            toast.error(err?.apiMessage || err?.message || 'Erreur création sondage');
                          }
                        } else {
                          toast.error('Les deux options sont requises');
                        }
                      }
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs"
                    size="sm"
                  >
                    Créer un sondage
                  </Button>
                  {polls.length > 0 && (
                    <div className="mt-3 space-y-3 max-h-[300px] overflow-y-auto">
                      {polls.map((poll) => (
                        <div key={poll.id} className="bg-gray-800/50 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-white text-xs font-medium">{poll.question}</p>
                            <button
                              onClick={async () => {
                                try {
                                  await api.live.endPoll(liveStream.id, poll.id);
                                  setPolls(prev => prev.filter(p => p.id !== poll.id));
                                  toast.success('Sondage terminé');
                                } catch (err) {
                                  toast.error(err?.apiMessage || err?.message || 'Erreur');
                                }
                              }}
                              className="text-xs text-red-400 hover:text-red-300"
                            >
                              Terminer
                            </button>
                          </div>
                          {poll.options.map((opt, idx) => {
                            const percentage = poll.totalVotes > 0 ? ((opt.votes || 0) / poll.totalVotes) * 100 : 0;
                            return (
                              <div key={idx} className="mb-2">
                                <div className="flex justify-between text-xs text-gray-300 mb-1">
                                  <span>{opt.text}</span>
                                  <span>{percentage.toFixed(0)}% ({(opt.votes || 0)})</span>
                                </div>
                                <div className="w-full bg-gray-700 rounded-full h-2">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${percentage}%` }}
                                    className="bg-blue-500 h-2 rounded-full transition-all"
                                  />
                                </div>
                              </div>
                            );
                          })}
                          <p className="text-gray-400 text-xs mt-2">{poll.totalVotes} votes</p>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {/* Panneau Co-Hosting */}
              {showCoHost && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="absolute left-20 bottom-32 bg-black/90 backdrop-blur rounded-xl p-4 z-20 min-w-[300px]"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-white font-bold text-sm flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Inviter un invité
                    </h4>
                    <button onClick={() => setShowCoHost(false)} className="text-gray-400 hover:text-white">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <Input
                    placeholder="Nom d'utilisateur ou email"
                    className="bg-gray-800 border-gray-700 text-white text-sm mb-2"
                    id="cohost-input"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        const input = e.target;
                        const usernameOrEmail = input.value.trim();
                        if (usernameOrEmail) {
                          // TODO: Rechercher l'utilisateur et inviter
                          api.users.list({ search: usernameOrEmail, limit: 1 })
                            .then(users => {
                              if (users && users.length > 0) {
                                return api.live.inviteCoHost(liveStream.id, users[0].id);
                              } else {
                                throw new Error('Utilisateur non trouvé');
                              }
                            })
                            .then(() => {
                              toast.success('Invitation envoyée !');
                              input.value = '';
                            })
                            .catch(err => {
                              toast.error(err?.apiMessage || err?.message || 'Erreur invitation');
                            });
                        }
                      }
                    }}
                  />
                  <Button
                    onClick={async () => {
                      const input = document.getElementById('cohost-input');
                      const usernameOrEmail = input?.value?.trim();
                      if (!usernameOrEmail) {
                        toast.error('Entrez un nom d\'utilisateur ou email');
                        return;
                      }
                      try {
                        const users = await api.users.list({ search: usernameOrEmail, limit: 1 });
                        if (users && users.length > 0) {
                          await api.live.inviteCoHost(liveStream.id, users[0].id);
                          toast.success(`Invitation envoyée à ${users[0].username || users[0].email} !`);
                          if (input) input.value = '';
                        } else {
                          toast.error('Utilisateur non trouvé');
                        }
                      } catch (err) {
                        toast.error(err?.apiMessage || err?.message || 'Erreur invitation');
                      }
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs"
                    size="sm"
                  >
                    Inviter
                  </Button>
                  <p className="text-gray-400 text-xs mt-2 text-center">
                    Invitez un autre créateur à rejoindre votre live
                  </p>
                </motion.div>
              )}

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
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-4"
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
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
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

