import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Landing from './Landing';

const testQueryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

function renderLanding() {
  return render(
    <QueryClientProvider client={testQueryClient}>
      <MemoryRouter>
        <Landing />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

const loginMock = vi.fn();
const registerMock = vi.fn();
const logoutMock = vi.fn();

vi.mock('@/lib/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: false,
    login: loginMock,
    register: registerMock,
    logout: logoutMock,
  }),
}));

vi.mock('@/api/expressClient', () => ({
  api: {
    post: vi.fn(),
    get: vi.fn(),
    earlyAccess: {
      getConfig: vi.fn().mockResolvedValue({ showWaitlist: true, showDonate: false, isFull: false, maxUsers: 10000, totalUsers: 0 }),
    },
    platformDonations: { create: vi.fn() },
    platformFeedback: { create: vi.fn() },
  },
}));

describe('Landing page (auth)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('affiche les boutons S\'inscrire et Se connecter (mobile-first)', () => {
    renderLanding();
    const signupButtons = screen.getAllByRole('button', { name: /s'inscrire/i });
    const loginButtons = screen.getAllByRole('button', { name: /se connecter/i });
    expect(signupButtons.length).toBeGreaterThanOrEqual(1);
    expect(loginButtons.length).toBeGreaterThanOrEqual(1);
  });

  it('ouvre le formulaire d\'inscription au clic sur S\'inscrire', async () => {
    const user = userEvent.setup();
    renderLanding();
    const signupBtn = screen.getAllByRole('button', { name: /s'inscrire/i })[0];
    await user.click(signupBtn);
    expect(screen.getByPlaceholderText(/nom complet/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/nom d'utilisateur/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/mot de passe/i)).toBeInTheDocument();
  });

  it(
    "désactive l'inscription tant que les conditions ne sont pas acceptées",
    async () => {
      const user = userEvent.setup();
      renderLanding();

      await user.click(screen.getAllByRole('button', { name: /s'inscrire/i })[0]);
      await screen.findByPlaceholderText(/nom complet/i, {}, { timeout: 3000 });

      await act(async () => {
        await user.type(screen.getByPlaceholderText(/nom complet/i), 'User Test');
        await user.type(screen.getByPlaceholderText(/nom d'utilisateur/i), 'user_test');
        await user.type(screen.getByPlaceholderText(/^email$/i), 'test@example.com');
        await user.type(screen.getByPlaceholderText(/mot de passe/i), 'Password123!');
      });
      const registerHeading = screen.getByRole('heading', { name: /créer un compte/i });
      const registerCard = registerHeading.closest('div');
      expect(registerCard).not.toBeNull();
      const submitButton = within(registerCard).getByRole('button', { name: /^s'inscrire$/i });
      expect(submitButton).toBeDisabled();
      await user.click(submitButton);
      expect(registerMock).not.toHaveBeenCalled();
    },
    15000
  );

  it("inscrit l'utilisateur puis revient sur le formulaire de connexion", async () => {
    const user = userEvent.setup();
    registerMock.mockResolvedValueOnce({ ok: true });

    renderLanding();

    await user.click(screen.getAllByRole('button', { name: /s'inscrire/i })[0]);
    await screen.findByPlaceholderText(/nom complet/i, {}, { timeout: 3000 });

    await act(async () => {
      await user.type(screen.getByPlaceholderText(/nom complet/i), 'Utilisateur E2E');
      await user.type(screen.getByPlaceholderText(/nom d'utilisateur/i), 'e2euser');
      await user.type(screen.getByPlaceholderText(/^email$/i), 'e2e@example.com');
      await user.type(screen.getByPlaceholderText(/mot de passe/i), 'Password123!');
      await user.click(screen.getByRole('checkbox'));
      const registerHeading = screen.getByRole('heading', { name: /créer un compte/i });
      const registerCard = registerHeading.closest('div');
      expect(registerCard).not.toBeNull();
      await user.click(within(registerCard).getByRole('button', { name: /^s'inscrire$/i }));
    });

    await waitFor(() => {
      expect(registerMock).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /se connecter/i })).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/^email$/i)).toHaveValue('e2e@example.com');
    });
    expect(logoutMock).toHaveBeenCalledTimes(1);
  }, 15000);

  it(
    'affiche une erreur de connexion si login échoue',
    async () => {
      const user = userEvent.setup();
      loginMock.mockRejectedValueOnce(new Error('Email ou mot de passe incorrect'));

      renderLanding();

      await act(async () => {
        await user.type(screen.getByPlaceholderText(/^email$/i), 'bad@example.com');
        await user.type(screen.getByPlaceholderText(/mot de passe/i), 'bad-password');
        await user.click(screen.getAllByRole('button', { name: /^se connecter$/i })[1]);
      });

      await waitFor(() => {
        expect(loginMock).toHaveBeenCalledWith('bad@example.com', 'bad-password');
      });
      await waitFor(
        () => {
          expect(screen.getByText(/email ou mot de passe incorrect/i)).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    },
    15000
  );
});
