import { Toaster } from "@/components/ui/toaster"
import { ThemeProvider } from 'next-themes'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { queryClientInstance, queryPersister } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useEffect, Suspense } from 'react';
import { getItem } from '@/utils/safeStorage';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { FeatureFlagsProvider } from '@/contexts/FeatureFlagsContext';
import { PreferencesProvider } from '@/contexts/PreferencesContext';
import { AdminProvider } from '@/lib/admin-context';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import OfflineBanner from '@/components/common/OfflineBanner';
import TranslationProvider from '@/components/common/TranslationProvider';
import CookieBanner from '@/components/legal/CookieBanner';
import PageLoader from '@/components/common/PageLoader';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, authError, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Pages publiques accessibles sans être connecté (ne pas rediriger vers Landing)
  const publicPaths = ['/', '/Landing', '/PrivacyPolicy', '/DataProtection', '/PrivacySettings', '/Help', '/About', '/TermsOfService', '/VerifyCertificate'];

  // Redirect to Landing ONLY if not authenticated AND on a non-public page
  useEffect(() => {
    if (!isLoadingAuth && !isAuthenticated) {
      const hasTokens = getItem('access_token') || getItem('refresh_token');
      if (!hasTokens) {
        const isPublicPath = publicPaths.includes(location.pathname);
        if (!isPublicPath) {
          navigate('/Landing', { replace: true });
        }
      }
    }
  }, [isLoadingAuth, isAuthenticated, navigate, location.pathname]);

  // Show loading while checking auth
  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-4 bg-gray-50">
        <div className="w-10 h-10 border-2 border-slate-200 border-t-orange-500 rounded-full animate-spin" />
        <p className="text-sm text-slate-500">Chargement...</p>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    }
  }

  // Pages publiques accessibles sans authentification
  const publicPageNames = ['Landing', 'PrivacyPolicy', 'DataProtection', 'PrivacySettings', 'Help', 'About', 'TermsOfService', 'VerifyCertificate'];

  // If not authenticated, show Landing page or public pages via Routes
  if (!isAuthenticated) {
    const LandingPage = Pages['Landing'];
    const PrivacyPolicyPage = Pages['PrivacyPolicy'];
    const DataProtectionPage = Pages['DataProtection'];
    const HelpPage = Pages['Help'];
    const AboutPage = Pages['About'];
    const TermsOfServicePage = Pages['TermsOfService'];
    const VerifyCertificatePage = Pages['VerifyCertificate'];

    return (
      <Routes>
        <Route path="/" element={LandingPage ? <LandingPage /> : <div>Page non trouvée</div>} />
        <Route path="/Landing" element={LandingPage ? <LandingPage /> : <div>Page non trouvée</div>} />
        <Route path="/PrivacyPolicy" element={PrivacyPolicyPage ? <PrivacyPolicyPage /> : <div>Page non trouvée</div>} />
        <Route path="/DataProtection" element={DataProtectionPage ? <DataProtectionPage /> : <div>Page non trouvée</div>} />
        <Route path="/Help" element={HelpPage ? <HelpPage /> : <div>Page non trouvée</div>} />
        <Route path="/About" element={AboutPage ? <AboutPage /> : <div>Page non trouvée</div>} />
        <Route path="/TermsOfService" element={TermsOfServicePage ? <TermsOfServicePage /> : <div>Page non trouvée</div>} />
        <Route path="/VerifyCertificate" element={VerifyCertificatePage ? <VerifyCertificatePage /> : <div>Page non trouvée</div>} />
        <Route path="/verify-certificate/:token" element={VerifyCertificatePage ? <VerifyCertificatePage /> : <div>Page non trouvée</div>} />
        <Route path="*" element={<Navigate to="/Landing" replace />} />
      </Routes>
    );
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/" element={
        <LayoutWrapper currentPageName={mainPageKey}>
          <MainPage />
        </LayoutWrapper>
      } />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <LayoutWrapper currentPageName={path}>
              <Page />
            </LayoutWrapper>
          }
        />
      ))}
      <Route path="/verify-certificate/:token" element={(() => {
        const VerifyCertificatePage = Pages['VerifyCertificate'];
        return VerifyCertificatePage ? <LayoutWrapper currentPageName="VerifyCertificate"><VerifyCertificatePage /></LayoutWrapper> : <PageNotFound />;
      })()} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

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
                    <OfflineBanner />
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
