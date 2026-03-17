import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Toaster } from "@/components/ui/sonner";
import TranslationProvider from "@/components/common/TranslationProvider";
import { MarketplaceCurrencyProvider } from "@/contexts/MarketplaceCurrencyContext";
import { AppMenuProvider, useAppMenu } from "@/contexts/AppMenuContext";
import { useAuth } from "@/lib/AuthContext";
import OfflineIndicator from "@/components/common/OfflineIndicator";
import AppUpdateBanner from "@/components/common/AppUpdateBanner";
import PWAInstallBanner from "@/components/pwa/PWAInstallBanner";
import PWAUpdateToast from "@/components/pwa/PWAUpdateToast";
import MenuPlus from "@/components/navigation/MenuPlus";
import PageTransition from "@/components/common/PageTransition";
import { useSwipeBack } from '@/hooks/useSwipeBack';
import { useNativeAppEnhancements } from '@/hooks/useNativeAppEnhancements';
import IncomingCallListener from '@/components/call/IncomingCallListener';

export default function Layout({ children, currentPageName }) {
  return (
    <AppMenuProvider>
      <LayoutContent currentPageName={currentPageName}>{children}</LayoutContent>
    </AppMenuProvider>
  );
}

import { useOrientationLock } from '@/hooks/useOrientationLock';

