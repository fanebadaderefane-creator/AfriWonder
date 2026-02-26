import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Share2,
  Wifi,
  ArrowLeft,
  Link2,
  Copy,
  MessageCircle,
  Send,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import BottomNav from '@/components/navigation/BottomNav';
import { toast } from 'sonner';

const canNativeShare = typeof navigator !== 'undefined' && !!navigator.share;

export default function ShareOffline() {
  const navigate = useNavigate();
  const [shareUrl, setShareUrl] = useState('');
  const [shareTitle, setShareTitle] = useState('Découvre AfriWonder');

  const handleShareLink = async () => {
    const url = shareUrl || window.location.origin;
    const text = shareTitle || 'Rejoins-moi sur AfriWonder !';

    if (canNativeShare) {
      try {
        await navigator.share({
          title: shareTitle,
          text,
          url,
        });
        toast.success('Partage réussi');
      } catch (e) {
        if (e.name !== 'AbortError') toast.error('Partage annulé ou indisponible');
      }
    } else {
      try {
        await navigator.clipboard.writeText(`${text}\n${url}`);
        toast.success('Lien copié dans le presse-papier');
      } catch {
        toast.error('Copie impossible');
      }
    }
  };

  const shareOptions = [
    {
      id: 'whatsapp',
      label: 'WhatsApp',
      icon: MessageCircle,
      color: 'bg-green-500',
      action: () => {
        const url = shareUrl || window.location.origin;
        const text = encodeURIComponent((shareTitle || 'Rejoins AfriWonder !') + '\n' + url);
        window.open(`https://wa.me/?text=${text}`, '_blank');
      },
    },
    {
      id: 'telegram',
      label: 'Telegram',
      icon: Send,
      color: 'bg-blue-500',
      action: () => {
        const url = shareUrl || window.location.origin;
        window.open(
          `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(shareTitle || 'AfriWonder')}`,
          '_blank'
        );
      },
    },
    {
      id: 'copy',
      label: 'Copier le lien',
      icon: Copy,
      color: 'bg-gray-500',
      action: async () => {
        const url = shareUrl || window.location.origin;
        await navigator.clipboard.writeText(url);
        toast.success('Lien copié');
      },
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-gradient-to-br from-blue-500 to-purple-600 text-white p-6">
        <button type="button" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-2xl font-bold mb-2">Partage local & rapide</h1>
        <p className="text-blue-100">
          Partager un lien ou une page sans quitter l’app — Web Share et raccourcis.
        </p>
      </div>

      <div className="p-4 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl p-4 shadow-sm border"
        >
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <Link2 className="w-5 h-5 text-blue-500" />
            Partager un lien
          </h2>
          <input
            type="text"
            placeholder="Titre (ex: Ma vidéo)"
            value={shareTitle}
            onChange={(e) => setShareTitle(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg mb-2 text-sm"
          />
          <input
            type="url"
            placeholder="URL à partager (vide = page d’accueil)"
            value={shareUrl}
            onChange={(e) => setShareUrl(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg mb-3 text-sm"
          />
          <Button className="w-full bg-gradient-to-r from-blue-500 to-purple-600" onClick={handleShareLink}>
            <Share2 className="w-4 h-4 mr-2" />
            {canNativeShare ? 'Ouvrir le partage natif' : 'Copier le lien'}
          </Button>
        </motion.div>

        <div>
          <h2 className="font-semibold mb-3">Partage rapide</h2>
          <div className="grid grid-cols-1 gap-3">
            {shareOptions.map((opt) => {
              const Icon = opt.icon;
              return (
                <motion.button
                  key={opt.id}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className="flex items-center gap-4 p-4 bg-white rounded-xl border shadow-sm text-left"
                  onClick={opt.action}
                >
                  <div className={`w-12 h-12 rounded-full ${opt.color} flex items-center justify-center`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <span className="font-medium">{opt.label}</span>
                </motion.button>
              );
            })}
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex gap-2">
            <Wifi className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-blue-900">Partage sans Bluetooth</p>
              <p className="text-sm text-blue-800 mt-1">
                Le Bluetooth natif n’est pas disponible dans les navigateurs web. Utilisez le partage
                natif (Web Share), WhatsApp, Telegram ou la copie de lien pour envoyer du contenu
                rapidement.
              </p>
            </div>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
