import React, { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';
import { useNetworkStatus } from './PerformanceOptimizer';

/**
 * Bannière fixe affichée quand l'utilisateur est hors ligne.
 * Production-ready : message clair, pas de crash si navigator non dispo.
 */
export default function OfflineBanner() {
  const { isOnline } = useNetworkStatus();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || isOnline) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-2 py-2.5 px-4 bg-amber-600 text-white text-sm font-medium shadow-lg"
      role="alert"
      aria-live="polite"
    >
      <WifiOff className="w-5 h-5 shrink-0" aria-hidden />
      <span>Vous êtes hors ligne. Les données peuvent ne pas être à jour.</span>
    </div>
  );
}
