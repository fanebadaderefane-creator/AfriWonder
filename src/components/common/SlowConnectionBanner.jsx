import React, { useEffect, useState } from 'react';
import { Info } from 'lucide-react';
import { useNetworkStatus } from './PerformanceOptimizer';

const DISMISS_KEY = 'afw_slow_connection_dismissed';
const DISMISS_VALID_MS = 7 * 24 * 60 * 60 * 1000; // 7 jours

/**
 * Bannière discrète pour connexions lentes.
 * S'appuie sur navigator.connection (2G/3G/saveData) via useNetworkStatus.
 * La fermeture est mémorisée 7 jours (localStorage) pour ne pas réafficher à chaque ouverture.
 */
export default function SlowConnectionBanner() {
  const { isOnline, isSlowConnection } = useNetworkStatus();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DISMISS_KEY);
      if (!raw) return;
      const at = parseInt(raw, 10);
      if (!Number.isNaN(at) && Date.now() - at < DISMISS_VALID_MS) {
        setDismissed(true);
      }
    } catch {
      // ignore
    }
  }, []);

  if (!isOnline || !isSlowConnection || dismissed) return null;

  const handleClose = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // ignore
    }
  };

  return (
    <div
      className="fixed top-10 left-0 right-0 z-[9998] flex items-center justify-between gap-2 px-4 py-2 bg-blue-600/95 text-white text-xs sm:text-sm shadow-md"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2">
        <Info className="w-4 h-4 shrink-0" aria-hidden />
        <span>
          Connexion lente détectée — AfriWonder réduit la qualité pour rester fluide.
        </span>
      </div>
      <button
        type="button"
        onClick={handleClose}
        className="ml-2 text-blue-100 hover:text-white text-[11px] font-medium underline-offset-2 hover:underline"
        aria-label="Masquer le message de connexion lente"
      >
        OK
      </button>
    </div>
  );
}

