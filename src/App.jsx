// AfriWonder full review PR - CodeRabbit
import { Toaster } from "@/components/ui/toaster"
import { AfriWonderThemeProvider } from '@/lib/afriwonder-theme'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { queryClientInstance, queryPersister } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig, preloadPages } from './pages.config.glob'
import { BrowserRouter as Router, Route, Routes, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useEffect, Suspense, useRef, useState } from 'react';
import { readGuestExplore, GUEST_EXPLORE_EVENT } from '@/lib/guestExplore';
import { getAccessToken, getRefreshToken } from '@/lib/secureTokenStorage';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { MessageSocketProvider } from '@/contexts/MessageSocketContext';
import { FeatureFlagsProvider } from '@/contexts/FeatureFlagsContext';
import { PreferencesProvider } from '@/contexts/PreferencesContext';
import { AdminProvider } from '@/lib/admin-context';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import OfflineBanner from '@/components/common/OfflineBanner';
import SlowConnectionBanner from '@/components/common/SlowConnectionBanner';
import TranslationProvider from '@/components/common/TranslationProvider';
import CookieBanner from '@/components/legal/CookieBanner';
import PageLoader from '@/components/common/PageLoader';
import PageErrorFallback from '@/components/common/PageErrorFallback';
import PWAUpdateToast from '@/components/pwa/PWAUpdateToast';
import BrandedLaunchSplash from '@/components/common/BrandedLaunchSplash';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;
const CORE_ROUTE_PRELOADS = ['Discover', 'Profile', 'Inbox'];

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const MessageSocketBridge = ({ children }) => {
  const { user } = useAuth();
  return <MessageSocketProvider userId={user?.id}>{children}</MessageSocketProvider>;
};

