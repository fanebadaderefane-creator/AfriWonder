// @ts-nocheck
import React, { useState, useRef, useEffect } from 'react';

import { api } from '@/api/expressClient';

import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";

import { Textarea } from "@/components/ui/textarea";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Label } from "@/components/ui/label";

import { 

  Camera, Upload, X, Music2, 

  Sparkles, Check, ArrowLeft, Globe, Users, Lock,

  Radio, Loader2, Hash, Circle, Square, Mic, MicOff,

  FlipHorizontal, Gift, MessageCircle, Eye

} from 'lucide-react';

import { motion, AnimatePresence } from 'framer-motion';

import { toast } from "sonner";

import { useNavigate, useSearchParams } from 'react-router-dom';

import { useQueryClient } from '@tanstack/react-query';

import { createPageUrl } from "@/utils";

import VideoEditor from '../components/video/VideoEditor';



const categories = [

  'divertissement', 'musique', 'danse', 'cuisine', 'mode', 

  'business', 'education', 'sport', 'actualites', 'humour', 'lifestyle', 'tech'

];



const languages = [

  { code: 'francais', name: 'Français' },

  { code: 'wolof', name: 'Wolof' },

  { code: 'bambara', name: 'Bambara' },

  { code: 'hausa', name: 'Hausa' },

  { code: 'lingala', name: 'Lingala' },

  { code: 'swahili', name: 'Swahili' },

  { code: 'anglais', name: 'English' },

];



const visibilityOptions = [

  { value: 'public', label: 'Public', icon: Globe, description: 'Tout le monde' },

  { value: 'abonnes', label: 'Abonnés', icon: Users, description: 'Vos abonnés seulement' },

  { value: 'prive', label: 'Privé', icon: Lock, description: 'Vous seul' },

];



