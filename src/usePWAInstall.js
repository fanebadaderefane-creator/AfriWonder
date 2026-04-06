import { useState, useEffect } from 'react';

export function usePWAInstall() {
  const [installEvent, setInstallEvent] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInStandaloneMode, setIsInStandaloneMode] = useState(false);

  useEffect(() => {
    // Détecte iOS
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setIsIOS(ios);

    // Détecte mode standalone (déjà installé)
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
    setIsInStandaloneMode(standalone);
    setIsInstalled(standalone);

    // Capture l'événement beforeinstallprompt (Android/Chrome/Edge)
    const handler = (e) => {
      e.preventDefault();
      setInstallEvent(e);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // Détecte l'installation réussie
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setInstallEvent(null);
    });

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const promptInstall = async () => {
    if (!installEvent) return false;
    installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    if (outcome === 'accepted') setIsInstalled(true);
    setInstallEvent(null);
    return outcome === 'accepted';
  };

  return {
    canInstall: !!installEvent || (isIOS && !isInStandaloneMode),
    isInstalled,
    isIOS,
    isInStandaloneMode,
    promptInstall,
  };
}