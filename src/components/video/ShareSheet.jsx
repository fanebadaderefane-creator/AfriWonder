// @ts-nocheck
import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { MessageCircle, Send, Download, Link2, Users, Bluetooth, Wifi, Music2, Facebook, Save, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from "sonner";
import offlineCacheService from '@/services/offlineCache.service.js';
import { API_URL } from '@/api/expressClient';
import { getAbsoluteImageUrl } from '@/lib/utils';

/** URL pour récupérer la vidéo via le proxy (évite CORS avec le CDN). */
function getVideoFetchUrl(videoUrl) {
  if (!videoUrl || typeof videoUrl !== 'string') return '';
  const base = API_URL.startsWith('/') ? window.location.origin + API_URL : API_URL;
  return `${base.replace(/\/$/, '')}/proxy/media?url=${encodeURIComponent(videoUrl)}`;
}

const shareOptions = [
  { id: 'whatsapp', name: 'WhatsApp', icon: MessageCircle, color: 'bg-green-500' },
  { id: 'telegram', name: 'Telegram', icon: Send, color: 'bg-blue-500' },
  { id: 'facebook', name: 'Facebook', icon: Facebook, color: 'bg-blue-700' },
  { id: 'tiktok', name: 'TikTok', icon: Music2, color: 'bg-black' },
  { id: 'copy', name: 'Copier lien', icon: Link2, color: 'bg-gray-500' },
  { id: 'download', name: 'Télécharger', icon: Download, color: 'bg-purple-500' },
];

const offlineOptions = [
  { id: 'bluetooth', name: 'Bluetooth', icon: Bluetooth, color: 'bg-indigo-500', description: 'Sans data' },
  { id: 'nearby', name: 'WiFi Direct', icon: Wifi, color: 'bg-cyan-500', description: 'Proches de vous' },
  { id: 'offline', name: 'Pour hors ligne', icon: Save, color: 'bg-blue-500', description: "Dans l'app" },
];

export default function ShareSheet({ isOpen, onClose, video, onShareSuccess }) {
  const [downloading, setDownloading] = useState(false);
  const getVideoUrl = () => `${window.location.origin}/VideoView/?id=${video?.id}`;
  const previewImage = getAbsoluteImageUrl(video?.thumbnail_url || video?.creator_avatar || '');

  /** Télécharger la vidéo sur l'appareil (Galerie / Téléchargements) */
  const saveVideoToDevice = async () => {
    if (!video?.video_url) {
      toast.error('URL de vidéo non disponible');
      return;
    }
    setDownloading(true);
    try {
      const fetchUrl = getVideoFetchUrl(video.video_url);
      const res = await fetch(fetchUrl, { credentials: 'include' });
      if (!res.ok) throw new Error('Erreur réseau');
      const blob = await res.blob();
      const safeTitle = (video.title || 'AfriWonder-video').replace(/[^a-zA-Z0-9-_\.]/g, '_').slice(0, 80);
      const filename = `${safeTitle}.mp4`;
      const file = new File([blob], filename, { type: blob.type || 'video/mp4' });

      const canShareFile = typeof navigator.share === 'function' && navigator.canShare?.({ files: [file] });
      if (canShareFile) {
        await navigator.share({
          title: video.title || 'Vidéo AfriWonder',
          text: 'Vidéo enregistrée depuis AfriWonder',
          files: [file],
        });
        toast.success('Choisissez « Enregistrer dans la galerie » ou « Photos » pour retrouver la vidéo.');
        onShareSuccess?.();
        onClose();
        return;
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      toast.success('Vidéo enregistrée dans Téléchargements. Pour la voir dans la Galerie : ouvrez le fichier puis Partager → Enregistrer dans la galerie.');
      onShareSuccess?.();
      onClose();
    } catch (err) {
      console.error('Save video to device:', err);
      toast.error('Impossible d\'enregistrer la vidéo. Réessayez.');
    } finally {
      setDownloading(false);
    }
  };

  /** Enregistrer pour lecture hors ligne (cache dans l'app) */
  const saveForOffline = async () => {
    if (!video?.video_url) {
      toast.error('URL de vidéo non disponible');
      return;
    }
    if (!offlineCacheService.isCacheSupported()) {
      toast.error('Cache non supporté sur cet appareil');
      return;
    }
    try {
      toast.info('Téléchargement pour hors ligne...');
      const result = await offlineCacheService.downloadMedia({
        id: video.id,
        video_url: video.video_url,
        title: video.title || 'Vidéo',
        creator_name: video.creator_name || video.creator?.full_name,
      });
      if (result.success) {
        toast.success('Vidéo enregistrée pour la lecture hors ligne');
      } else {
        toast.error(result.error || 'Erreur lors du téléchargement');
      }
      onShareSuccess?.();
      onClose();
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Erreur lors du téléchargement');
      onClose();
    }
  };

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
        await saveVideoToDevice();
        break;
      }
      case 'offline': {
        await saveForOffline();
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
      <SheetContent side="bottom" className="rounded-t-[32px] border border-white/10 bg-[#0b111d] text-white shadow-[0_-24px_80px_rgba(2,6,23,0.42)]">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-center text-base font-semibold tracking-[-0.03em] text-white">Partager</SheetTitle>
        </SheetHeader>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="mb-6 rounded-[24px] border border-white/8 bg-white/[0.04] p-3 shadow-[0_18px_54px_rgba(2,6,23,0.22)]"
        >
          <div className="flex items-center gap-3">
            <div className="h-16 w-16 overflow-hidden rounded-[18px] border border-white/10 bg-[linear-gradient(135deg,#172554_0%,#0b111d_100%)]">
              {previewImage ? (
                <img
                  src={previewImage}
                  alt={video?.title || 'Aperçu vidéo'}
                  className="h-full w-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top,rgba(96,165,250,0.22),transparent_38%),linear-gradient(180deg,#1d4ed8_0%,#0b111d_100%)]" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">
                {video?.title || 'Vidéo AfriWonder'}
              </p>
              <p className="mt-1 truncate text-xs text-white/48">
                @{video?.creator_name || video?.creator?.username || 'afriwonder'}
              </p>
              <p className="mt-2 text-[11px] text-white/56">
                Partage optimisé pour WhatsApp, Telegram, TikTok, Facebook et hors ligne.
              </p>
            </div>
          </div>
        </motion.div>

        <div className="mb-6 grid grid-cols-3 gap-4 sm:grid-cols-6">
          {shareOptions.map((option, index) => {
            const Icon = option.icon;
            const isDownload = option.id === 'download';
            const isLoading = isDownload && downloading;
            return (
              <motion.button
                key={option.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => handleShare(option.id)}
                disabled={isLoading}
                className="flex flex-col items-center gap-2 disabled:opacity-60"
                whileTap={{ scale: 0.95 }}
              >
                <div className={`flex h-14 w-14 items-center justify-center rounded-full ${option.color} shadow-[0_14px_28px_rgba(2,6,23,0.22)]`}>
                  {isLoading ? <Loader2 className="w-6 h-6 text-white animate-spin" /> : <Icon className="w-6 h-6 text-white" />}
                </div>
                <span className="text-xs text-white/62">{isLoading ? 'Chargement…' : option.name}</span>
              </motion.button>
            );
          })}
        </div>

        <div className="border-t border-white/8 pt-4">
          <div className="mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-300" />
            <span className="text-sm font-medium text-white/78">Partage sans internet</span>
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
                  className="flex items-center gap-3 rounded-[20px] border border-white/10 bg-white/[0.04] p-3 text-left transition-all hover:bg-white/[0.07]"
                  whileTap={{ scale: 0.98 }}
                >
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full ${option.color}`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-white">{option.name}</p>
                    <p className="text-xs text-white/42">{option.description}</p>
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
