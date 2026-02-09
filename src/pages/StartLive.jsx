import React, { useState, useEffect, useRef } from 'react';

import { api } from '@/api/expressClient';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";

import { 

  ArrowLeft, 

  Video, 

  VideoOff, 

  Mic, 

  MicOff, 

  RefreshCw, 

  Sparkles,

  Users,

  MessageSquare,

  Gift,

  X,

  Send

} from 'lucide-react';

import { motion, AnimatePresence } from 'framer-motion';

import { useNavigate } from 'react-router-dom';

import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function StartLive() {

  const navigate = useNavigate();

  const queryClient = useQueryClient();

  const videoRef = useRef(null);

  const [user, setUser] = useState(null);

  const [stream, setStream] = useState(null);

  const [isLive, setIsLive] = useState(false);

  const [liveId, setLiveId] = useState(null);

  const [startTime, setStartTime] = useState(null);

  

  // Controls

  const [isCameraOn, setIsCameraOn] = useState(true);

  const [isMicOn, setIsMicOn] = useState(true);

  const [facingMode, setFacingMode] = useState('user');

  const [selectedFilter, setSelectedFilter] = useState('none');

  

  // UI States

  const [showFilters, setShowFilters] = useState(false);

  const [showGifts, setShowGifts] = useState(false);

  const [showChat, setShowChat] = useState(true);

  const [showEffects, setShowEffects] = useState(false);

  const [title, setTitle] = useState('');

  const [description, setDescription] = useState('');

  const [category, setCategory] = useState('');

  const [message, setMessage] = useState('');

  const [viewers, setViewers] = useState(0);

  const [messages, setMessages] = useState([]);

  const [gifts, setGifts] = useState([]);

  const [liveStats, setLiveStats] = useState({ likes: 0, shares: 0, newFollowers: 0 });

  const filters = [

    { id: 'none', name: 'Aucun', filter: 'none' },

    { id: 'grayscale', name: 'Noir & Blanc', filter: 'grayscale(100%)' },

    { id: 'sepia', name: 'Sépia', filter: 'sepia(100%)' },

    { id: 'warm', name: 'Chaud', filter: 'saturate(150%) contrast(110%)' },

    { id: 'cool', name: 'Froid', filter: 'hue-rotate(180deg)' },

    { id: 'vintage', name: 'Vintage', filter: 'sepia(50%) contrast(120%)' },

    { id: 'vibrant', name: 'Vibrant', filter: 'saturate(200%) brightness(110%)' },

    { id: 'dramatic', name: 'Dramatique', filter: 'contrast(150%) brightness(90%)' }

  ];

  const categories = [

    'Musique', 'Gaming', 'Cuisine', 'Fitness', 'Education', 

    'Business', 'Art', 'Danse', 'Q&A', 'Just Chatting'

  ];

  // Simulate live interactions

  useEffect(() => {

    if (isLive) {

      const interval = setInterval(() => {

        setViewers(prev => prev + Math.floor(Math.random() * 3));

        

        // Random messages from viewers

        if (Math.random() > 0.7) {

          const demoMessages = [

            { sender: 'Aminata', content: '🔥🔥🔥', avatar: '' },

            { sender: 'Moussa', content: 'Super live!', avatar: '' },

            { sender: 'Fatou', content: '❤️', avatar: '' },

            { sender: 'Koffi', content: 'Continue!', avatar: '' }

          ];

          const randomMsg = demoMessages[Math.floor(Math.random() * demoMessages.length)];

          setMessages(prev => [...prev, { ...randomMsg, id: Date.now() }]);

        }

        

        // Random stats

        if (Math.random() > 0.8) {

          setLiveStats(prev => ({

            likes: prev.likes + Math.floor(Math.random() * 5),

            shares: prev.shares + (Math.random() > 0.9 ? 1 : 0),

            newFollowers: prev.newFollowers + (Math.random() > 0.85 ? 1 : 0)

          }));

        }

      }, 3000);

      

      return () => clearInterval(interval);

    }

  }, [isLive]);

  useEffect(() => {

    const getUser = async () => {

      try {

        const u = await api.auth.me();

        setUser(u);

      } catch (e) {

        toast.error('Vous devez être connecté');

        navigate('/');

      }

    };

    getUser();

  }, []);

  useEffect(() => {

    if (user) {

      startCamera();

    }

    return () => {

      if (stream) {

        stream.getTracks().forEach(track => track.stop());

      }

    };

  }, [user]);

  const startCamera = async () => {

    try {

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {

        toast.error('Votre navigateur ne supporte pas la caméra');

        return;

      }

      let mediaStream;

      try {

        mediaStream = await navigator.mediaDevices.getUserMedia({

          video: { 

            facingMode,

            width: { ideal: 1920, max: 1920 },

            height: { ideal: 1080, max: 1080 }

          },

          audio: {

            echoCancellation: true,

            noiseSuppression: true,

            autoGainControl: true

          }

        });

      } catch (err) {

        console.log('Tentative avec contraintes réduites...');

        mediaStream = await navigator.mediaDevices.getUserMedia({

          video: { 

            facingMode,

            width: { ideal: 1280 },

            height: { ideal: 720 }

          },

          audio: true

        });

      }

      

      setStream(mediaStream);

      if (videoRef.current) {

        videoRef.current.srcObject = mediaStream;

        await videoRef.current.play();

      }

      toast.success('🎥 Caméra prête pour le live');

    } catch (error) {

      console.error('Erreur caméra:', error);

      let errorMessage = 'Impossible d\'accéder à la caméra.';

      

      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {

        errorMessage = 'Autorisez l\'accès à la caméra dans les paramètres de votre navigateur.';

      } else if (error.name === 'NotFoundError') {

        errorMessage = 'Aucune caméra détectée sur cet appareil.';

      } else if (error.name === 'NotReadableError') {

        errorMessage = 'La caméra est utilisée par une autre application.';

      }

      

      toast.error(errorMessage);

    }

  };

  const toggleCamera = () => {

    if (!stream) {

      toast.error('Caméra non disponible');

      return;

    }

    const videoTrack = stream.getVideoTracks()[0];

    if (!videoTrack) {

      toast.error('Aucune piste vidéo trouvée');

      return;

    }

    videoTrack.enabled = !videoTrack.enabled;

    setIsCameraOn(videoTrack.enabled);

    toast.success(videoTrack.enabled ? '📹 Caméra activée' : '📹 Caméra désactivée');

  };

  const toggleMic = () => {

    if (!stream) {

      toast.error('Micro non disponible');

      return;

    }

    const audioTrack = stream.getAudioTracks()[0];

    if (!audioTrack) {

      toast.error('Aucune piste audio trouvée');

      return;

    }

    audioTrack.enabled = !audioTrack.enabled;

    setIsMicOn(audioTrack.enabled);

    toast.success(audioTrack.enabled ? '🎤 Micro activé' : '🔇 Micro désactivé');

  };

  const switchCamera = async () => {

    try {

      if (!stream) {

        toast.error('Caméra non disponible');

        return;

      }

      const newFacingMode = facingMode === 'user' ? 'environment' : 'user';

      

      // Stop old stream

      stream.getTracks().forEach(track => {

        track.stop();

      });

      // Request new stream

      const newStream = await navigator.mediaDevices.getUserMedia({

        video: { 

          facingMode: newFacingMode,

          width: { ideal: 1920 },

          height: { ideal: 1080 }

        },

        audio: {

          echoCancellation: true,

          noiseSuppression: true,

          autoGainControl: true

        }

      });

      // Update stream and video element

      setStream(newStream);

      if (videoRef.current) {

        videoRef.current.srcObject = newStream;

        await videoRef.current.play();

      }

      setFacingMode(newFacingMode);

      setIsCameraOn(true);

      setIsMicOn(true);

      toast.success('📹 Caméra changée avec succès');

    } catch (error) {

      console.error('Erreur changement caméra:', error);

      let msg = 'Impossible de changer de caméra.';

      if (error.name === 'NotFoundError') {

        msg = 'Caméra avant/arrière non disponible.';

      }

      toast.error(msg);

    }

  };

  const startLiveMutation = useMutation({

   mutationFn: async () => {

     if (!title.trim()) {

       throw new Error('Veuillez entrer un titre');

     }

     if (!category) {

       throw new Error('Sélectionnez une catégorie');

     }

     const live = await api.live.start({

       title,

       description,

       category,

       stream_url: 'live'

     });

     return live;

   },

   onSuccess: (live) => {

     setLiveId(live.id);

     setIsLive(true);

     setViewers(1);

     setStartTime(new Date(live.started_at || new Date().toISOString()));

     queryClient.invalidateQueries({ queryKey: ['live-streams'] });

     toast.success('🔴 Vous êtes en direct !');

   },

   onError: (error) => {

     toast.error(error.message || 'Erreur lors du démarrage');

   }

  });

  const endLiveMutation = useMutation({

    mutationFn: async () => {

      await api.live.end(liveId);

    },

    onSuccess: () => {

      if (stream) {

        stream.getTracks().forEach(track => track.stop());

      }

      toast.success('Live terminé');

      navigate('/Lives');

    }

  });

  const sendMessage = () => {

    if (message.trim() && isLive) {

      const newMsg = {

        id: Date.now(),

        sender: user.full_name,

        content: message,

        avatar: user.profile_image

      };

      setMessages(prev => [...prev, newMsg]);

      setMessage('');

    }

  };

  if (!user) {

    return (

      <div className="h-screen flex items-center justify-center bg-black">

        <div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />

      </div>

    );

  }

  return (

    <div className="h-screen flex flex-col bg-black overflow-hidden">

      {/* Video Preview */}

      <div className="relative flex-1">

        <video

          ref={videoRef}

          autoPlay

          playsInline

          muted

          className="w-full h-full object-cover"

          style={{ 

            filter: filters.find(f => f.id === selectedFilter)?.filter || 'none',

            transform: facingMode === 'user' ? 'scaleX(-1)' : 'none'

          }}

        />

        {/* Top Bar */}

        <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 to-transparent p-4 z-50">

          <div className="flex items-center justify-between">

            <Button

              variant="ghost"

              size="icon"

              onClick={() => {

                if (isLive) {

                  if (confirm('Terminer le live et quitter ?')) {

                    endLiveMutation.mutate();

                  }

                } else {

                  navigate(-1);

                }

              }}

              className="text-white hover:bg-white/20 rounded-full w-10 h-10"

            >

              <ArrowLeft className="w-6 h-6" />

            </Button>

            {isLive && (

              <div className="flex items-center gap-2">

                <div className="bg-red-500 text-white px-3 py-1.5 rounded-full text-sm font-bold flex items-center gap-1 animate-pulse">

                  🔴 EN DIRECT

                </div>

                <div className="bg-black/60 text-white px-3 py-1.5 rounded-full text-sm flex items-center gap-1">

                  <Users className="w-4 h-4" />

                  {viewers}

                </div>

              </div>

            )}

          </div>

        </div>

        {/* Pre-Live Setup Panel */}

        {!isLive && (

          <div className="absolute inset-0 bg-gradient-to-b from-black/90 via-black/70 to-black/90 flex flex-col p-6 overflow-y-auto">

            <div className="space-y-8 max-w-md mx-auto w-full flex-1">

              {/* Header */}

              <div>

                <h1 className="text-3xl font-bold text-white mb-2">Configurer votre Live</h1>

                <p className="text-white/60">Remplissez les informations avant de commencer</p>

              </div>

              {/* Title Section */}

              <div className="space-y-3">

                <label className="text-white font-semibold text-sm">Titre *</label>

                <Input

                  placeholder="Ex: Tutorial React..."

                  value={title}

                  onChange={(e) => setTitle(e.target.value)}

                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50 text-base rounded-xl"

                />

                <p className="text-white/40 text-xs">{title.length}/100 caractères</p>

              </div>

              {/* Description Section */}

              <div className="space-y-3">

                <label className="text-white font-semibold text-sm">Description (optionnel)</label>

                <textarea

                  placeholder="Décrivez votre live..."

                  value={description}

                  onChange={(e) => setDescription(e.target.value)}

                  className="w-full bg-white/10 border border-white/20 text-white placeholder:text-white/50 rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-pink-500"

                  rows={3}

                />

              </div>

              {/* Category Section */}

              <div className="space-y-3">

                <label className="text-white font-semibold text-sm">Catégorie *</label>

                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-2">

                  {categories.map((cat) => (

                    <button

                      key={cat}

                      onClick={() => setCategory(cat)}

                      className={`py-2.5 px-3 rounded-lg text-sm font-medium transition-all border ${

                        category === cat

                          ? 'border-pink-500 bg-pink-500/20 text-white'

                          : 'border-white/20 bg-white/10 text-white/70 hover:text-white hover:bg-white/20'

                      }`}

                    >

                      {cat}

                    </button>

                  ))}

                </div>

              </div>

              {/* Status */}

              <div className="flex items-center gap-2 text-white/60 text-sm">

                <div className={`w-2 h-2 rounded-full ${title && category ? 'bg-green-500' : 'bg-red-500'}`} />

                {title && category ? '✅ Prêt à démarrer' : '⚠️ Complétez les champs obligatoires'}

              </div>

            </div>

          </div>

        )}

        {/* Live Stats Display */}

        {isLive && (

          <div className="absolute top-20 left-4 right-4 flex gap-2">

            <div className="bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full text-white text-sm flex items-center gap-1">

              ❤️ {liveStats.likes}

            </div>

            <div className="bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full text-white text-sm flex items-center gap-1">

              📤 {liveStats.shares}

            </div>

            <div className="bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full text-white text-sm flex items-center gap-1">

              ➕ {liveStats.newFollowers}

            </div>

          </div>

        )}

        {/* Chat Overlay */}

        {isLive && showChat && (

          <div className="absolute bottom-32 left-0 right-0 px-4">

            <div className="space-y-2 max-h-64 overflow-y-auto">

              {messages.slice(-5).map((msg) => (

                <motion.div

                  key={msg.id}

                  initial={{ opacity: 0, x: -20 }}

                  animate={{ opacity: 1, x: 0 }}

                  className="bg-black/60 backdrop-blur-sm rounded-full px-3 py-2 flex items-center gap-2 w-fit max-w-[80%]"

                >
                  {/* @ts-expect-error - Avatar components accept children via props spread */}
                  <Avatar className="w-6 h-6">
                    {/* @ts-expect-error - AvatarImage accepts src prop */}
                    <AvatarImage src={msg.avatar} />
                    {/* @ts-expect-error - AvatarFallback accepts children via props spread */}
                    <AvatarFallback className="text-xs">{msg.sender?.[0]}</AvatarFallback>
                  </Avatar>

                  <span className="text-white text-sm">

                    <span className="font-semibold">{msg.sender}</span>: {msg.content}

                  </span>

                </motion.div>

              ))}

            </div>

          </div>

        )}

        {/* Filter Selector */}

        <AnimatePresence>

          {showFilters && (

            <motion.div

              initial={{ opacity: 0, y: 50 }}

              animate={{ opacity: 1, y: 0 }}

              exit={{ opacity: 0, y: 50 }}

              className="absolute bottom-32 left-0 right-0 bg-black/90 backdrop-blur-xl p-4"

            >

              <div className="flex items-center justify-between mb-3">

                <h3 className="text-white font-semibold">Filtres</h3>

                <Button

                  variant="ghost"

                  size="icon"

                  onClick={() => setShowFilters(false)}

                  className="text-white"

                >

                  <X className="w-5 h-5" />

                </Button>

              </div>

              <div className="grid grid-cols-3 gap-3">

                {filters.map((filter) => (

                  <button

                    key={filter.id}

                    onClick={() => {

                      setSelectedFilter(filter.id);

                      toast.success(`Filtre: ${filter.name}`);

                    }}

                    className={`aspect-square rounded-xl border-2 flex items-center justify-center text-white text-sm ${

                      selectedFilter === filter.id 

                        ? 'border-pink-500 bg-pink-500/20' 

                        : 'border-white/20 bg-white/5'

                    }`}

                  >

                    {filter.name}

                  </button>

                ))}

              </div>

            </motion.div>

          )}

        </AnimatePresence>

      </div>

      {/* Bottom Controls */}

      <div className="bg-black/90 backdrop-blur-xl p-4 space-y-3">

        {/* Message Input (when live) */}

        {isLive && (

          <div className="flex items-center gap-2">

            <Input

              placeholder="Envoyer un message..."

              value={message}

              onChange={(e) => setMessage(e.target.value)}

              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}

              className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/40"

            />

            <Button

              onClick={sendMessage}

              size="icon"

              className="bg-gradient-to-r from-pink-500 to-red-500"

            >

              <Send className="w-5 h-5" />

            </Button>

          </div>

        )}

        {/* Control Buttons */}

        <div className="flex items-center justify-around">

          <Button

            onClick={switchCamera}

            variant="ghost"

            size="icon"

            className="text-white"

          >

            <RefreshCw className="w-6 h-6" />

          </Button>

          <Button

            onClick={toggleCamera}

            variant="ghost"

            size="icon"

            className={isCameraOn ? 'text-white' : 'text-red-500'}

          >

            {isCameraOn ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}

          </Button>

          <Button

            onClick={toggleMic}

            variant="ghost"

            size="icon"

            className={isMicOn ? 'text-white' : 'text-red-500'}

          >

            {isMicOn ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}

          </Button>

          <Button

            onClick={() => setShowFilters(!showFilters)}

            variant="ghost"

            size="icon"

            className="text-white"

          >

            <Sparkles className="w-6 h-6" />

          </Button>

          {isLive && (

            <>

              <Button

                onClick={() => setShowChat(!showChat)}

                variant="ghost"

                size="icon"

                className="text-white"

              >

                <MessageSquare className="w-6 h-6" />

              </Button>

              

              <Button

                onClick={() => setShowGifts(!showGifts)}

                variant="ghost"

                size="icon"

                className="text-white"

              >

                <Gift className="w-6 h-6" />

              </Button>

            </>

          )}

        </div>

        {/* Start/End Live Button */}

        {!isLive ? (

          <Button

            onClick={() => startLiveMutation.mutate()}

            disabled={!title.trim() || !category || startLiveMutation.isPending}

            className="w-full bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-bold py-6 text-lg disabled:opacity-50"

          >

            {startLiveMutation.isPending ? 'Démarrage...' : '🔴 Démarrer le Live'}

          </Button>

        ) : (

          <div className="space-y-2">

            <div className="flex items-center justify-between text-white text-sm">

              <span>Durée: {startTime ? Math.floor((Date.now() - startTime.getTime()) / 60000) : 0}m</span>

              <span>{viewers} spectateurs</span>

            </div>

            <Button

              onClick={() => endLiveMutation.mutate()}

              disabled={endLiveMutation.isPending}

              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-6 text-lg"

            >

              {endLiveMutation.isPending ? 'Arrêt...' : 'Terminer le Live'}

            </Button>

          </div>

        )}

      </div>

    </div>

  );

}
