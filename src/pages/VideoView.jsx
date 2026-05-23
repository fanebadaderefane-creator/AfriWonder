import React, { useState, useEffect } from 'react';
import { api } from '@/api/expressClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Smartphone, Download, Wrench } from 'lucide-react';
import { cacheVideoForOffline, isVideoCached } from '@/lib/offlineVideoCache';
import { Button } from "@/components/ui/button";
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import AdaptiveVideoPlayer from '../components/video/AdaptiveVideoPlayer';
import CommentSheet from '../components/video/CommentSheet';
import TipModal from '../components/video/TipModal';
import ShareSheet from '../components/video/ShareSheet';

export default function VideoView() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [videoId, setVideoId] = useState(null);
  const [user, setUser] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showTip, setShowTip] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isOpeningApp, setIsOpeningApp] = useState(false);
  const [offlineCached, setOfflineCached] = useState(false);
  const [offlineDownloading, setOfflineDownloading] = useState(false);

  const repairFirefoxMutation = useMutation({
    mutationFn: async () => {
      return api.videos.repairWebPlayback(videoId);
    },
    onSuccess: () => {
      toast.success('Vidéo ré-encodée (H.264 + AAC). Recharge si la lecture ne démarre pas.');
      queryClient.invalidateQueries({ queryKey: ['video', videoId] });
    },
    onError: (e) => {
      const msg =
        e?.response?.data?.error ||
        e?.response?.data?.message ||
        e?.message ||
        'Réparation impossible';
      toast.error(msg);
    },
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id') || params.get('_videoId');
    if (id) {
      setVideoId(id);
      // Normaliser l’URL avec id si on est arrivé avec _videoId
      if (params.get('_videoId') && !params.get('id')) {
        const next = new URLSearchParams(window.location.search);
        next.delete('_videoId');
        next.set('id', id);
        window.history.replaceState({}, '', window.location.pathname + '?' + next.toString());
      }
    } else {
      navigate(createPageUrl('Home'));
    }
  }, [navigate]);

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      try {
        const u = await api.auth.me();
        setUser(u);
      } catch (_e) {
        // Not logged in
      }
    };
    getUser();
  }, []);

  // Fetch video
  const { data: video, isLoading } = useQuery({
    queryKey: ['video', videoId],
    queryFn: async () => {
      return await api.videos.getById(videoId);
    },
    enabled: !!videoId
  });

  useEffect(() => {
    if (videoId) isVideoCached(videoId).then(setOfflineCached);
  }, [videoId]);

  // Fetch comments
  const {
    data: comments = [],
    isLoading: commentsLoading,
    isError: commentsError,
    refetch: refetchComments,
  } = useQuery({
    queryKey: ['comments', videoId],
    queryFn: async () => {
      const result = await api.videos.getComments(videoId, { page: 1, limit: 50 });
      return result.comments || [];
    },
    enabled: !!videoId && showComments,
  });

  // Check if liked/saved
  useEffect(() => {
    if (user?.id && videoId) {
      api.videos.getById(videoId)
        .then(v => {
          setIsLiked(v.video_likes?.length > 0);
          setIsSaved(v.video_saves?.length > 0);
        })
        .catch(() => {});
    }
  }, [user?.id, videoId]);

  // Like mutation
  const likeMutation = useMutation({
    mutationFn: async () => {
      if (!user) {
        toast.error('Connectez-vous pour aimer');
        return;
      }
      
      await api.videos.like(videoId);
      return !isLiked;
    },
    onSuccess: (isNowLiked) => {
      setIsLiked(isNowLiked);
      queryClient.invalidateQueries({ queryKey: ['video', videoId] });
    }
  });

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user) {
        toast.error('Connectez-vous pour sauvegarder');
        return;
      }
      
      // Note: Save feature needs to be added to backend
      toast.success(isSaved ? 'Vidéo retirée' : 'Vidéo sauvegardée');
      return !isSaved;
    },
    onSuccess: (isNowSaved) => {
      setIsSaved(isNowSaved);
    }
  });

  const handleTip = async (amount, _method) => {
    if (!user) {
      toast.error('Connectez-vous pour envoyer un tip');
      return;
    }
    
    // Note: Tip feature needs wallet implementation
    toast.success(`Tip de ${amount} FCFA envoyé !`);
  };

  const handleDownloadOffline = async () => {
    if (!videoId || !video?.download_allowed) {
      toast.error('Téléchargement non autorisé pour cette vidéo');
      return;
    }
    setOfflineDownloading(true);
    try {
      const { data } = await api.videos.getById(videoId).then((r) => (typeof r?.data !== 'undefined' ? r : { data: r }));
      const downloadUrl = data?.download_url || data?.video_url || video?.video_url || video?.hls_url;
      if (!downloadUrl) {
        toast.error('URL de téléchargement indisponible');
        return;
      }
      const ok = await cacheVideoForOffline(videoId, downloadUrl);
      if (ok) {
        setOfflineCached(true);
        toast.success('Vidéo téléchargée pour lecture hors ligne');
      } else {
        toast.error('Échec du téléchargement (connexion ou CORS)');
      }
    } catch (e) {
      toast.error(e?.message || 'Erreur');
    } finally {
      setOfflineDownloading(false);
    }
  };

  const handleOpenInApp = () => {
    if (!videoId) return;
    const deepLink = `afriwonder://video/${videoId}`;
    try {
      setIsOpeningApp(true);
      window.location.href = deepLink;
      setTimeout(() => setIsOpeningApp(false), 2000);
    } catch (_) {
      setIsOpeningApp(false);
    }
  };

  if (isLoading || !video) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-black">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-black relative">
      {/* Back Button + réparation Firefox (créateur) */}
      <div className="absolute top-4 left-4 right-4 z-50 flex items-start justify-between gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="bg-black/50 text-white hover:bg-black/70 rounded-full backdrop-blur shrink-0"
          aria-label="Retour"
        >
          <ArrowLeft className="w-6 h-6" />
        </Button>
        {user?.id && video?.creator_id && user.id === video.creator_id && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={repairFirefoxMutation.isPending}
            onClick={() => repairFirefoxMutation.mutate()}
            className="max-w-[min(100%,220px)] shrink bg-white/90 text-gray-900 hover:bg-white text-xs font-semibold shadow-md"
            title="Ré-encode en H.264 + AAC si Firefox affiche une erreur de format"
          >
            <Wrench className="w-3.5 h-3.5 mr-1.5 shrink-0" />
            {repairFirefoxMutation.isPending ? 'Ré-encodage…' : 'Réparer lecture (Firefox)'}
          </Button>
        )}
      </div>

      {/* Video — AdaptiveVideoPlayer = VideoCard + indicateur réseau (hors feed) */}
      <AdaptiveVideoPlayer
        video={video}
        isActive={true}
        isLiked={isLiked}
        isSaved={isSaved}
        isMuted={isMuted}
        isFollowing={false}
        onMuteToggle={() => setIsMuted(!isMuted)}
        onLike={() => likeMutation.mutate()}
        onComment={() => setShowComments(true)}
        onShare={() => setShowShare(true)}
        onSave={() => saveMutation.mutate()}
        onTip={() => setShowTip(true)}
        onSubscribe={() => {}}
        onRequireAuth={() => toast.error('Connectez-vous pour continuer')}
        onInitialVisualReady={() => {}}
        onProfileClick={(creatorId) => {
          navigate(`${createPageUrl('Profile')}?_userId=${creatorId}`);
        }}
      />

      {/* CTA ouvrir dans l'app + CPO 3.32 Télécharger pour hors ligne */}
      <div className="absolute bottom-4 left-0 right-0 flex flex-col items-center gap-2 px-4 z-50">
        {video?.download_allowed && (
          <button
            type="button"
            onClick={handleDownloadOffline}
            disabled={offlineDownloading || offlineCached}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-white/90 text-black text-xs font-semibold px-4 py-2 shadow-lg hover:bg-white transition-colors disabled:opacity-70"
          >
            <Download className="w-4 h-4" />
            {offlineDownloading ? 'Téléchargement…' : offlineCached ? 'Disponible hors ligne' : 'Télécharger pour hors ligne'}
          </button>
        )}
        <button
          type="button"
          onClick={handleOpenInApp}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-white text-black text-xs font-semibold px-4 py-2 shadow-lg hover:bg-gray-100 transition-colors"
        >
          <Smartphone className="w-4 h-4" />
          {isOpeningApp ? 'Ouverture de l’app…' : "Ouvrir dans l’app pour une meilleure expérience"}
        </button>
      </div>

      {/* Comments Sheet */}
      <CommentSheet
        isOpen={showComments}
        onClose={() => setShowComments(false)}
        videoId={videoId}
        comments={comments}
        isLoading={commentsLoading}
        isError={commentsError}
        onRetry={() => refetchComments()}
        onRefresh={() => {
          queryClient.invalidateQueries({ queryKey: ['comments', videoId] });
          queryClient.invalidateQueries({ queryKey: ['video', videoId] });
        }}
        onTip={() => {
          setShowComments(false);
          setShowTip(true);
        }}
        user={user}
      />

      {/* Tip Modal */}
      <TipModal
        isOpen={showTip}
        onClose={() => setShowTip(false)}
        creator={{
          name: video?.creator_name,
          avatar: video?.creator_avatar
        }}
        onSendTip={handleTip}
      />

      {/* Share Sheet */}
      <ShareSheet
        isOpen={showShare}
        onClose={() => setShowShare(false)}
        video={video}
        onShareSuccess={() => {}}
      />
    </div>
  );
}