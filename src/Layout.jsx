import React, { useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Toaster } from "@/components/ui/sonner";
import TranslationProvider from "@/components/common/TranslationProvider";
import { MarketplaceCurrencyProvider } from "@/contexts/MarketplaceCurrencyContext";
import { AppMenuProvider, useAppMenu } from "@/contexts/AppMenuContext";
import { useAuth } from "@/lib/AuthContext";
import OfflineIndicator from "@/components/common/OfflineIndicator";
import PWAInstallBanner from "@/components/pwa/PWAInstallBanner";
import PWAUpdateToast from "@/components/pwa/PWAUpdateToast";
import MenuPlus from "@/components/navigation/MenuPlus";
import PageTransition from "@/components/common/PageTransition";

export default function Layout({ children, currentPageName }) {
  return (
    <AppMenuProvider>
      <LayoutContent currentPageName={currentPageName}>{children}</LayoutContent>
    </AppMenuProvider>
  );
}

import { useOrientationLock } from '@/hooks/useOrientationLock';

function LayoutContent({ children, currentPageName }) {
  // Verrouillage orientation portrait sur mobile (Android/iOS) - fonctionne aussi dans le navigateur et PWA standalone
  useOrientationLock(true);
  
  // Vérification supplémentaire en mode PWA standalone au chargement
  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone === true
      || document.referrer.includes('android-app://');
    
    if (isStandalone) {
      // Forcer le verrouillage immédiatement en PWA standalone
      const forceLock = async () => {
        if (screen.orientation?.lock) {
          try {
            await screen.orientation.lock('portrait');
          } catch (err) {
            // Réessayer après un court délai
            setTimeout(async () => {
              try {
                await screen.orientation.lock('portrait');
              } catch (e) {
                // Ignorer si ça échoue encore
              }
            }, 500);
          }
        }
      };
      
      // Essayer immédiatement et après un court délai
      forceLock();
      setTimeout(forceLock, 100);
      setTimeout(forceLock, 500);
    }
  }, []);

  // Barre de défilement visible (Chrome/Safari) : injectée uniquement en WebKit pour éviter "Jeu de règles ignoré" sous Firefox
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
  const { isOpen: isMenuOpen, closeMenu } = useAppMenu();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* WCAG 2.1 AA 2.4.1 - Lien d'évitement */}
      <a href="#main-content" className="skip-link">
        Aller au contenu principal
      </a>
      <OfflineIndicator />
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
        
        /* Barre de défilement WebKit : injectée en JS pour éviter "mauvais sélecteur" sous Firefox */
        
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
          background: linear-gradient(135deg, #f97316, #ef4444, #ec4899);
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
        
        /* Orange theme colors */
        :root {
          --primary-orange: #f97316;
          --primary-red: #ef4444;
          --primary-pink: #ec4899;
          --gradient-start: #f97316;
          --gradient-end: #ef4444;
        }

        /* Image optimization — content-visibility pour scroll fluide */
        img {
          content-visibility: auto;
        }

        /* Video — éviter will-change (trop de layers = saccades) */
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
          /* Empêcher le zoom et la rotation sur mobile */
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

      {/* Menu latéral (MenuPlus) — accessible via d'autres entrées si besoin */}
      {user && currentPageName !== 'CreateEvent' && (
        <MenuPlus
          isOpen={isMenuOpen}
          onClose={closeMenu}
          user={user}
        />
      )}
    </div>
  );
}