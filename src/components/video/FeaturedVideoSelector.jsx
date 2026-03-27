import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Star, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from "sonner";
import { api } from '@/api/expressClient';
import { getVideoPrimarySourceUrl, getVideoPrimarySourceUrlForFrameGrab, isValidThumbnailUrl } from '@/lib/utils';
import VideoFrameThumbnail from './VideoFrameThumbnail';

export default function FeaturedVideoSelector({ isOpen, onClose, videos, currentFeaturedId, _userId, onSuccess }) {
  const handleSetFeatured = async (videoId) => {
    try {
      const updates = videos.map(v =>
        api.videos.update(v.id, { is_featured: v.id === videoId })
      );
      await Promise.all(updates);

      toast.success('Vidéo mise en avant avec succès');
      onClose();
      onSuccess?.();
    } catch (err) {
      console.error('Featured video update error:', err);
      toast.error(err?.response?.data?.error?.message || 'Erreur lors de la mise à jour');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="w-5 h-5 text-blue-500" />
            Choisir une vidéo mise en avant
          </DialogTitle>
        </DialogHeader>
        
        <div className="text-sm text-gray-500 mb-4">
          Sélectionnez la vidéo qui sera affichée en grand sur votre profil
        </div>

        <div className="grid grid-cols-2 gap-3">
          {videos.map((video, index) => {
            const primaryVideoUrl = getVideoPrimarySourceUrlForFrameGrab(video);
            const canonicalVideoUrl = getVideoPrimarySourceUrl(video);
            return (
            <motion.div
              key={video.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => handleSetFeatured(video.id)}
              className={`relative cursor-pointer rounded-xl overflow-hidden border-2 transition-all ${
                video.id === currentFeaturedId 
                  ? 'border-blue-500 shadow-lg' 
                  : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              <div className="aspect-video bg-gray-900">
                {isValidThumbnailUrl(video.thumbnail_url, canonicalVideoUrl) ? (
                  <img
                    src={video.thumbnail_url}
                    alt={video.title}
                    className="w-full h-full object-cover"
                  />
                ) : primaryVideoUrl ? (
                  <VideoFrameThumbnail videoUrl={primaryVideoUrl} thumbnailUrl={video.thumbnail_url} alt={video.title} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">Pas de miniature</div>
                )}
              </div>
              
              {video.id === currentFeaturedId && (
                <div className="absolute top-2 right-2 bg-blue-500 rounded-full p-1">
                  <Check className="w-4 h-4 text-white" />
                </div>
              )}
              
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                <p className="text-white text-xs font-medium truncate">{video.title}</p>
                <p className="text-white/70 text-[10px]">{video.views} vues</p>
              </div>
            </motion.div>
            );
          })}
        </div>

        <Button
          onClick={onClose}
          variant="outline"
          className="w-full mt-4"
        >
          Annuler
        </Button>
      </DialogContent>
    </Dialog>
  );
}

