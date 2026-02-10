import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

let authState = {
  isLoadingAuth: false,
  authError: null,
  isAuthenticated: false,
};

vi.mock('@tanstack/react-query', () => ({
  QueryClientProvider: ({ children }) => <>{children}</>,
}));

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

vi.mock('./pages.config', () => ({
  pagesConfig: {
    mainPage: 'Home',
    Layout: ({ children, currentPageName }) => (
      <div data-testid="layout-wrapper">{currentPageName}:{children}</div>
    ),
    Pages: {
      Home: () => <div>Home Page</div>,
      Landing: () => <div>Landing Page</div>,
      PrivacyPolicy: () => <div>Privacy Policy</div>,
      DataProtection: () => <div>Data Protection</div>,
      Help: () => <div>Help Page</div>,
      About: () => <div>About Page</div>,
      TermsOfService: () => <div>Terms Of Service</div>,
      VerifyCertificate: () => <div>Verify Certificate</div>,
    },
  },
}));

describe('App routing/auth integration', () => {
  beforeEach(() => {
    authState = {
      isLoadingAuth: false,
      authError: null,
      isAuthenticated: false,
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
});
