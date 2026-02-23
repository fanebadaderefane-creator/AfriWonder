// @ts-nocheck
import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { MessageCircle, Send, Download, Link2, Users, Bluetooth, Wifi, Music2, Facebook } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from "sonner";
import offlineCacheService from '@/services/offlineCache.service.js';

const shareOptions = [
  { id: 'whatsapp', name: 'WhatsApp', icon: MessageCircle, color: 'bg-green-500' },
  { id: 'telegram', name: 'Telegram', icon: Send, color: 'bg-blue-500' },
  { id: 'facebook', name: 'Facebook', icon: Facebook, color: 'bg-blue-700' },
  { id: 'tiktok', name: 'TikTok', icon: Music2, color: 'bg-black' },
  { id: 'copy', name: 'Copier lien', icon: Link2, color: 'bg-gray-500' },
  { id: 'download', name: 'Telecharger', icon: Download, color: 'bg-purple-500' },
];

const offlineOptions = [
  { id: 'bluetooth', name: 'Bluetooth', icon: Bluetooth, color: 'bg-indigo-500', description: 'Sans data' },
  { id: 'nearby', name: 'WiFi Direct', icon: Wifi, color: 'bg-cyan-500', description: 'Proches de vous' },
];

export default function ShareSheet({ isOpen, onClose, video, onShareSuccess }) {
  const getVideoUrl = () => `${window.location.origin}/VideoView/?id=${video?.id}`;

  const handleShare = async (method) => {
    const url = getVideoUrl();

    switch (method) {
      case 'whatsapp': {
        const message = `Regarde cette video !\n\n${url}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
        onShareSuccess?.();
        break;
      }
      case 'telegram': {
        window.open(
          `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent('Regarde cette video !')}`,
          '_blank'
        );
        onShareSuccess?.();
        break;
      }
      case 'facebook': {
        window.open(
          `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent('Regarde cette video !')}`,
          '_blank'
        );
        onShareSuccess?.();
        break;
      }
      case 'tiktok': {
        const copyUrl = `${window.location.origin}/VideoView?id=${video?.id}`;
        await navigator.clipboard.writeText(copyUrl);
        toast.success('Lien copie ! Collez-le dans TikTok');
        window.open('https://www.tiktok.com/', '_blank');
        onShareSuccess?.();
        break;
      }
      case 'copy': {
        const copyUrl = `${window.location.origin}/VideoView?id=${video?.id}`;
        await navigator.clipboard.writeText(copyUrl);
        toast.success('Lien copie !');
        onShareSuccess?.();
        onClose();
        break;
      }
      case 'download': {
        if (!video?.video_url) {
          toast.error('URL de video non disponible');
          return;
        }
        if (!offlineCacheService.isCacheSupported()) {
          toast.error('Cache non supporte sur cet appareil');
          return;
        }
        try {
          toast.info('Telechargement pour hors ligne...');
          const payload = {
            id: video.id,
            video_url: video.video_url,
            title: video.title || 'Video',
            creator_name: video.creator_name || video.creator?.full_name,
          };
          const result = await offlineCacheService.downloadMedia(payload);
          if (result.success) {
            toast.success('Video enregistree pour la lecture hors ligne');
          } else {
            toast.error(result.error || 'Erreur lors du telechargement');
          }
        } catch (error) {
          console.error('Download error:', error);
          toast.error('Erreur lors du telechargement');
        }
        onClose();
        break;
      }
      case 'bluetooth':
      case 'nearby': {
        toast.info('Fonctionnalite bientot disponible');
        onClose();
        break;
      }
      default:
        break;
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="rounded-t-3xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-center font-bold">Partager</SheetTitle>
        </SheetHeader>

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-4 mb-6">
          {shareOptions.map((option, index) => {
            const Icon = option.icon;
            return (
              <motion.button
                key={option.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => handleShare(option.id)}
                className="flex flex-col items-center gap-2"
              >
                <div className={`w-14 h-14 ${option.color} rounded-full flex items-center justify-center`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <span className="text-xs text-gray-600">{option.name}</span>
              </motion.button>
            );
          })}
        </div>

        <div className="border-t pt-4">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-orange-500" />
            <span className="text-sm font-medium text-gray-700">Partage sans internet</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {offlineOptions.map((option, index) => {
              const Icon = option.icon;
              return (
                <motion.button
                  key={option.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + index * 0.1 }}
                  onClick={() => handleShare(option.id)}
                  className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-orange-200 hover:bg-orange-50 transition-all"
                >
                  <div className={`w-10 h-10 ${option.color} rounded-full flex items-center justify-center`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-sm">{option.name}</p>
                    <p className="text-xs text-gray-400">{option.description}</p>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
