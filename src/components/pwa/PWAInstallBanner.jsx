import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const STORAGE_KEY = 'afw_pwa_install_dismissed';
const STORAGE_EXPIRY_DAYS = 7;

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true
    || document.referrer.includes('android-app://');
}

export default function PWAInstallBanner({ isFullScreen = false, currentPageName }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [isIOSDevice, setIsIOSDevice] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isStandalone()) return;

    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (dismissed) {
      const expiry = parseInt(dismissed, 10);
      if (Date.now() < expiry) return;
    }

    if (isIOS()) {
      setIsIOSDevice(true);
      setShowIOSInstructions(true);
      return;
    }

    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setShowBanner(false);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setShowIOSInstructions(false);
    localStorage.setItem(STORAGE_KEY, String(Date.now() + STORAGE_EXPIRY_DAYS * 24 * 60 * 60 * 1000));
  };

  if (!showBanner && !showIOSInstructions) return null;

  const basePositionStyle = isFullScreen
    ? {
        top: 'calc(72px + env(safe-area-inset-top))',
        bottom: 'auto',
      }
    : {
        bottom: 'calc(80px + env(safe-area-inset-bottom))',
      };

  if (isIOSDevice && showIOSInstructions) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed left-4 right-4 z-[90] mx-auto max-w-md rounded-xl bg-black/95 text-white shadow-xl border border-white/10"
          style={basePositionStyle}
        >
          <div className="flex items-start justify-between gap-3 p-4">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">Installer AfriWonder sur votre écran d'accueil</p>
              <p className="text-xs text-white/80 mt-1">
                Safari → Partager <span className="inline-block mx-1">⎋</span> → « Ajouter à l'écran d'accueil »
              </p>
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

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed left-4 right-4 z-[90] mx-auto max-w-md rounded-xl bg-black/95 text-white shadow-xl border border-white/10 flex items-center gap-3 p-3 sm:p-4"
        style={basePositionStyle}
      >
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">Installer l'app AfriWonder</p>
          <p className="text-xs text-white/80">Accès rapide depuis l'écran d'accueil</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleInstall}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500 hover:bg-blue-600 font-medium text-sm"
          >
            <Download className="w-4 h-4" />
            Installer
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="p-2 rounded-full hover:bg-white/10"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
