import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Star, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from "sonner";
import { api } from '@/api/expressClient';

export default function FeaturedVideoSelector({ isOpen, onClose, videos, currentFeaturedId, _userId }) {
  const handleSetFeatured = async (videoId) => {
    try {
      // Unfeature all other videos
      const updates = videos.map(v => 
        api.videos.update(v.id, { is_featured: v.id === videoId })
      );
      await Promise.all(updates);
      
      toast.success('Vidéo mise en avant avec succès');
      onClose();
      window.location.reload();
    } catch (_error) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="w-5 h-5 text-orange-500" />
            Choisir une vidéo mise en avant
          </DialogTitle>
        </DialogHeader>
        
        <div className="text-sm text-gray-500 mb-4">
          Sélectionnez la vidéo qui sera affichée en grand sur votre profil
        </div>

        <div className="grid grid-cols-2 gap-3">
          {videos.map((video, index) => (
            <motion.div
              key={video.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => handleSetFeatured(video.id)}
              className={`relative cursor-pointer rounded-xl overflow-hidden border-2 transition-all ${
                video.id === currentFeaturedId 
                  ? 'border-orange-500 shadow-lg' 
                  : 'border-gray-200 hover:border-orange-300'
              }`}
            >
              <div className="aspect-video">
                <img
                  src={video.thumbnail_url || video.video_url}
                  alt={video.title}
                  className="w-full h-full object-cover"
                />
              </div>
              
              {video.id === currentFeaturedId && (
                <div className="absolute top-2 right-2 bg-orange-500 rounded-full p-1">
                  <Check className="w-4 h-4 text-white" />
                </div>
              )}
              
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-_t from-black/80 to-transparent p-2">
                <p className="text-white text-xs font-medium truncate">{video.title}</p>
                <p className="text-white/70 text-[10px]">{video.views} vues</p>
              </div>
            </motion.div>
          ))}
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

