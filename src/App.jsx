// AfriWonder full review PR - CodeRabbit
import { Toaster } from "@/components/ui/toaster"
import { ThemeProvider } from 'next-themes'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { queryClientInstance, queryPersister } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig, preloadPages } from './pages.config.glob'
import { BrowserRouter as Router, Route, Routes, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useEffect, Suspense } from 'react';
import { App as CapApp } from '@capacitor/app';
import { getAccessToken, getRefreshToken } from '@/lib/secureTokenStorage';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
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

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;
const CORE_ROUTE_PRELOADS = ['Discover', 'Profile', 'Inbox', 'Chat', 'Search', 'Marketplace', 'Notifications'];
const MENU_ROUTE_PRELOADS = [
  'Settings',
  'Wallet',
  'Events',
  'Transport',
  'FoodDelivery',
  'Utilities',
  'Telemedicine',
  'RealEstate',
  'Insurance',
  'News',
  'Microcredit',
  'Crowdfunding',
  'Jobs',
  'MiniAppsStore',
  'FeedPosts',
  'Live',
  'LiveStream',
  'CreatorTools',
  'Referrals',
  'AdvertiserDashboard',
  'Courses',
  'BadgesProfile',
  'Leaderboard',
  'GamificationHub',
  'Analytics',
  'Language',
  'Help',
  'Support',
  'About',
  'PrivacyPolicy',
  'DataProtection',
];

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, authError, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

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
        const hasTokens = (await getAccessToken()) || (await getRefreshToken());
        if (!hasTokens) {
          const path = location.pathname;
          const isPublicPath =
            publicPaths.includes(path) ||
            path.toLowerCase().startsWith('/verify-certificate/');
          if (!isPublicPath) {
            navigate('/Landing', { replace: true });
          }
        }
      }
    })();
  }, [isLoadingAuth, isAuthenticated, navigate, location.pathname]);

  const renderPublicRoute = (PageComp) => {
    if (!PageComp) return <div>Page non trouvée</div>;
    return (
      <Suspense fallback={<PageLoader />}>
        <PageComp />
      </Suspense>
    );
  };

  // Show loading while checking auth
  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-6 bg-[#020617] px-6 text-white">
        <div className="w-full max-w-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-white/12 animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-32 rounded-full bg-white/12 animate-pulse" />
              <div className="h-3 w-24 rounded-full bg-white/8 animate-pulse" />
            </div>
          </div>
          <div className="h-40 rounded-2xl bg-white/8 animate-pulse" />
          <div className="space-y-2">
            <div className="h-3 w-full rounded-full bg-white/8 animate-pulse" />
            <div className="h-3 w-11/12 rounded-full bg-white/8 animate-pulse" />
            <div className="h-3 w-10/12 rounded-full bg-white/8 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    }
  }

  // If not authenticated, show Landing page or public pages via Routes
  if (!isAuthenticated) {
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

  // Render the main app — errorElement par route pour isoler les erreurs et garder l'app navigable
  return (
    <Routes>
      <Route
        path="/"
        element={
          <LayoutWrapper currentPageName={mainPageKey}>
            <MainPage />
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

// Gestion du bouton "Retour" Android (Capacitor App)
const AndroidBackButtonHandler = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let remove;
    CapApp.getInfo().then((info) => {
      if (info.platform !== 'android') return;
      remove = CapApp.addListener('backButton', ({ canGoBack }) => {
        // Fermer les pages secondaires plutôt que quitter brutalement l'app
        if (canGoBack && location.pathname !== '/') {
          navigate(-1);
        } else {
          CapApp.exitApp();
        }
      });
    }).catch(() => {});

    return () => {
      if (remove && typeof remove.remove === 'function') {
        remove.remove();
      }
    };
  }, [navigate, location.pathname]);

  return null;
};


function App() {
  useEffect(() => {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const shouldSkipPreload = !!connection?.saveData || ['slow-2g', '2g'].includes(connection?.effectiveType);
    if (shouldSkipPreload) return;

    const warmRoutes = () => {
      preloadPages(CORE_ROUTE_PRELOADS).catch(() => {});
    };
    const warmMenuRoutes = () => {
      preloadPages(MENU_ROUTE_PRELOADS).catch(() => {});
    };

    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(warmRoutes, { timeout: 2500 });
      const menuId = window.requestIdleCallback(warmMenuRoutes, { timeout: 6000 });
      return () => {
        window.cancelIdleCallback?.(id);
        window.cancelIdleCallback?.(menuId);
      };
    }

    const timer = window.setTimeout(warmRoutes, 1200);
    const menuTimer = window.setTimeout(warmMenuRoutes, 3200);
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(menuTimer);
    };
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey="afriwonder-theme">
      <AuthProvider>
        <PersistQueryClientProvider
          client={queryClientInstance}
          persistOptions={{ persister: queryPersister, maxAge: 1000 * 60 * 60 * 24 }}
        >
          <Suspense fallback={<PageLoader />}>
          <FeatureFlagsProvider>
            <PreferencesProvider>
              <AdminProvider>
                <Router>
                  <TranslationProvider>
                    <AndroidBackButtonHandler />
                    <OfflineBanner />
                    <SlowConnectionBanner />
                    <NavigationTracker />
                    <AuthenticatedApp />
                    <CookieBanner />
                  </TranslationProvider>
                </Router>
              </AdminProvider>
            </PreferencesProvider>
          </FeatureFlagsProvider>
          </Suspense>
          <Toaster />
        </PersistQueryClientProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
