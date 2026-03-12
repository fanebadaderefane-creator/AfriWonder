import React, { useState, useEffect, useRef } from 'react';
import { WifiOff } from 'lucide-react';
import { useNetworkStatus } from './PerformanceOptimizer';
import { toast } from 'sonner';

/**
 * Bannière fixe affichée quand l'utilisateur est hors ligne.
 * Au retour en ligne : toast pour confirmer (UX consolidation phase 2).
 */
export default function OfflineBanner() {
  const { isOnline } = useNetworkStatus();
  const [mounted, setMounted] = useState(false);
  const wasOfflineRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!isOnline) wasOfflineRef.current = true;
    else if (wasOfflineRef.current) {
      wasOfflineRef.current = false;
      toast.success('Vous êtes de nouveau en ligne', { duration: 3000 });
    }
  }, [isOnline, mounted]);

  if (!mounted || isOnline) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 text-white text-sm font-medium shadow-lg"
      role="alert"
      aria-live="polite"
    >
      <WifiOff className="w-5 h-5 shrink-0" aria-hidden />
      <span>Vous êtes hors ligne. Les données peuvent ne pas être à jour.</span>
    </div>
  );
}
