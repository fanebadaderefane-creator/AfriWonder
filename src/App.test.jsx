import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

let authState = {
  isLoadingAuth: false,
  authError: null,
  isAuthenticated: false,
};

const mockNavigate = vi.fn();
let mockPathname = '/Landing';
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ pathname: mockPathname }),
  };
});

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    QueryClientProvider: ({ children }) => <>{children}</>,
    useQuery: () => ({ data: null, isLoading: false, isError: false }),
  };
});

vi.mock('@/lib/query-client', () => ({
  queryClientInstance: {},
}));

vi.mock('@/lib/AuthContext', () => ({
  AuthProvider: ({ children }) => <>{children}</>,
  useAuth: () => authState,
}));

vi.mock('@/components/ui/toaster', () => ({
  Toaster: () => <div data-testid="toaster" />,
}));

vi.mock('@/lib/NavigationTracker', () => ({
  default: () => <div data-testid="nav-tracker" />,
}));

vi.mock('@/components/common/TranslationProvider', () => ({
  default: ({ children }) => <>{children}</>,
}));

vi.mock('@/components/legal/CookieBanner', () => ({
  default: () => <div data-testid="cookie-banner" />,
}));

vi.mock('@/components/UserNotRegisteredError', () => ({
  default: () => <div>User not registered</div>,
}));

vi.mock('./lib/PageNotFound', () => ({
  default: () => <div>PageNotFound</div>,
}));

const { mockLayoutRef, mockPagesRef, mockLayoutValueRef, mainPageRef } = vi.hoisted(() => {
  const mockLayoutRef = { current: ({ children, currentPageName }) => (
    <div data-testid="layout-wrapper">{currentPageName}:{children}</div>
  ) };
  const mockPagesRef = { current: {
    Home: () => <div>Home Page</div>,
    Landing: () => <div>Landing Page</div>,
    PrivacyPolicy: () => <div>Privacy Policy</div>,
    DataProtection: () => <div>Data Protection</div>,
    Help: () => <div>Help Page</div>,
    About: () => <div>About Page</div>,
    TermsOfService: () => <div>Terms Of Service</div>,
    VerifyCertificate: () => <div>Verify Certificate</div>,
  } };
  const mockLayoutValueRef = { current: mockLayoutRef.current };
  const mainPageRef = { current: 'Home' };
  return { mockLayoutRef, mockPagesRef, mockLayoutValueRef, mainPageRef };
});
vi.mock('./pages.config', () => ({
  get pagesConfig() {
    return {
      get mainPage() { return mainPageRef.current; },
      get Layout() { return mockLayoutValueRef.current; },
      get Pages() { return mockPagesRef.current; },
    };
  },
}));

describe('App routing/auth integration', () => {
  beforeEach(() => {
    authState = {
      isLoadingAuth: false,
      authError: null,
      isAuthenticated: false,
    };
    mockPathname = '/Landing';
    mainPageRef.current = 'Home';
    mockLayoutValueRef.current = mockLayoutRef.current;
    mockPagesRef.current = {
      Home: () => <div>Home Page</div>,
      Landing: () => <div>Landing Page</div>,
      PrivacyPolicy: () => <div>Privacy Policy</div>,
      DataProtection: () => <div>Data Protection</div>,
      Help: () => <div>Help Page</div>,
      About: () => <div>About Page</div>,
      TermsOfService: () => <div>Terms Of Service</div>,
      VerifyCertificate: () => <div>Verify Certificate</div>,
    };
    localStorage.clear();
    window.history.pushState({}, '', '/Landing');
  });

  it('affiche un spinner pendant le chargement auth', () => {
    authState.isLoadingAuth = true;
    render(<App />);
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('affiche l’erreur user-not-registered', () => {
    authState.authError = { type: 'user_not_registered' };
    render(<App />);
    expect(screen.getByText('User not registered')).toBeInTheDocument();
  });

  it('affiche les pages publiques quand non authentifié', async () => {
    window.history.pushState({}, '', '/PrivacyPolicy');
    render(<App />);
    expect(await screen.findByText('Privacy Policy')).toBeInTheDocument();
  });

  it('affiche le layout + page privée quand authentifié', async () => {
    authState.isAuthenticated = true;
    window.history.pushState({}, '', '/Home');
    render(<App />);
    expect(await screen.findByTestId('layout-wrapper')).toHaveTextContent('Home:');
    expect(screen.getByText('Home Page')).toBeInTheDocument();
  });

  it('redirige vers /Landing quand non authentifié, sans tokens, sur page privée', () => {
    authState.isAuthenticated = false;
    authState.isLoadingAuth = false;
    mockNavigate.mockClear();
    mockPathname = '/Home';
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    render(<App />);
    expect(mockNavigate).toHaveBeenCalledWith('/Landing', { replace: true });
  });

  it('affiche les enfants sans Layout quand Layout est falsy', async () => {
    mockLayoutValueRef.current = null;
    vi.resetModules();
    const { default: AppNoLayout } = await import('./App');
    authState.isAuthenticated = true;
    mockPathname = '/About';
    window.history.replaceState({}, '', '/About');
    render(<AppNoLayout />);
    expect(screen.getByTestId('nav-tracker')).toBeInTheDocument();
    expect(screen.queryByTestId('layout-wrapper')).not.toBeInTheDocument();
    expect(await screen.findByText('About Page')).toBeInTheDocument();
    vi.resetModules();
    mockLayoutValueRef.current = mockLayoutRef.current;
    await import('./App');
  });

  it('utilise mainPageKey depuis Object.keys(Pages)[0] quand mainPage est null', async () => {
    mainPageRef.current = null;
    mockPagesRef.current = { Landing: () => <div>Landing Page</div>, About: () => <div>About Page</div> };
    authState.isAuthenticated = true;
    mockPathname = '/';
    render(<App />);
    expect(await screen.findByTestId('layout-wrapper')).toBeInTheDocument();
  });

  it('affiche "Page non trouvée" quand page publique manquante dans Pages', async () => {
    const pagesSansLanding = { ...mockPagesRef.current };
    delete pagesSansLanding.Landing;
    mockPagesRef.current = pagesSansLanding;
    authState.isAuthenticated = false;
    mockPathname = '/Landing';
    window.history.pushState({}, '', '/Landing');
    vi.resetModules();
    const { default: AppWithMissingPage } = await import('./App');
    render(<AppWithMissingPage />);
    expect(await screen.findByText(/Page non trouvée/)).toBeInTheDocument();
  });

  it('affiche PageNotFound pour /verify-certificate/:token quand VerifyCertificate manquant (authentifié)', async () => {
    const pagesNoVerify = { ...mockPagesRef.current };
    delete pagesNoVerify.VerifyCertificate;
    mockPagesRef.current = pagesNoVerify;
    authState.isAuthenticated = true;
    mockPathname = '/verify-certificate/abc-token';
    window.history.pushState({}, '', '/verify-certificate/abc-token');
    vi.resetModules();
    const { default: AppNoVerify } = await import('./App');
    render(<AppNoVerify />);
    expect(await screen.findByText(/PageNotFound/)).toBeInTheDocument();
  });
});