function LayoutContent({ children, currentPageName }) {
  useNativeAppEnhancements();

  // Verrouillage orientation portrait sur mobile (Android/iOS) - fonctionne aussi dans le navigateur et PWA standalone
  useOrientationLock(true);

  // Geste "swipe back" style iOS (désactivé sur Home/Create)
  const disableSwipeBackPages = ['Home', 'Create'];
  const swipeBackEnabled = !disableSwipeBackPages.includes(currentPageName);
  useSwipeBack(swipeBackEnabled);
  
  // VÃ©rification supplÃ©mentaire en mode PWA standalone au chargement
  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone === true
      || document.referrer.includes('android-app://');
    
    if (isStandalone) {
      // Forcer le verrouillage immÃ©diatement en PWA standalone
      const forceLock = async () => {
        if (screen.orientation?.lock) {
          try {
            await screen.orientation.lock('portrait');
          } catch (err) {
            // RÃ©essayer aprÃ¨s un court dÃ©lai
            setTimeout(async () => {
              try {
                await screen.orientation.lock('portrait');
              } catch (e) {
                // Ignorer si Ã§a Ã©choue encore
              }
            }, 500);
          }
        }
      };
      
      // Essayer immÃ©diatement et aprÃ¨s un court dÃ©lai
      forceLock();
      setTimeout(forceLock, 100);
      setTimeout(forceLock, 500);
    }
  }, []);

  // Gestion globale clavier mobile : garder le champ visible quand le clavier s'affiche
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    const handleFocusIn = (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement)) {
        return;
      }
      // Petit délai pour laisser le clavier s'ouvrir
      setTimeout(() => {
        try {
          const rect = target.getBoundingClientRect();
          const vh = window.innerHeight || document.documentElement.clientHeight;
          if (rect.bottom > vh - 80) {
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        } catch {
          // ignore
        }
      }, 150);
    };

    document.addEventListener('focusin', handleFocusIn);
    return () => {
      document.removeEventListener('focusin', handleFocusIn);
    };
  }, []);

  // Pause vidéos / animations lourdes en arrière-plan (onglet masqué)
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        const players = document.querySelectorAll('video');
        players.forEach((node) => {
          try {
            node.pause();
          } catch {
            // ignore
          }
        });
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  // Barre de dÃ©filement visible (Chrome/Safari) : injectÃ©e uniquement en WebKit pour Ã©viter "Jeu de rÃ¨gles ignorÃ©" sous Firefox
  useEffect(() => {
    const isWebKit = typeof document.documentElement.style.webkitAppearance !== 'undefined';
    if (!isWebKit) return;
    const id = 'layout-webkit-scrollbar';
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `
      ::-webkit-scrollbar { width: 10px; height: 10px; }
      ::-webkit-scrollbar-track { background: #e5e7eb; border-radius: 5px; }
      ::-webkit-scrollbar-thumb { background: #9ca3af; border-radius: 5px; }
      ::-webkit-scrollbar-thumb:hover { background: #6b7280; }
    `;
    document.head.appendChild(style);
    return () => { style.remove(); };
  }, []);

  // Pages that should have no padding and full screen
  const fullScreenPages = ['Home', 'Create'];
  const isFullScreen = fullScreenPages.includes(currentPageName);
  const { user } = useAuth();
  const { isOpen: isMenuOpen, closeMenu, openMenu, reopenMenuOnPath, clearReopenMenuOnPath, scheduleReopenWhenReturn } = useAppMenu();
  const location = useLocation();

  // À son retour sur la page d'où il avait ouvert le menu, rouvrir le menu
  useEffect(() => {
    if (reopenMenuOnPath && location.pathname === reopenMenuOnPath) {
      openMenu();
      clearReopenMenuOnPath();
    }
  }, [location.pathname, reopenMenuOnPath, openMenu, clearReopenMenuOnPath]);

  // Depuis l'app React Native : ouvrir le menu si l'URL contient ?openMenu=1
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('openMenu') === '1') openMenu();
  }, [location.search, openMenu]);

  return (
    <div
      className="min-h-screen bg-background"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
        minHeight: 'calc(var(--app-vh, 1vh) * 100)',
      }}
    >
      {/* WCAG 2.1 AA 2.4.1 - Lien d'Ã©vitement */}
      <a href="#main-content" className="skip-link">
        Aller au contenu principal
      </a>
      <OfflineIndicator />
      <AppUpdateBanner />
      <PWAInstallBanner isFullScreen={isFullScreen} currentPageName={currentPageName} />
      <PWAUpdateToast />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        
        * {
          font-family: 'Inter', sans-serif;
        }
        
        /* Safe area insets for mobile */
        .safe-area-pb {
          padding-bottom: max(16px, env(safe-area-inset-bottom));
        }
        
        .safe-area-pt {
          padding-top: max(16px, env(safe-area-inset-top));
        }
        
        /* Barre de dÃ©filement WebKit : injectÃ©e en JS pour Ã©viter "mauvais sÃ©lecteur" sous Firefox */
        
        /* Smooth transitions */
        * {
          -webkit-tap-highlight-color: transparent;
        }
        
        /* Video player styles */
        video::-webkit-media-controls {
          display: none !important;
        }
        
        video {
          -webkit-mask-image: -webkit-radial-gradient(white, black);
          mask-image: radial-gradient(white, black);
        }
        
        /* Gradient text */
        .gradient-text {
          background: linear-gradient(135deg, #1E3A8A, #2563EB, #60A5FA);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        /* Animation for live indicator */
        @keyframes pulse-ring {
          0% {
            transform: scale(0.8);
            opacity: 1;
          }
          100% {
            transform: scale(2);
            opacity: 0;
          }
        }
        
        .pulse-ring {
          animation: pulse-ring 1.5s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
        }
        
        /* Mobile optimizations */
        @media (max-width: 640px) {
          html {
            font-size: 14px;
          }
          
          body {
            height: 100dvh;
          }
          
          main {
            height: 100%;
          }
        }

        /* Prevent zoom on inputs (iOS) */
        input, select, textarea {
          font-size: 16px !important;
          -webkit-autofill: none;
          -webkit-autofill-text-color: #ffffff !important;
        }

        /* Smooth scrolling */
        html {
          scroll-behavior: smooth;
          -webkit-overflow-scrolling: touch;
        }

        /* Fix viewport on mobile */
        body {
          position: relative;
          overflow-x: hidden;
        }
        
        /* Touch optimizations */
        button, a, [role="button"] {
          touch-action: manipulation;
        }
        
        /* Prevent text selection on interactive elements */
        button, [role="button"] {
          user-select: none;
          -webkit-user-select: none;
        }
        
        /* AfriWonder design system (see docs/DESIGN_SYSTEM.md) */
        :root {
          --aw-hex-primary: #1E3A8A;
          --aw-hex-secondary: #2563EB;
          --aw-hex-accent: #60A5FA;
          --aw-hex-success: #16A34A;
        }

        /* Image optimization â€” content-visibility pour scroll fluide */
        img {
          content-visibility: auto;
        }

        /* Video â€” Ã©viter will-change (trop de layers = saccades) */
        video {
          content-visibility: auto;
        }

        /* Reduce motion for accessibility */
        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }

        /* Mobile-first button sizes */
        button {
          min-height: 44px;
          min-width: 44px;
        }

        /* Touch-friendly spacing */
        @media (max-width: 768px) {
          .space-y-4 { --space-y: 0.75rem; }
          .gap-4 { gap: 0.75rem; }
        }

        /* Optimize for touch */
        @media (hover: none) and (pointer: coarse) {
          button:hover {
            background-color: inherit;
          }
          
          button:active {
            opacity: 0.8;
          }
        }

        /* Prevent iOS zoom on double tap */
        input[type="text"],
        input[type="email"],
        button {
          -webkit-touch-callout: none;
        }

        /* Safe scrolling areas */
        .scroll-smooth {
          scroll-behavior: smooth;
        }

        @media (prefers-reduced-motion: reduce) {
          .scroll-smooth {
            scroll-behavior: auto;
          }
        }

        /* Force portrait orientation on mobile - prevent rotation */
        @media screen and (max-width: 768px) {
          /* EmpÃªcher le zoom et la rotation sur mobile */
          html {
            -webkit-text-size-adjust: 100%;
            -ms-text-size-adjust: 100%;
          }
          
          /* S'assurer que le body reste en portrait */
          body {
            min-height: 100dvh;
            max-width: 100vw;
            overflow-x: hidden;
          }
        }
      `}</style>

      <TranslationProvider>
        <MarketplaceCurrencyProvider>
          <main id="main-content" className={`screen ${isFullScreen ? '' : ''}`} tabIndex={-1}>
            <AnimatePresence mode="wait">
              <PageTransition pageKey={currentPageName}>
                {children}
              </PageTransition>
            </AnimatePresence>
          </main>
        </MarketplaceCurrencyProvider>
      </TranslationProvider>

      <Toaster 
        position="top-center"
        toastOptions={{
          style: {
            background: '#1f2937',
            color: '#fff',
            borderRadius: '12px',
            padding: '12px 16px',
          },
        }}
      />

      {/* Menu latÃ©ral (MenuPlus) â€” accessible via d'autres entrÃ©es si besoin */}
      {user?.id && <IncomingCallListener user={user} />}

      {user && currentPageName !== 'CreateEvent' && (
        <MenuPlus
          isOpen={isMenuOpen}
          onClose={closeMenu}
          onNavigateFromMenu={scheduleReopenWhenReturn}
          user={user}
        />
      )}
    </div>
  );
}
