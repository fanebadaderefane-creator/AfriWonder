/**
 * Bannière "Mise à jour" affichée uniquement quand un nouveau déploiement est détecté
 * (Service Worker en attente après déploiement GitHub → Vercel/Render).
 * Le X ferme la bannière. Après "Mettre à jour" + rechargement, elle ne réapparaît pas.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles } from 'lucide-react';

const APP_UPDATE_MESSAGE = {
  title: 'Mise à jour',
  text: 'Une nouvelle version de l\'application est disponible.',
};

export default function AppUpdateBanner() {
  const [visible, setVisible] = useState(false);

  const handleDismiss = useCallback((e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setVisible(false);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    const onUpdate = () => setVisible(true);
    window.addEventListener('sw-update-available', onUpdate);
    // Au montage : afficher si un worker est déjà en attente (event émis avant mount)
    navigator.serviceWorker.ready.then((reg) => {
      if (reg?.waiting && navigator.serviceWorker.controller) setVisible(true);
    }).catch(() => {});
    return () => window.removeEventListener('sw-update-available', onUpdate);
  }, []);

  if (!visible) return null;

  const safeTop = 'max(12px, env(safe-area-inset-top))';

  const banner = (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="overflow-hidden fixed top-0 left-0 right-0 z-[99998] safe-area-pt"
          style={{ paddingTop: 'max(16px, env(safe-area-inset-top))' }}
          role="region"
          aria-label="Mise à jour de l'application"
        >
          <div className="bg-gradient-to-r from-orange-500/95 to-red-500/95 text-white shadow-md relative">
            <div className="max-w-4xl mx-auto px-4 py-3 flex items-start gap-3 pr-14">
              <Sparkles className="w-5 h-5 shrink-0 mt-0.5 text-white/90" aria-hidden />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{APP_UPDATE_MESSAGE.title}</p>
                <p className="mt-0.5 text-xs text-white/95">{APP_UPDATE_MESSAGE.text}</p>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
      {/* Bouton X dans une couche fixe séparée au-dessus de tout (y compris Accueil) */}
      <button
        type="button"
        onClick={handleDismiss}
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleDismiss(e);
        }}
        className="fixed min-w-[48px] min-h-[48px] flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 transition-colors focus:outline-none focus:ring-2 focus:ring-white/50 touch-manipulation text-white z-[100000]"
        style={{ top: safeTop, right: 12 }}
        aria-label="Fermer la mise à jour"
      >
        <X className="w-6 h-6 shrink-0" aria-hidden />
      </button>
    </>
  );

  return createPortal(banner, document.body);
}
