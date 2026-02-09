import React, { useState, useEffect } from 'react';
import { api } from '@/api/expressClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import VideoCard from '../components/video/VideoCard';
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

  // Get video ID from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (id) {
      setVideoId(id);
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

  // Fetch comments
  const { data: comments = [] } = useQuery({
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
      queryClient.invalidateQueries(['video', videoId]);
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

  // Comment mutation
  const commentMutation = useMutation({
    mutationFn: async ({ content, parentId }) => {
      if (!user) {
        toast.error('Connectez-vous pour commenter');
        return;
      }
      await api.videos.comment(videoId, content, parentId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['comments', videoId]);
      queryClient.invalidateQueries(['video', videoId]);
      toast.success('Commentaire ajouté');
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

  if (isLoading || !video) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-black">
        <div className="w-10 h-10 border-4 border-orange-500 border-_t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-black relative">
      {/* Back Button */}
      <div className="absolute top-4 left-4 z-50">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(createPageUrl('Home'))}
          className="bg-black/50 text-white hover:bg-black/70 rounded-full backdrop-blur"
        >
          <ArrowLeft className="w-6 h-6" />
        </Button>
      </div>

      {/* Video */}
      <VideoCard
        video={video}
        isActive={true}
        isLiked={isLiked}
        isSaved={isSaved}
        isMuted={isMuted}
        onMuteToggle={() => setIsMuted(!isMuted)}
        onLike={() => likeMutation.mutate()}
        onComment={() => setShowComments(true)}
        _onShare={() => setShowShare(true)}
        onSave={() => saveMutation.mutate()}
        onProfileClick={(creatorId) => {
          navigate(`${createPageUrl('Profile')}?_userId=${creatorId}`);
        }}
      />

      {/* Comments Sheet */}
      <CommentSheet
        isOpen={showComments}
        onClose={() => setShowComments(false)}
        videoId={videoId}
        comments={comments}
        onAddComment={(content, parentId) => commentMutation.mutate({ content, parentId })}
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
      />
    </div>
  );
}