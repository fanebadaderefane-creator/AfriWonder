/**
 * Bannière "Mise à jour" en haut de l'app à l'ouverture.
 * Les utilisateurs voient les corrections et nouveautés ; ils peuvent la fermer.
 * Réafficher pour tous en changeant APP_UPDATE_VERSION ci-dessous.
 */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles } from 'lucide-react';
import { getItem, setItem } from '@/utils/safeStorage';

const STORAGE_KEY = 'afriwonder_app_update_seen';
// Changer cette valeur à chaque nouvelle mise à jour pour réafficher la bannière à tous
const APP_UPDATE_VERSION = '2026-02-21';

const APP_UPDATE_MESSAGE = {
  title: 'Mise à jour',
  items: [
    'Prestataires : création de compte corrigée, notification admin à chaque nouveau prestataire',
    'Marketplace services : abonnement FREE/BASIC/PRO, validation admin des services et prestataires',
    'Améliorations stabilité et expérience',
  ],
};

export default function AppUpdateBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const seen = getItem(STORAGE_KEY);
      if (seen !== APP_UPDATE_VERSION) {
        setVisible(true);
      }
    } catch (_) {
      setVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    try {
      setItem(STORAGE_KEY, APP_UPDATE_VERSION);
    } catch (_) {}
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="overflow-hidden"
      >
        <div
          className="bg-gradient-to-r from-orange-500/95 to-red-500/95 text-white safe-area-pt shadow-md"
          role="region"
          aria-label="Mise à jour de l'application"
        >
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-start gap-3">
            <Sparkles className="w-5 h-5 shrink-0 mt-0.5 text-white/90" aria-hidden />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm flex items-center gap-2">
                {APP_UPDATE_MESSAGE.title}
              </p>
              <ul className="mt-1 text-xs text-white/95 space-y-0.5 list-disc list-inside">
                {APP_UPDATE_MESSAGE.items.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
            <button
              type="button"
              onClick={handleDismiss}
              className="shrink-0 p-1 rounded-full hover:bg-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
              aria-label="Fermer la mise à jour"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