function extractHashtagsFromDescription(description) {
  if (!description) return [];
  const matches = description.match(/#[\w]+/g);
  return matches ? matches.map((t) => t.substring(1)) : [];
}
function descriptionWithoutHashtags(description) {
  if (!description) return '';
  return description
    .replace(/\n\n#[\w\s#]+/g, '')
    .replace(/\n\n🎵 Musique:.*/g, '')
    .trim();
}

export default function Create() {

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const isAdMode = searchParams.get('mode') === 'ad';
  const adCampaignId = searchParams.get('campaignId');
  const fileInputRef = useRef(null);

  const cameraInputRef = useRef(null);

  const videoRef = useRef(null);

  const mediaRecorderRef = useRef(null);

  const streamRef = useRef(null);

  

  const [step, setStep] = useState('select'); // 'select' | 'camera' | 'live' | 'edit' | 'details' | 'uploading'

  const [selectedFile, setSelectedFile] = useState(null);

  const [previewUrl, setPreviewUrl] = useState(null);

  const [uploadProgress, setUploadProgress] = useState(0);

  const [user, setUser] = useState(null);

  

  // Camera state

  const [isRecording, setIsRecording] = useState(false);

  const [recordedChunks, setRecordedChunks] = useState([]);

  const [facingMode, setFacingMode] = useState('user');

  const [recordingTime, setRecordingTime] = useState(0);

  const [showCameraFilters, setShowCameraFilters] = useState(false);

  const [showCameraMusic, setShowCameraMusic] = useState(false);

  const [cameraFilter, setCameraFilter] = useState('Normal');

  const musicInputRef = useRef(null);

  

  // Live state

  const [isLive, setIsLive] = useState(false);

  const [liveViewers, setLiveViewers] = useState(0);

  const [liveComments, setLiveComments] = useState([]);

  const [liveGifts, setLiveGifts] = useState(0);

  const [isMuted, setIsMuted] = useState(false);

  

  const [videoData, setVideoData] = useState({

    title: '',

    description: '',

    category: '',

    language: 'francais',

    visibility: 'public',

    hashtags: [],

    music_title: '',

    music_id: '',

    text_overlay: '',

    text_x: 50,

    text_y: 50,

    stickers: [],

    start_time: 0,

    end_time: 0,

    is_live: false,

    filter: 'Normal',

    thumbnail_url: ''

  });



  const [hashtagInput, setHashtagInput] = useState('');

  const [editingVideoId, setEditingVideoId] = useState(null);

  useEffect(() => {

    const getUser = async () => {

      try {

        const u = await api.auth.me();

        setUser(u);

      } catch (e) {

        toast.error('Connectez-vous pour publier');

        navigate(createPageUrl('Home'));

      }

    };

    getUser();

  }, [navigate]);

  useEffect(() => {

    const editId = searchParams.get('edit');

    if (!editId) return;

    setEditingVideoId(editId);

    let cancelled = false;

    (async () => {

      try {

        const data = await api.videos.getById(editId);

        if (cancelled || !data) return;

        const hashtags = extractHashtagsFromDescription(data.description);

        const cleanDesc = descriptionWithoutHashtags(data.description);

        setVideoData((prev) => ({

          ...prev,

          title: data.title || '',

          description: cleanDesc,

          category: data.category || 'divertissement',

          visibility: data.visibility || 'public',

          hashtags: hashtags.length ? hashtags : prev.hashtags,

          music_title: data.music_title || '',

          thumbnail_url: data.thumbnail_url || '',

        }));

        setPreviewUrl(data.video_url || null);

        setStep('details');

      } catch (e) {

        if (!cancelled) toast.error('Vidéo introuvable');

      }

    })();

    return () => { cancelled = true; };

  }, [searchParams]);

  // Détecter la musique depuis l'URL (quand un utilisateur clique sur une musique d'une vidéo)
  useEffect(() => {

    const params = new URLSearchParams(window.location.search);

    const musicParam = params.get('music');

    if (musicParam) {

      const decodedMusic = decodeURIComponent(musicParam);

      setVideoData(prev => ({

        ...prev,

        music_title: decodedMusic,

        music_id: decodedMusic.toLowerCase().replace(/\s+/g, '_')

      }));

      toast.success(`🎵 Musique "${decodedMusic}" sélectionnée`);

      // Nettoyer l'URL pour éviter de recharger la musique à chaque fois

      window.history.replaceState({}, '', window.location.pathname);

    }

  }, []);



  // Recording timer

  useEffect(() => {

    let interval;

    if (isRecording) {

      interval = setInterval(() => {

        setRecordingTime(prev => prev + 1);

      }, 1000);

    } else {

      setRecordingTime(0);

    }

    return () => clearInterval(interval);

  }, [isRecording]);



  // Cleanup camera on unmount

  useEffect(() => {

    return () => {

      if (streamRef.current) {

        streamRef.current.getTracks().forEach(track => track.stop());

      }

    };

  }, []);



  const formatTime = (seconds) => {

    const mins = Math.floor(seconds / 60);

    const secs = seconds % 60;

    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

  };



  // Handle file selection from gallery

  const handleFileSelect = async (e) => {

    const file = e.target.files?.[0];

    if (file) {

      if (!file.type.startsWith('video/')) {

        toast.error('Veuillez sélectionner une vidéo');

        return;

      }

      

      // Create preview URL

      const preview = URL.createObjectURL(file);

      setSelectedFile(file);

      setPreviewUrl(preview);

      setStep('edit');

      toast.success('Vidéo chargée avec succès');

    }

  };



  // Start camera

  const startCamera = async () => {

    try {

      // Check if mediaDevices is supported

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {

        toast.error('Votre navigateur ne supporte pas la caméra');

        return;

      }



      setStep('camera');

      // Wait for video element to be rendered

      await new Promise(resolve => setTimeout(resolve, 200));

      

      // Try to get camera with flexible constraints

      let stream;

      try {

        stream = await navigator.mediaDevices.getUserMedia({

          video: { 

            facingMode: facingMode,

            width: { ideal: 1920, max: 1920 },

            height: { ideal: 1080, max: 1080 }

          },

          audio: true

        });

      } catch (err) {

        // Fallback: try without audio if audio fails

        console.log('Retrying without audio constraints...');

        stream = await navigator.mediaDevices.getUserMedia({

          video: { 

            facingMode: facingMode,

            width: { ideal: 1280 },

            height: { ideal: 720 }

          },

          audio: false

        });

        toast('Caméra activée (sans son)', { icon: '📹' });

      }

      

      streamRef.current = stream;

      if (videoRef.current) {

        videoRef.current.srcObject = stream;

        await videoRef.current.play();

      }

      toast.success('Caméra prête !');

    } catch (error) {

      console.error('Camera error:', error);

      let errorMessage = 'Impossible d\'accéder à la caméra.';

      

      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {

        errorMessage = 'Autorisez l\'accès à la caméra dans les paramètres.';

      } else if (error.name === 'NotFoundError') {

        errorMessage = 'Aucune caméra détectée sur cet appareil.';

      } else if (error.name === 'NotReadableError') {

        errorMessage = 'La caméra est utilisée par une autre application.';

      }

      

      toast.error(errorMessage);

      setStep('select');

    }

  };



  // Switch camera

  const switchCamera = async () => {

    const newMode = facingMode === 'user' ? 'environment' : 'user';

    setFacingMode(newMode);

    

    if (streamRef.current) {

      streamRef.current.getTracks().forEach(track => track.stop());

    }

    

    try {

      const stream = await navigator.mediaDevices.getUserMedia({

        video: { 

          facingMode: newMode,

          width: { ideal: 1920 },

          height: { ideal: 1080 }

        },

        audio: true

      });

      streamRef.current = stream;

      if (videoRef.current) {

        videoRef.current.srcObject = stream;

        videoRef.current.play();

      }

    } catch (error) {

      toast.error('Erreur lors du changement de caméra');

    }

  };



  // Start recording

  const startRecording = () => {

    if (!streamRef.current) return;

    

    try {

      // Check for supported mime types

      let mimeType = 'video/webm;codecs=vp9';

      if (!MediaRecorder.isTypeSupported(mimeType)) {

        mimeType = 'video/webm;codecs=vp8';

      }

      if (!MediaRecorder.isTypeSupported(mimeType)) {

        mimeType = 'video/webm';

      }

      if (!MediaRecorder.isTypeSupported(mimeType)) {

        mimeType = 'video/mp4';

      }

      

      const mediaRecorder = new MediaRecorder(streamRef.current, {

        mimeType: mimeType,

        videoBitsPerSecond: 2500000 // 2.5 Mbps for good quality

      });

      mediaRecorderRef.current = mediaRecorder;

      

      const chunks = [];

      

      mediaRecorder.ondataavailable = (e) => {

        if (e.data && e.data.size > 0) {

          chunks.push(e.data);

        }

      };

      

      mediaRecorder.onstop = () => {

        try {

          const blob = new Blob(chunks, { type: mimeType });

          

          if (blob.size === 0) {

            toast.error('Enregistrement vide. Réessayez.');

            setIsRecording(false);

            return;

          }

          

          // Create a File object with proper naming

          const fileName = `video_${Date.now()}.webm`;

          const videoFile = new File([blob], fileName, { type: mimeType });

          

          setSelectedFile(videoFile);

          setPreviewUrl(URL.createObjectURL(blob));

          

          // Stop camera stream

          if (streamRef.current) {

            streamRef.current.getTracks().forEach(track => track.stop());

          }

          

          toast.success('Enregistrement terminé !');

          setStep('edit');

        } catch (error) {

          console.error('Error processing recording:', error);

          toast.error('Erreur lors de l\'enregistrement');

          setIsRecording(false);

        }

      };

      

      mediaRecorder.onerror = (event) => {

        console.error('MediaRecorder error:', event);

        toast.error('Erreur d\'enregistrement');

        setIsRecording(false);

      };

      

      // Start recording with timeslice for better data handling

      mediaRecorder.start(1000);

      setIsRecording(true);

      setRecordedChunks([]);

      toast.success('Enregistrement démarré');

    } catch (error) {

      console.error('Error starting recording:', error);

      toast.error('Impossible de démarrer l\'enregistrement');

    }

  };



  // Stop recording

  const stopRecording = () => {

    if (mediaRecorderRef.current && isRecording) {

      try {

        if (mediaRecorderRef.current.state === 'recording') {

          mediaRecorderRef.current.stop();

        }

        setIsRecording(false);

      } catch (error) {

        console.error('Error stopping recording:', error);

        toast.error('Erreur lors de l\'arrêt de l\'enregistrement');

      }

    }

  };



  // Cancel camera

  const cancelCamera = () => {

    if (streamRef.current) {

      streamRef.current.getTracks().forEach(track => track.stop());

    }

    setIsRecording(false);

    setStep('select');

  };



  // Start Live

  const startLive = async () => {

    try {

      setStep('live');

      // Wait for video element to be rendered

      await new Promise(resolve => setTimeout(resolve, 100));

      

      const stream = await navigator.mediaDevices.getUserMedia({

        video: { 

          facingMode: facingMode,

          width: { ideal: 1920 },

          height: { ideal: 1080 }

        },

        audio: true

      });

      streamRef.current = stream;

      if (videoRef.current) {

        videoRef.current.srcObject = stream;

        videoRef.current.play();

      }

      setIsLive(true);

      

      // Simulate viewers joining

      const viewerInterval = setInterval(() => {

        setLiveViewers(prev => prev + Math.floor(Math.random() * 5));

      }, 3000);

      

      // Simulate comments

      const comments = [

        { user: 'Fatou', text: '🔥🔥🔥' },

        { user: 'Mamadou', text: 'Super contenu!' },

        { user: 'Aisha', text: 'Continue comme ça' },

        { user: 'Kofi', text: '❤️❤️' },

      ];

      

      let commentIndex = 0;

      const commentInterval = setInterval(() => {

        setLiveComments(prev => [...prev.slice(-4), comments[commentIndex % comments.length]]);

        commentIndex++;

      }, 4000);

      

      // Store intervals for cleanup

      streamRef.current.viewerInterval = viewerInterval;

      streamRef.current.commentInterval = commentInterval;

      

    } catch (error) {

      console.error('Live error:', error);

      toast.error('Impossible de démarrer le live. Vérifiez les permissions.');

    }

  };



  // End Live

  const endLive = () => {

    if (streamRef.current) {

      clearInterval(streamRef.current.viewerInterval);

      clearInterval(streamRef.current.commentInterval);

      streamRef.current.getTracks().forEach(track => track.stop());

    }

    setIsLive(false);

    setLiveViewers(0);

    setLiveComments([]);

    toast.success(`Live terminé ! ${liveViewers} spectateurs`);

    setStep('select');

  };



  const handleAddHashtag = () => {

    if (hashtagInput.trim() && videoData.hashtags.length < 10) {

      const tag = hashtagInput.trim().replace(/^#/, '');

      if (!videoData.hashtags.includes(tag)) {

        setVideoData(prev => ({

          ...prev,

          hashtags: [...prev.hashtags, tag]

        }));

      }

      setHashtagInput('');

    }

  };



  const handleRemoveHashtag = (tag) => {

    setVideoData(prev => ({

      ...prev,

      hashtags: prev.hashtags.filter(t => t !== tag)

    }));

  };



  const handlePublish = async () => {

    if (!editingVideoId && !selectedFile) {

      toast.error('Sélectionnez une vidéo');

      return;

    }

    // Mode campagne pub : upload + addCreative, redirection vers CreateAdCampaign
    if (isAdMode && adCampaignId && selectedFile) {
      if (adCampaignId.length < 30) {
        toast.error('ID de campagne invalide. Retournez à la création de campagne.');
        return;
      }
      setStep('uploading');
      setUploadProgress(0);
      try {
        const uploadResult = await api.upload.video(selectedFile, (p) =>
          setUploadProgress(Math.min(p, 90))
        );
        const videoUrl = uploadResult?.file_url || uploadResult?.url || '';
        if (!videoUrl) {
          toast.error('Échec du téléchargement');
          setStep('details');
          return;
        }
        await api.ads.addCreative(adCampaignId, {
          media_type: 'video',
          media_url: videoUrl,
          thumbnail_url: videoUrl,
          cta_type: 'visit',
          cta_label: 'Découvrir',
        });
        setUploadProgress(100);
        toast.success('Vidéo ajoutée à la campagne !');
        navigate(createPageUrl('CreateAdCampaign') + `?campaignId=${adCampaignId}&step=3`);
      } catch (err) {
        const status = err?.response?.status;
        const rawMsg = err?.apiMessage ?? err?.response?.data?.error?.message ?? err?.response?.data?.error ?? err?.message;
        const isR2NotConfigured = status === 503 && (typeof rawMsg === 'string' && rawMsg.includes('R2 non configuré'));
        const msg = isR2NotConfigured
          ? 'Upload indisponible sur ce serveur. Configurez R2 (variables R2_*) sur l\'hébergeur du backend.'
          : (typeof rawMsg === 'string' ? rawMsg : "Erreur lors de l'ajout");
        toast.error(msg);
        setStep('details');
      }
      return;
    }

    if (!videoData.title.trim()) {

      toast.error('Ajoutez un titre');

      return;

    }

    if (editingVideoId) {

      try {

        setStep('uploading');

        setUploadProgress(50);

        const hashtagsText = videoData.hashtags?.length > 0

          ? '\n\n#' + videoData.hashtags.join(' #')

          : '';

        const fullDescription = [videoData.description || '', hashtagsText].filter(Boolean).join('');

        const updateData = {

          title: videoData.title,

          description: fullDescription,

          category: videoData.category || 'divertissement',

          visibility: videoData.visibility || 'public',

          hashtags: videoData.hashtags?.length > 0 ? videoData.hashtags : undefined,

          music_title: videoData.music_title || undefined,

          thumbnail_url: videoData.thumbnail_url || undefined,

        };

        await api.videos.update(editingVideoId, updateData);

        setUploadProgress(100);

        queryClient.invalidateQueries({ queryKey: ['videos'] });

        queryClient.invalidateQueries({ queryKey: ['profile-videos'] });

        queryClient.invalidateQueries({ queryKey: ['video', editingVideoId] });

        toast.success('Vidéo mise à jour avec succès !');

        setTimeout(() => navigate(createPageUrl('Home')), 400);

      } catch (error) {

        console.error('Update error:', error);

        toast.error('Erreur lors de la mise à jour');

        setStep('details');

      }

      return;

    }

    setStep('uploading');

    setUploadProgress(0);

    try {

      const progressInterval = setInterval(() => {

        setUploadProgress(prev => Math.min(prev + 10, 90));

      }, 300);

      let videoUrl = '';

      try {

        const uploadResult = await api.upload.video(selectedFile, (progress) => {

          setUploadProgress(Math.min(progress, 90));

        });

        videoUrl = uploadResult?.file_url ?? uploadResult?.url ?? '';

      } catch (uploadError) {

        const status = uploadError?.response?.status;
        const rawMsg = uploadError?.response?.data?.error || uploadError?.response?.data?.message || uploadError?.message;
        const isR2NotConfigured = status === 503 && (typeof rawMsg === 'string' && rawMsg.includes('R2 non configuré'));
        const msg = isR2NotConfigured
          ? 'Upload indisponible sur ce serveur. Le stockage R2 doit être configuré côté backend (variables R2_* sur l\'hébergeur).'
          : (rawMsg || 'Erreur lors de l\'upload de la vidéo');
        if (import.meta.env.DEV) {
          console.error('[Create] Upload vidéo échoué:', { status, rawMsg, err: uploadError });
        }
        clearInterval(progressInterval);
        toast.error(msg);
        setStep('details');
        return;

      }

      clearInterval(progressInterval);

      setUploadProgress(100);

      if (!videoUrl) {
        toast.error('Upload réussi mais URL vidéo manquante');
        setStep('details');
        return;
      }

      // Inclure les hashtags dans la description (comme pour la mise à jour) pour affichage cohérent
      const hashtagsText = videoData.hashtags?.length > 0
        ? '\n\n#' + videoData.hashtags.join(' #')
        : '';

      const fullDescription = [videoData.description || '', hashtagsText].filter(Boolean).join('');

      const videoRecord = {

        title: videoData.title,

        description: fullDescription,

        video_url: videoUrl,

        thumbnail_url: videoData.thumbnail_url || videoUrl,

        category: videoData.category || 'divertissement',

        visibility: videoData.visibility || 'public',

        hashtags: videoData.hashtags?.length > 0 ? videoData.hashtags : undefined,

        music_title: videoData.music_title || undefined,

      };

      await api.videos.create(videoRecord);

      toast.success('Vidéo publiée avec succès ! 🎉');

      setTimeout(() => navigate(createPageUrl('Home')), 500);

    } catch (error) {

      console.error('Publish error:', error);

      toast.error('Erreur lors de la publication: ' + (error.message || 'Erreur inconnue'));

      setStep('details');

    }

  };



  return (

    <div className="screen bg-black">

      <AnimatePresence mode="wait">

        {/* Step: Select */}

        {step === 'select' && (

          <motion.div
            key="select"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col h-full"
          >

            <div className="flex items-center justify-between p-4">

              <Button

                variant="ghost"

                size="icon"

                onClick={() => navigate(createPageUrl('Home'))}

                className="text-white hover:bg-white/10"

              >

                <X className="w-6 h-6" />

              </Button>

              <h1 className="text-white text-lg font-bold">Créer</h1>

              <div className="w-10" />

            </div>



            <div className="flex-1 flex flex-col items-center justify-center p-8">

              <div className="w-full max-w-sm space-y-4">

                {/* Upload Video from Gallery */}

                <motion.button

                  whileTap={{ scale: 0.98 }}

                  onClick={() => fileInputRef.current?.click()}

                  className="w-full p-8 rounded-3xl bg-gradient-to-br from-orange-500 to-red-500 text-white flex flex-col items-center gap-4 shadow-lg shadow-orange-500/30"

                >

                  <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center">

                    <Upload className="w-10 h-10" />

                  </div>

                  <div>

                    <p className="text-xl font-bold">Importer une vidéo</p>

                    <p className="text-white/70 text-sm">Depuis votre galerie</p>

                  </div>

                </motion.button>



                {/* Record Video with Camera */}

                <motion.button

                  whileTap={{ scale: 0.98 }}

                  onClick={startCamera}

                  className="w-full p-6 rounded-2xl bg-white/10 text-white flex items-center gap-4 border border-white/20"

                >

                  <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center">

                    <Camera className="w-7 h-7" />

                  </div>

                  <div className="text-left">

                    <p className="font-semibold">Filmer</p>

                    <p className="text-white/50 text-sm">Utiliser la caméra</p>

                  </div>

                </motion.button>



                {/* Go Live */}

                <motion.button

                  whileTap={{ scale: 0.98 }}

                  onClick={() => navigate(createPageUrl('LiveStream'))}

                  className="w-full p-6 rounded-2xl bg-white/10 text-white flex items-center gap-4 border border-white/20"

                >

                  <div className="w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center">

                    <Radio className="w-7 h-7 text-red-500" />

                  </div>

                  <div className="text-left">

                    <p className="font-semibold">Passer en Live</p>

                    <p className="text-white/50 text-sm">Diffusez en direct</p>

                  </div>

                </motion.button>

              </div>

            </div>



            <input

              ref={fileInputRef}

              type="file"

              accept="video/*,video/mp4,video/quicktime,video/x-m4v"

              onChange={handleFileSelect}

              className="hidden"

            />

          </motion.div>

        )}



        {/* Step: Camera Recording */}

        {step === 'camera' && (

          <motion.div
            key="camera"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col bg-black relative h-full"
          >

            {/* Camera Preview */}

            <video

              ref={videoRef}

              autoPlay

              playsInline

              muted

              className="absolute inset-0 w-full h-full object-cover bg-black"

              style={{ 

                transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',

                filter: cameraFilter === 'Normal' ? 'none' :

                       cameraFilter === 'Noir & Blanc' ? 'grayscale(100%)' :

                       cameraFilter === 'Sépia' ? 'sepia(100%)' :

                       cameraFilter === 'Vibrant' ? 'saturate(200%)' :

                       cameraFilter === 'Foncé' ? 'brightness(0.75)' :

                       cameraFilter === 'Lumineux' ? 'brightness(1.25)' : 'none'

              }}

              onLoadedMetadata={(e) => {
                const video = e.target;
                if (video instanceof HTMLVideoElement) {
                  video.play().catch(() => {});
                }
              }}

            />



            {/* Top Controls */}

            <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10">

              <Button

                variant="ghost"

                size="icon"

                onClick={cancelCamera}

                className="text-white bg-black/30 hover:bg-black/50 rounded-full"

              >

                <X className="w-6 h-6" />

              </Button>

              

              {isRecording && (

                <div className="flex items-center gap-2 bg-red-500 px-4 py-2 rounded-full">

                  <div className="w-3 h-3 bg-white rounded-full animate-pulse" />

                  <span className="text-white font-bold">{formatTime(recordingTime)}</span>

                </div>

              )}

              

              <Button

                variant="ghost"

                size="icon"

                onClick={switchCamera}

                className="text-white bg-black/30 hover:bg-black/50 rounded-full"

              >

                <FlipHorizontal className="w-6 h-6" />

              </Button>

            </div>



            {/* Bottom Controls */}

            <div className="absolute bottom-0 left-0 right-0 p-8 flex justify-center items-center gap-8 z-10">

              <Button

                variant="ghost"

                size="icon"

                onClick={() => setShowCameraFilters(!showCameraFilters)}

                className="text-white bg-black/30 hover:bg-black/50 rounded-full w-14 h-14"

              >

                <Sparkles className="w-6 h-6" />

              </Button>



              {/* Record Button */}

              <button

                onClick={isRecording ? stopRecording : startRecording}

                disabled={isRecording && recordingTime < 1}

                className={`w-20 h-20 rounded-full border-4 border-white flex items-center justify-center transition-all ${

                  isRecording ? 'bg-transparent' : 'bg-transparent'

                }`}

              >

                {isRecording ? (

                  <Square className="w-8 h-8 text-red-500 fill-red-500" />

                ) : (

                  <Circle className="w-16 h-16 text-red-500 fill-red-500" />

                )}

              </button>



              <Button

                variant="ghost"

                size="icon"

                onClick={() => setShowCameraMusic(!showCameraMusic)}

                className="text-white bg-black/30 hover:bg-black/50 rounded-full w-14 h-14"

              >

                <Music2 className="w-6 h-6" />

              </Button>

            </div>



            {/* Filter Selector */}

            {showCameraFilters && (

              <motion.div

                initial={{ opacity: 0, y: 20 }}

                animate={{ opacity: 1, y: 0 }}

                className="absolute bottom-32 left-0 right-0 px-4 z-20"

              >

                <div className="bg-black/80 backdrop-blur-lg rounded-2xl p-4">

                  <div className="flex items-center gap-3 overflow-x-auto pb-2">

                    {['Normal', 'Noir & Blanc', 'Sépia', 'Vibrant', 'Foncé', 'Lumineux'].map((filter) => (

                      <button

                        key={filter}

                        onClick={() => {

                          setCameraFilter(filter);

                          setVideoData(prev => ({ ...prev, filter }));

                        }}

                        className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${

                          cameraFilter === filter

                            ? 'bg-orange-500 text-white'

                            : 'bg-white/20 text-white hover:bg-white/30'

                        }`}

                      >

                        {filter}

                      </button>

                    ))}

                  </div>

                </div>

              </motion.div>

            )}



            {/* Music Selector */}

            {showCameraMusic && (

              <motion.div

                initial={{ opacity: 0, y: 20 }}

                animate={{ opacity: 1, y: 0 }}

                className="absolute bottom-32 left-0 right-0 px-4 z-20"

              >

                <div className="bg-black/80 backdrop-blur-lg rounded-2xl p-4 max-h-64 overflow-y-auto">

                  <p className="text-white text-sm font-semibold mb-3">Sélectionner une musique</p>

                  

                  {/* Import Music Button */}

                  <button

                    onClick={() => musicInputRef.current?.click()}

                    className="w-full px-4 py-3 mb-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-all flex items-center justify-center gap-2 font-medium"

                  >

                    <Upload className="w-4 h-4" />

                    Importer ma musique

                  </button>

                  

                  {/* Pre-made Music List */}

                  {['Afrobeat Vibes', 'Coupé-Décalé', 'Amapiano', 'Rumba', 'Ndombolo', 'Aucune'].map((music) => (

                    <button

                      key={music}

                      onClick={() => {

                        setVideoData(prev => ({ 

                          ...prev, 

                          music_title: music === 'Aucune' ? '' : music,

                          music_id: music === 'Aucune' ? '' : music.toLowerCase().replace(/\s+/g, '_')

                        }));

                        setShowCameraMusic(false);

                        if (music !== 'Aucune') {

                          toast.success(`🎵 ${music} sélectionnée`);

                        }

                      }}

                      className="w-full text-left px-4 py-3 text-white hover:bg-white/10 rounded-lg transition-all flex items-center gap-2"

                    >

                      <Music2 className="w-4 h-4" />

                      {music}

                    </button>

                  ))}

                </div>

              </motion.div>

            )}



            {/* Hidden Music File Input */}

            <input

              ref={musicInputRef}

              type="file"

              accept="audio/*"

              onChange={async (e) => {

                const file = e.target.files?.[0];

                if (file) {

                  try {

                    toast.loading('Upload de la musique...');

                    const uploadResult = await api.upload.image(file);

                    setVideoData(prev => ({ 

                      ...prev, 

                      music_title: file.name.replace(/\.[^/.]+$/, ''),

                      music_id: uploadResult.file_url

                    }));

                    setShowCameraMusic(false);

                    toast.dismiss();

                    toast.success(`🎵 ${file.name} ajoutée`);

                  } catch (error) {

                    console.error('Music upload error:', error);

                    toast.error('Erreur lors de l\'upload de la musique');

                  }

                }

                // Réinitialiser l'input pour permettre de sélectionner le même fichier à nouveau

                e.target.value = '';

              }}

            />

          </motion.div>

        )}



        {/* Step: Live Streaming */}

        {step === 'live' && (

          <motion.div
            key="live"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col bg-black relative h-full"
          >

            {/* Live Camera Preview */}

            <video

              ref={videoRef}

              autoPlay

              playsInline

              muted={isMuted}

              className="absolute inset-0 w-full h-full object-cover bg-black"

              style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}

              onLoadedMetadata={(e) => {
                const video = e.target;
                if (video instanceof HTMLVideoElement) {
                  video.play().catch(() => {});
                }
              }}

            />



            {/* Live Overlay */}

            <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/80 z-10" />



            {/* Top Info */}

            <div className="absolute top-0 left-0 right-0 p-4 z-20">

              <div className="flex items-center justify-between">

                <div className="flex items-center gap-3">

                  <div className="flex items-center gap-2 bg-red-500 px-3 py-1 rounded-full">

                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" />

                    <span className="text-white font-bold text-sm">LIVE</span>

                  </div>

                  <div className="flex items-center gap-1 bg-black/50 px-3 py-1 rounded-full">

                    <Eye className="w-4 h-4 text-white" />

                    <span className="text-white font-medium text-sm">{liveViewers}</span>

                  </div>

                </div>

                

                <Button

                  variant="ghost"

                  size="icon"

                  onClick={switchCamera}

                  className="text-white bg-black/30 hover:bg-black/50 rounded-full"

                >

                  <FlipHorizontal className="w-5 h-5" />

                </Button>

              </div>



              {/* Live Title Input */}

              <Input

                placeholder="Titre du live..."

                value={videoData.title}

                onChange={(e) => setVideoData(prev => ({ ...prev, title: e.target.value }))}

                className="mt-4 bg-black/50 border-white/20 text-white placeholder:text-white/50 rounded-xl"

              />

            </div>



            {/* Live Comments */}

            <div className="absolute bottom-32 left-0 right-0 px-4 z-20">

              <div className="space-y-2 max-h-48 overflow-y-auto">

                {liveComments.map((comment, index) => (

                  <motion.div

                    key={index}

                    initial={{ opacity: 0, x: -20 }}

                    animate={{ opacity: 1, x: 0 }}

                    className="flex items-center gap-2 bg-black/40 backdrop-blur rounded-full px-3 py-2 w-fit"

                  >

                    <span className="text-orange-400 font-medium text-sm">{comment.user}</span>

                    <span className="text-white text-sm">{comment.text}</span>

                  </motion.div>

                ))}

              </div>

            </div>



            {/* Bottom Controls */}

            <div className="absolute bottom-0 left-0 right-0 p-4 z-20">

              <div className="flex items-center justify-between">

                <div className="flex gap-3">

                  <Button

                    variant="ghost"

                    size="icon"

                    onClick={() => setIsMuted(!isMuted)}

                    className="text-white bg-black/30 hover:bg-black/50 rounded-full"

                  >

                    {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}

                  </Button>

                  <Button

                    variant="ghost"

                    size="icon"

                    className="text-white bg-black/30 hover:bg-black/50 rounded-full"

                  >

                    <Sparkles className="w-5 h-5" />

                  </Button>

                </div>



                <Button

                  onClick={endLive}

                  className="bg-red-500 hover:bg-red-600 text-white rounded-full px-8"

                >

                  Terminer le Live

                </Button>



                <div className="flex gap-3">

                  <div className="flex items-center gap-1 bg-black/30 px-3 py-2 rounded-full">

                    <Gift className="w-4 h-4 text-yellow-400" />

                    <span className="text-white text-sm">{liveGifts}</span>

                  </div>

                  <Button

                    variant="ghost"

                    size="icon"

                    className="text-white bg-black/30 hover:bg-black/50 rounded-full"

                  >

                    <MessageCircle className="w-5 h-5" />

                  </Button>

                </div>

              </div>

            </div>

          </motion.div>

        )}



        {/* Step: Edit Preview */}

        {step === 'edit' && (

          <motion.div
            key="edit"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            className="flex flex-col min-h-full"
          >

            <div className="flex-shrink-0 flex items-center justify-between p-4">

              <Button

                variant="ghost"

                size="icon"

                onClick={() => {

                  setSelectedFile(null);

                  setPreviewUrl(null);

                  setStep('select');

                }}

                className="text-white hover:bg-white/10"

              >

                <ArrowLeft className="w-6 h-6" />

              </Button>

              <h1 className="text-white text-lg font-bold">Prévisualisation</h1>

              <Button

                onClick={() => setStep('details')}

                className="bg-white text-black hover:bg-gray-200 rounded-full px-4"

              >

                Suivant

              </Button>

            </div>



            <div className="p-4 bg-zinc-900">

              <VideoEditor

                videoRef={videoRef}

                previewUrl={previewUrl}

                initialData={videoData}

                onVideoDataChange={(updates) => {

                  setVideoData(prev => ({ ...prev, ...updates }));

                }}

              />

            </div>

          </motion.div>

        )}



        {/* Step: Details */}

        {step === 'details' && (

          <motion.div

            key="details"

            initial={{ opacity: 0, x: 100 }}

            animate={{ opacity: 1, x: 0 }}

            exit={{ opacity: 0, x: -100 }}

            className="min-h-screen bg-white"

          >

            <div className="sticky top-0 bg-white border-b z-10">

              <div className="flex items-center justify-between p-4">

                <Button

                  variant="ghost"

                  size="icon"

                  onClick={() => editingVideoId ? navigate(createPageUrl('Profile')) : setStep('edit')}

                >

                  <ArrowLeft className="w-6 h-6" />

                </Button>

                <h1 className="text-lg font-bold">
                  {isAdMode ? 'Vidéo pour la pub' : editingVideoId ? 'Modifier la vidéo' : 'Détails'}
                </h1>

                <Button

                  onClick={handlePublish}

                  className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 rounded-full px-6"

                >

                  {isAdMode ? 'Ajouter à la campagne' : 'Publier'}

                </Button>

              </div>

            </div>



            <div className="p-4 space-y-6">

              <div className="flex gap-4">

                <div className="w-24 h-32 rounded-xl overflow-hidden bg-gray-100">

                  {previewUrl && (

                    <video 

                      src={previewUrl} 

                      className="w-full h-full object-cover"

                      style={{

                        filter: videoData.filter === 'Normal' || !videoData.filter ? 'none' :

                                videoData.filter === 'Noir & Blanc' ? 'grayscale(100%)' :

                                videoData.filter === 'Sépia' ? 'sepia(100%)' :

                                videoData.filter === 'Vibrant' ? 'saturate(200%)' :

                                videoData.filter === 'Foncé' ? 'brightness(0.75)' :

                                videoData.filter === 'Lumineux' ? 'brightness(1.25)' : 'none'

                      }}

                    />

                  )}

                </div>

                {!isAdMode && (
                  <div className="flex-1">

                    <Textarea

                      placeholder="Décrivez votre vidéo..."

                      value={videoData.description}

                      onChange={(e) => setVideoData(prev => ({ ...prev, description: e.target.value }))}

                      className="h-32 resize-none rounded-xl"

                    />

                  </div>
                )}

              </div>



              {!isAdMode && (
              <>
              <div>

                <Label className="text-gray-600 text-sm">Titre</Label>

                <Input

                  placeholder="Donnez un titre à votre vidéo"

                  value={videoData.title}

                  onChange={(e) => setVideoData(prev => ({ ...prev, title: e.target.value }))}

                  className="mt-1 rounded-xl"

                />

              </div>



              <div>

                <Label className="text-gray-600 text-sm">Hashtags</Label>

                <div className="flex gap-2 mt-1">

                  <Input

                    placeholder="Ajouter un hashtag"

                    value={hashtagInput}

                    onChange={(e) => setHashtagInput(e.target.value)}

                    onKeyPress={(e) => e.key === 'Enter' && handleAddHashtag()}

                    className="rounded-xl"

                  />

                  <Button onClick={handleAddHashtag} variant="outline" className="rounded-xl">

                    <Hash className="w-4 h-4" />

                  </Button>

                </div>

                {videoData.hashtags.length > 0 && (

                  <div className="flex flex-wrap gap-2 mt-2">

                    {videoData.hashtags.map((tag) => (

                      <span key={tag} className="inline-flex items-center gap-1 px-3 py-1 bg-orange-50 text-orange-600 rounded-full text-sm">

                        #{tag}

                        <button onClick={() => handleRemoveHashtag(tag)}><X className="w-3 h-3" /></button>

                      </span>

                    ))}

                  </div>

                )}

              </div>



              <div>

                <Label className="text-gray-600 text-sm">Catégorie</Label>

                <Select value={videoData.category} onValueChange={(v) => setVideoData(prev => ({ ...prev, category: v }))}>

                  <SelectTrigger className="mt-1 rounded-xl"><SelectValue placeholder="Choisir une catégorie" /></SelectTrigger>

                  <SelectContent>

                    {categories.map((cat) => (<SelectItem key={cat} value={cat} className="capitalize">{cat}</SelectItem>))}

                  </SelectContent>

                </Select>

              </div>



              <div>

                <Label className="text-gray-600 text-sm">Musique</Label>

                <div className="mt-1 space-y-2">

                  <Select 

                    value={videoData.music_title && ['Afrobeat Vibes', 'Coupé-Décalé', 'Amapiano', 'Rumba', 'Ndombolo'].includes(videoData.music_title) ? videoData.music_title : 'none'} 

                    onValueChange={(v) => {

                      if (v === 'none') {

                        setVideoData(prev => ({ ...prev, music_title: '', music_id: '' }));

                      } else if (v === 'custom') {

                        musicInputRef.current?.click();

                      } else {

                        setVideoData(prev => ({ 

                          ...prev, 

                          music_title: v, 

                          music_id: v.toLowerCase().replace(/\s+/g, '_')

                        }));

                        toast.success(`🎵 ${v} sélectionnée`);

                      }

                    }}

                  >

                    <SelectTrigger className="rounded-xl">

                      <SelectValue placeholder="Sélectionner une musique">

                        {videoData.music_title && ['Afrobeat Vibes', 'Coupé-Décalé', 'Amapiano', 'Rumba', 'Ndombolo'].includes(videoData.music_title) 

                          ? videoData.music_title 

                          : videoData.music_title ? 'Musique personnalisée' : 'Aucune musique'}

                      </SelectValue>

                    </SelectTrigger>

                    <SelectContent>

                      <SelectItem value="none">Aucune musique</SelectItem>

                      <SelectItem value="custom">Importer ma musique</SelectItem>

                      {['Afrobeat Vibes', 'Coupé-Décalé', 'Amapiano', 'Rumba', 'Ndombolo'].map((music) => (

                        <SelectItem key={music} value={music}>

                          <div className="flex items-center gap-2">

                            <Music2 className="w-4 h-4" />

                            {music}

                          </div>

                        </SelectItem>

                      ))}

                    </SelectContent>

                  </Select>

                  

                  {videoData.music_title && videoData.music_title !== 'custom' && (

                    <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 rounded-lg">

                      <Music2 className="w-4 h-4 text-orange-600" />

                      <span className="text-sm text-orange-600">{videoData.music_title}</span>

                      <button 

                        onClick={() => setVideoData(prev => ({ ...prev, music_title: '', music_id: '' }))}

                        className="ml-auto"

                      >

                        <X className="w-4 h-4 text-orange-600" />

                      </button>

                    </div>

                  )}

                </div>

              </div>



              <div>

                <Label className="text-gray-600 text-sm">Langue</Label>

                <Select value={videoData.language} onValueChange={(v) => setVideoData(prev => ({ ...prev, language: v }))}>

                  <SelectTrigger className="mt-1 rounded-xl">

                    <SelectValue placeholder="Sélectionner une langue">

                      {languages.find(l => l.code === videoData.language)?.name || 'Français'}

                    </SelectValue>

                  </SelectTrigger>

                  <SelectContent>

                    {languages.map((lang) => (

                      <SelectItem key={lang.code} value={lang.code}>

                        {lang.name}

                      </SelectItem>

                    ))}

                  </SelectContent>

                </Select>

              </div>



              <div>

                <Label className="text-gray-600 text-sm">Miniature personnalisée (optionnel)</Label>

                <div className="mt-2">

                  <Input

                    type="file"

                    accept="image/*"

                    onChange={async (e) => {

                      const file = e.target.files?.[0];

                      if (file) {

                        try {

                          const uploadResult = await api.upload.image(file);

                          setVideoData(prev => ({ ...prev, thumbnail_url: uploadResult.file_url }));

                          toast.success('Miniature ajoutée');

                        } catch (error) {

                          toast.error('Erreur lors de l\'upload de la miniature');

                        }

                      }

                    }}

                    className="rounded-xl"

                  />

                  {videoData.thumbnail_url && (

                    <div className="mt-2 relative w-32 h-20 rounded-lg overflow-hidden">

                      <img src={videoData.thumbnail_url} alt="Miniature" className="w-full h-full object-cover" />

                      <button

                        onClick={() => setVideoData(prev => ({ ...prev, thumbnail_url: '' }))}

                        className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 hover:bg-black/70"

                      >

                        <X className="w-3 h-3" />

                      </button>

                    </div>

                  )}

                </div>

              </div>



              <div>

                <Label className="text-gray-600 text-sm">Visibilité</Label>

                <div className="space-y-2 mt-2">

                  {visibilityOptions.map((opt) => {

                    const Icon = opt.icon;

                    return (

                      <button

                        key={opt.value}

                        onClick={() => setVideoData(prev => ({ ...prev, visibility: opt.value }))}

                        className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${

                          videoData.visibility === opt.value ? 'border-orange-500 bg-orange-50' : 'border-gray-100'

                        }`}

                      >

                        <Icon className={`w-5 h-5 ${videoData.visibility === opt.value ? 'text-orange-500' : 'text-gray-400'}`} />

                        <div className="text-left">

                          <p className="font-medium">{opt.label}</p>

                          <p className="text-xs text-gray-400">{opt.description}</p>

                        </div>

                        {videoData.visibility === opt.value && <Check className="w-5 h-5 text-orange-500 ml-auto" />}

                      </button>

                    );

                  })}

                </div>

              </div>

              </>
              )}

            </div>

          </motion.div>

        )}



        {/* Step: Uploading */}

        {step === 'uploading' && (

          <motion.div
            key="uploading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center bg-black text-white p-8 h-full"
          >

            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center mb-6">

              <Loader2 className="w-12 h-12 animate-spin" />

            </div>

            <h2 className="text-2xl font-bold mb-2">Publication en cours...</h2>

            <p className="text-gray-400 mb-8">Ne fermez pas l'application</p>

            <div className="w-full max-w-xs bg-white/10 rounded-full h-2">

              <div className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />

            </div>

            <p className="text-gray-400 mt-2">{uploadProgress}%</p>

          </motion.div>

        )}

      </AnimatePresence>

      {/* Hidden Music File Input - Accessible from all steps */}
      <input
        ref={musicInputRef}
        type="file"
        accept="audio/*"
        style={{ display: 'none' }}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file) {
            try {
              toast.loading('Upload de la musique...');
              const uploadResult = await api.upload.image(file);
              setVideoData(prev => ({ 
                ...prev, 
                music_title: file.name.replace(/\.[^/.]+$/, ''),
                music_id: uploadResult.file_url
              }));
              setShowCameraMusic(false);
              toast.dismiss();
              toast.success(`🎵 ${file.name} ajoutée`);
            } catch (error) {
              console.error('Music upload error:', error);
              toast.error('Erreur lors de l\'upload de la musique');
            }
          }
          // Réinitialiser l'input pour permettre de sélectionner le même fichier à nouveau
          e.target.value = '';
        }}
      />

    </div>

  );

}
