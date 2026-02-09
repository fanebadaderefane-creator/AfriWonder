import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Indicateur global : en ligne / hors ligne.
 * Affiche une bannière quand offline et option sync au retour.
 */
export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [showBackOnline, setShowBackOnline] = useState(false);

  useEffect(() => {
    let backOnlineTimer = null;
    const handleOffline = () => {
      setIsOnline(false);
      setShowBackOnline(false);
    };
    const handleOnline = () => {
      setIsOnline(true);
      setShowBackOnline(true);
      if (backOnlineTimer) clearTimeout(backOnlineTimer);
      backOnlineTimer = setTimeout(() => setShowBackOnline(false), 4000);
    };
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
      if (backOnlineTimer) clearTimeout(backOnlineTimer);
    };
  }, []);

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <>
      <AnimatePresence>
        {!isOnline && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-white shadow-lg"
          >
            <div className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium">
              <WifiOff className="w-5 h-5 shrink-0" />
              <span>Mode hors ligne — Certaines fonctionnalités sont limitées.</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showBackOnline && isOnline && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="fixed top-0 left-0 right-0 z-[100] bg-green-500 text-white shadow-lg"
          >
            <div className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium">
              <Wifi className="w-5 h-5 shrink-0" />
              <span>Vous êtes de nouveau en ligne.</span>
              <button
                type="button"
                onClick={handleRefresh}
                className="flex items-center gap-1 underline"
              >
                <RefreshCw className="w-4 h-4" /> Actualiser
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
