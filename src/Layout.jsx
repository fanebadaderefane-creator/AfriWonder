import React, { useEffect } from 'react';
import { Toaster } from "@/components/ui/sonner";
import TranslationProvider from "@/components/common/TranslationProvider";
import { MarketplaceCurrencyProvider } from "@/contexts/MarketplaceCurrencyContext";
import { AppMenuProvider, useAppMenu } from "@/contexts/AppMenuContext";
import { useAuth } from "@/lib/AuthContext";
import OfflineIndicator from "@/components/common/OfflineIndicator";
import PWAInstallBanner from "@/components/pwa/PWAInstallBanner";
import PWAUpdateToast from "@/components/pwa/PWAUpdateToast";
import MenuPlus from "@/components/navigation/MenuPlus";
import GlobalMenuButton from "@/components/navigation/GlobalMenuButton";

export default function Layout({ children, currentPageName }) {
  return (
    <AppMenuProvider>
      <LayoutContent currentPageName={currentPageName}>{children}</LayoutContent>
    </AppMenuProvider>
  );
}

function LayoutContent({ children, currentPageName }) {
  // Pages that should have no padding and full screen
  const fullScreenPages = ['Home', 'Create'];
  const isFullScreen = fullScreenPages.includes(currentPageName);
  const { user } = useAuth();
  const { isOpen: isMenuOpen, closeMenu } = useAppMenu();

  useEffect(() => {
    // Disable pull-to-refresh and elastic bounce
    const preventPullToRefresh = (e) => {
      const startY = document.body.getAttribute('data-start-y');
      if (window.scrollY === 0 && e.touches?.[0] && startY != null && e.touches[0].clientY > parseFloat(startY)) {
        e.preventDefault();
      }
    };

    const preventElasticScroll = (e) => {
      // Ne bloquer QUE le scroll du body/window, pas les conteneurs internes
      const target = e.target;
      const isScrollingContainer = target.closest('[data-scroll-container]') || 
                                    target.classList.contains('overflow-y-scroll') ||
                                    target.classList.contains('overflow-scroll');
      
      // Si c'est un conteneur de scroll interne, NE PAS bloquer
      if (isScrollingContainer) {
        return;
      }
      
      const scrollTop = target.scrollTop || window.pageYOffset;
      const scrollHeight = target.scrollHeight || document.documentElement.scrollHeight;
      const clientHeight = target.clientHeight || window.innerHeight;
      
      // Prevent overscroll at top
      if (scrollTop <= 0 && e.deltaY < 0) {
        e.preventDefault();
      }
      // Prevent overscroll at bottom
      if (scrollTop + clientHeight >= scrollHeight && e.deltaY > 0) {
        e.preventDefault();
      }
    };

    // Touch events
    document.addEventListener('touchstart', (e) => {
      if (window.scrollY === 0) {
        const touch = e.touches[0];
        const startY = touch.clientY;
        document.body.setAttribute('data-start-y', startY);
      }
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
      // Ne bloquer QUE le scroll du body/window, pas les conteneurs internes
      const target = e.target;
      const isScrollingContainer = target.closest('[data-scroll-container]') ||
                                    target.classList.contains('overflow-y-scroll') ||
                                    target.classList.contains('overflow-scroll');

      // Si c'est un conteneur de scroll interne, NE PAS bloquer
      if (isScrollingContainer) {
        return;
      }

      preventPullToRefresh(e);
      const startY = parseFloat(document.body.getAttribute('data-start-y') || '0');
      const touch = e.touches[0];
      const currentY = touch.clientY;

      // Prevent pull-to-refresh when at top and scrolling down
      if (window.scrollY === 0 && currentY > startY) {
        e.preventDefault();
      }
    }, { passive: false });

    // Wheel events for desktop
    document.addEventListener('wheel', preventElasticScroll, { passive: false });

    // CSS to prevent overscroll
    document.body.style.overscrollBehavior = 'none';
    document.documentElement.style.overscrollBehavior = 'none';

    // Fix viewport height on mobile
    const setViewportHeight = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    
    setViewportHeight();
    window.addEventListener('resize', setViewportHeight);

    return () => {
      window.removeEventListener('resize', setViewportHeight);
      document.removeEventListener('wheel', preventElasticScroll);
      document.body.style.overscrollBehavior = '';
      document.documentElement.style.overscrollBehavior = '';
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* WCAG 2.1 AA 2.4.1 - Lien d'évitement */}
      <a href="#main-content" className="skip-link">
        Aller au contenu principal
      </a>
      <OfflineIndicator />
      <PWAInstallBanner />
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
        
        /* Custom scrollbar */
        ::-webkit-scrollbar {
          width: 4px;
          height: 4px;
        }
        
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        
        ::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 2px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }
        
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
            height: 100vh;
            height: 100dvh;
            height: calc(var(--vh, 1vh) * 100);
          }
          
          main {
            height: 100%;
            /* overflow: hidden; REMOVED - bloque le scroll du feed */
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
          overscroll-behavior: none;
          overscroll-behavior-y: none;
        }

        /* Fix viewport on mobile */
        body {
          position: relative;
          overflow-x: hidden;
          overscroll-behavior: none;
          overscroll-behavior-y: none;
        }
        
        /* Prevent elastic bounce on all elements */
        * {
          overscroll-behavior: none;
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
          --vh: 1vh;
        }

        /* Image optimization */
        img {
          content-visibility: auto;
          will-change: transform;
        }

        /* Video optimization */
        video {
          content-visibility: auto;
          will-change: transform;
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
      `}</style>

      <TranslationProvider>
        <MarketplaceCurrencyProvider>
          <main id="main-content" className={isFullScreen ? '' : ''} tabIndex={-1}>
            {children}
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

      {/* Menu global accessible depuis toutes les pages */}
      {user && (
        <>
          <GlobalMenuButton />
          <MenuPlus
            isOpen={isMenuOpen}
            onClose={closeMenu}
            user={user}
          />
        </>
      )}
    </div>
  );
}