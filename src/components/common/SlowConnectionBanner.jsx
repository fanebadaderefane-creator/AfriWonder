import React, { useEffect, useState } from 'react';
import { Info } from 'lucide-react';
import { useNetworkStatus } from './PerformanceOptimizer';

/**
 * Bannière discrète pour connexions lentes.
 * S'appuie sur navigator.connection (2G/3G/saveData) via useNetworkStatus.
 */
export default function SlowConnectionBanner() {
  const { isOnline, isSlowConnection } = useNetworkStatus();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('afw_slow_connection_dismissed');
      if (stored === '1') {
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
      sessionStorage.setItem('afw_slow_connection_dismissed', '1');
    } catch {
      // ignore
    }
  };

  return (
    <div
      className="fixed top-10 left-0 right-0 z-[9998] flex items-center justify-between gap-2 px-4 py-2 bg-amber-900/95 text-amber-50 text-xs sm:text-sm shadow-md"
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
        className="ml-2 text-amber-100/80 hover:text-white text-[11px] font-medium underline-offset-2 hover:underline"
        aria-label="Masquer le message de connexion lente"
      >
        OK
      </button>
    </div>
  );
}