const AuthenticatedApp = () => {
  const { isLoadingAuth, authError, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const tokensWhenUnauthRef = useRef(undefined);
  const hadAuthenticatedRef = useRef(false);
  const [guestExplore, setGuestExploreSnapshot] = useState(() => readGuestExplore());

  useEffect(() => {
    const sync = () => setGuestExploreSnapshot(readGuestExplore());
    window.addEventListener(GUEST_EXPLORE_EVENT, sync);
    return () => window.removeEventListener(GUEST_EXPLORE_EVENT, sync);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      hadAuthenticatedRef.current = true;
      tokensWhenUnauthRef.current = undefined;
      return;
    }
    if (hadAuthenticatedRef.current) {
      tokensWhenUnauthRef.current = undefined;
      hadAuthenticatedRef.current = false;
    }
  }, [isAuthenticated]);

  // Pages publiques accessibles sans être connecté (ne pas rediriger vers Landing)
  const publicPaths = [
    '/',
    '/Landing',
    '/PrivacyPolicy',
    '/DataProtection',
    '/PrivacySettings',
    '/Help',
    '/About',
    '/TermsOfService',
    '/VerifyCertificate',
    // Contenu consultable sans compte (SEO / partage)
    '/News',
    '/ArticleDetails',
    '/Discover',
    '/FAQ',
    '/blog',
    '/articles',
    '/dashboard',
    '/features',
  ];

  // Redirect to Landing ONLY if not authenticated AND on a non-public page
  useEffect(() => {
    (async () => {
      if (!isLoadingAuth && !isAuthenticated) {
        if (tokensWhenUnauthRef.current === undefined) {
          tokensWhenUnauthRef.current =
            !!(await getAccessToken()) || !!(await getRefreshToken());
        }
        const hasTokens = tokensWhenUnauthRef.current;
        if (!hasTokens) {
          const path = location.pathname;
          const isPublicPath =
            publicPaths.includes(path) ||
            path.toLowerCase().startsWith('/verify-certificate/');
          if (!guestExplore && !isPublicPath) {
            navigate('/Landing', { replace: true });
          }
        }
      }
    })();
  }, [isLoadingAuth, isAuthenticated, guestExplore, navigate, location.pathname]);

  const renderPublicRoute = (PageComp) => {
    if (!PageComp) return <div>Page non trouvée</div>;
    return (
      <Suspense fallback={<PageLoader />}>
        <PageComp />
      </Suspense>
    );
  };

  // Chargement auth — même splash marque que le feed (routes se montent derrière au prochain tick)
  if (isLoadingAuth) {
    return <BrandedLaunchSplash position="fixed" />;
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    }
  }

  // Invité : accès au même shell que l'app (feed, navigation) — aligné audit guest / onboarding minimal.
  // Sans flag invité : Landing + pages publiques uniquement.
  if (!isAuthenticated && !guestExplore) {
    const LandingPage = Pages['Landing'];
    const PrivacyPolicyPage = Pages['PrivacyPolicy'];
    const DataProtectionPage = Pages['DataProtection'];
    const HelpPage = Pages['Help'];
    const AboutPage = Pages['About'];
    const TermsOfServicePage = Pages['TermsOfService'];
    const VerifyCertificatePage = Pages['VerifyCertificate'];
    const NewsPage = Pages['News'];
    const ArticleDetailsPage = Pages['ArticleDetails'];
    const DiscoverPage = Pages['Discover'];
    const FAQPage = Pages['FAQ'];

    return (
      <Routes>
        <Route path="/blog" element={<Navigate to="/News" replace />} />
        <Route path="/articles" element={<Navigate to="/News" replace />} />
        <Route path="/features" element={<Navigate to="/Discover" replace />} />
        <Route path="/dashboard" element={<Navigate to="/Landing" replace />} />
        <Route path="/" element={renderPublicRoute(LandingPage)} errorElement={<PageErrorFallback />} />
        <Route path="/Landing" element={renderPublicRoute(LandingPage)} errorElement={<PageErrorFallback />} />
        <Route path="/PrivacyPolicy" element={renderPublicRoute(PrivacyPolicyPage)} errorElement={<PageErrorFallback />} />
        <Route path="/DataProtection" element={renderPublicRoute(DataProtectionPage)} errorElement={<PageErrorFallback />} />
        <Route path="/Help" element={renderPublicRoute(HelpPage)} errorElement={<PageErrorFallback />} />
        <Route path="/About" element={renderPublicRoute(AboutPage)} errorElement={<PageErrorFallback />} />
        <Route path="/TermsOfService" element={renderPublicRoute(TermsOfServicePage)} errorElement={<PageErrorFallback />} />
        <Route path="/VerifyCertificate" element={renderPublicRoute(VerifyCertificatePage)} errorElement={<PageErrorFallback />} />
        <Route path="/verify-certificate/:token" element={renderPublicRoute(VerifyCertificatePage)} errorElement={<PageErrorFallback />} />
        {NewsPage ? <Route path="/News" element={renderPublicRoute(NewsPage)} errorElement={<PageErrorFallback />} /> : null}
        {ArticleDetailsPage ? (
          <Route path="/ArticleDetails" element={renderPublicRoute(ArticleDetailsPage)} errorElement={<PageErrorFallback />} />
        ) : null}
        {DiscoverPage ? <Route path="/Discover" element={renderPublicRoute(DiscoverPage)} errorElement={<PageErrorFallback />} /> : null}
        {FAQPage ? <Route path="/FAQ" element={renderPublicRoute(FAQPage)} errorElement={<PageErrorFallback />} /> : null}
        <Route path="*" element={<Navigate to="/Landing" replace />} />
      </Routes>
    );
  }

  // App complète : utilisateur connecté OU mode invité (guestExplore)
  return (
    <Routes>
      <Route
        path="/"
        element={
          <LayoutWrapper currentPageName={mainPageKey}>
            <Suspense fallback={<PageLoader />}>
              <MainPage />
            </Suspense>
          </LayoutWrapper>
        }
        errorElement={<PageErrorFallback />}
      />
      {/* Même écran que / : évite /Home (double Suspense + URL différente du mainPage). */}
      <Route
        path={`/${mainPageKey}`}
        element={<Navigate to="/" replace />}
      />
      <Route path="/Services" element={<Navigate to="/Marketplace" replace />} />
      <Route path="/blog" element={<Navigate to="/News" replace />} />
      <Route path="/articles" element={<Navigate to="/News" replace />} />
      <Route path="/dashboard" element={<Navigate to="/Profile" replace />} />
      <Route path="/features" element={<Navigate to="/Discover" replace />} />
      {Object.entries(Pages)
        .filter(([path]) => path !== mainPageKey)
        .map(([path, Page]) => {
        return (
          <Route
            key={path}
            path={`/${path}`}
            element={
              <LayoutWrapper currentPageName={path}>
                <Suspense fallback={<PageLoader />}>
                  <Page />
                </Suspense>
              </LayoutWrapper>
            }
            errorElement={<PageErrorFallback />}
          />
        );
      })}
      <Route
        path="/verify-certificate/:token"
        element={(() => {
          const VerifyCertificatePage = Pages['VerifyCertificate'];
          return VerifyCertificatePage ? (
            <Suspense fallback={<PageLoader />}>
              <LayoutWrapper currentPageName="VerifyCertificate">
                <VerifyCertificatePage />
              </LayoutWrapper>
            </Suspense>
          ) : (
            <PageNotFound />
          );
        })()}
        errorElement={<PageErrorFallback />}
      />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  useEffect(() => {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const shouldSkipPreload = !!connection?.saveData || ['slow-2g', '2g'].includes(connection?.effectiveType);
    if (shouldSkipPreload) return;

    const warmRoutes = () => {
      preloadPages(CORE_ROUTE_PRELOADS).catch(() => {});
    };
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(warmRoutes, { timeout: 2500 });
      return () => {
        window.cancelIdleCallback?.(id);
      };
    }

    const timer = window.setTimeout(warmRoutes, 1200);
    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  return (
    <AfriWonderThemeProvider defaultTheme="system" storageKey="afriwonder-theme">
      <AuthProvider>
        <PersistQueryClientProvider
          client={queryClientInstance}
          persistOptions={{ persister: queryPersister, maxAge: 1000 * 60 * 60 * 48 }}
        >
          <MessageSocketBridge>
          <Suspense fallback={<PageLoader />}>
          <FeatureFlagsProvider>
            <PreferencesProvider>
              <AdminProvider>
                <Router>
                  <TranslationProvider>
                    <OfflineBanner />
                    <SlowConnectionBanner />
                    <PWAUpdateToast />
                    <NavigationTracker />
                    <AuthenticatedApp />
                    <CookieBanner />
                  </TranslationProvider>
                </Router>
              </AdminProvider>
            </PreferencesProvider>
          </FeatureFlagsProvider>
          </Suspense>
          </MessageSocketBridge>
          <Toaster />
        </PersistQueryClientProvider>
      </AuthProvider>
    </AfriWonderThemeProvider>
  )
}

export default App
