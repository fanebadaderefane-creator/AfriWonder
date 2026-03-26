import React from 'react';
import { motion } from 'framer-motion';
import Loader2 from 'lucide-react/icons/loader-2';

/**
 * Chargement initial du fil — plein écran, sans grosse carte au centre (style produit / TikTok).
 */
export default function FeedStartupCurtain({ backgroundImage }) {
  return (
    <div
      className="absolute inset-0 z-[120] overflow-hidden bg-[#020617]"
      aria-busy="true"
      aria-live="polite"
    >
      {/* Fond = poster flouté (aperçu réel du contenu à venir) */}
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: '#020617',
          backgroundImage,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(14px)',
          transform: 'none',
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/25 to-black/70" />

      {/* Barre du haut : squelette léger */}
      <div className="absolute inset-x-0 top-0 px-3 pt-[calc(10px+env(safe-area-inset-top,0px))]">
        <div className="mx-auto flex max-w-[400px] items-center justify-between">
          <div className="h-9 w-9 rounded-full bg-white/8" />
          <div className="flex items-center gap-4">
            <div className="h-3 w-14 rounded-full bg-white/20" />
            <div className="h-3 w-16 rounded-full bg-white/12" />
          </div>
          <div className="flex gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-8 w-8 rounded-full bg-white/10" />
            ))}
          </div>
        </div>
      </div>

      {/* Colonne actions droite — verrines fines (pas de gros cercles blancs) */}
      <div className="pointer-events-none absolute bottom-[calc(7rem+env(safe-area-inset-bottom,0px))] right-4 flex flex-col items-center gap-5">
        {[1, 2, 3, 4, 5].map((i) => (
          <motion.div
            key={i}
            className="h-9 w-9 rounded-full bg-white/12"
            animate={{ opacity: [0.35, 0.55, 0.35] }}
            transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.12, ease: 'easeInOut' }}
          />
        ))}
      </div>

      {/* Bas : ligne de progression + texte (overlay léger, pas de carte) */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 px-5 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]">
        <div className="mx-auto max-w-[400px] space-y-3">
          <div className="flex items-center gap-2 text-white/88">
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-white/70" aria-hidden />
            <span className="text-[13px] font-medium tracking-tight drop-shadow-md">Chargement du fil…</span>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-white/10">
            <motion.div
              className="h-full rounded-full bg-white/55"
              initial={{ width: '18%' }}
              animate={{ width: ['18%', '72%', '38%', '90%'] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>
          <div className="space-y-2 pt-1">
            <div className="h-3 max-w-[200px] rounded-full bg-white/15" />
            <div className="h-3 max-w-[140px] rounded-full bg-white/10" />
          </div>
        </div>
      </div>
    </div>
  );
}
