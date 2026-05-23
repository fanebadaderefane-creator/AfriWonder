import React, { useState, useEffect, useCallback } from 'react';
import { Bell, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import PushNotificationService from '@/components/common/PushNotificationService';

const STORAGE_KEY = 'afw_push_optin_dismissed';
const STORAGE_DAYS = 14;

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true
    || document.referrer.includes('android-app://');
}

function hasVapidPublicKey() {
  const v = import.meta.env.VITE_VAPID_PUBLIC_KEY || import.meta.env.REACT_APP_VAPID_PUBLIC_KEY || '';
  return !!String(v).trim();
}

/**
 * Bandeau opt-in notifications push — déclenché par un clic utilisateur
 * (meilleure compatibilité iOS / politiques navigateurs que le seul prompt au chargement).
 */
export default function PushOptInBanner({ userId, isFullScreen = false }) {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  const refreshVisibility = useCallback(() => {
    if (!userId || typeof window === 'undefined') {
      setVisible(false);
      return;
    }
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      setVisible(false);
      return;
    }
    if (!window.isSecureContext) {
      setVisible(false);
      return;
    }
    if (!hasVapidPublicKey()) {
      setVisible(false);
      return;
    }
    // Sur iOS, le Web Push utilisable en pratique pour une notification hors Safari
    // nécessite l’app sur l’écran d’accueil (sinon on évite un bandeau trompeur).
    if (isIOS() && !isStandalone()) {
      setVisible(false);
      return;
    }
    if (Notification.permission !== 'default') {
      setVisible(false);
      return;
    }

    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (dismissed) {
      const exp = parseInt(dismissed, 10);
      if (!Number.isNaN(exp) && Date.now() < exp) {
        setVisible(false);
        return;
      }
    }

    setVisible(true);
  }, [userId]);

  useEffect(() => {
    refreshVisibility();
  }, [refreshVisibility]);

  useEffect(() => {
    const onFocus = () => refreshVisibility();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refreshVisibility]);

  const handleDismiss = () => {
    setVisible(false);
    localStorage.setItem(
      STORAGE_KEY,
      String(Date.now() + STORAGE_DAYS * 24 * 60 * 60 * 1000),
    );
  };

  const handleEnable = async () => {
    if (!userId || busy) return;
    setBusy(true);
    try {
      const ok = await PushNotificationService.subscribeToPushNotifications(userId);
      if (ok) {
        toast.success('Notifications activées — vous recevrez des mises à jour même lorsque l’application est fermée.');
        setVisible(false);
      } else {
        toast.error('Activation impossible — vérifiez l’autorisation des notifications dans les réglages du navigateur ou du téléphone.');
      }
    } catch {
      toast.error('Erreur lors de l’activation des notifications');
    } finally {
      setBusy(false);
    }
  };

  if (!visible) return null;

  const basePositionStyle = isFullScreen
    ? {
        top: 'calc(72px + env(safe-area-inset-top))',
        bottom: 'auto',
      }
    : {
        bottom: 'calc(88px + env(safe-area-inset-bottom))',
      };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 16 }}
        className="fixed left-4 right-4 z-[88] mx-auto max-w-md rounded-xl bg-slate-900 text-white shadow-xl border border-orange-500/35"
        style={basePositionStyle}
        role="region"
        aria-label="Activer les notifications"
      >
        <div className="flex items-start justify-between gap-3 p-4">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm flex items-center gap-2">
              <Bell className="w-4 h-4 text-orange-400 shrink-0" aria-hidden />
              Activer les notifications
            </p>
            <p className="text-xs text-white/75 mt-1">
              Recevez les messages et l’actualité, même lorsque l’application est fermée. Touchez le bouton, puis confirmez « Autoriser » dans la fenêtre du navigateur.
            </p>
            <button
              type="button"
              onClick={handleEnable}
              disabled={busy}
              className="mt-3 w-full sm:w-auto px-4 py-2 rounded-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60 font-medium text-sm text-white"
            >
              {busy ? 'Activation en cours…' : 'Activer les notifications'}
            </button>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            className="shrink-0 p-1 rounded-full hover:bg-white/10"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
