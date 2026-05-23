import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import About from './About';

const mockGetStats = vi.fn().mockResolvedValue({
  totalUsers: 1_000_000,
  totalVideos: 50_000_000,
});
vi.mock('@/api/expressClient', () => ({
  api: {
    platform: {
      getStats: () => mockGetStats(),
    },
  },
}));

const testQueryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

function renderAbout() {
  return render(
    <QueryClientProvider client={testQueryClient}>
      <MemoryRouter>
        <About />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/components/navigation/BottomNav', () => ({
  default: () => <div data-testid="bottom-nav" />,
}));

vi.mock('@/components/common/AfriWonderLogo', () => ({
  default: () => <div data-testid="afriwonder-logo" />,
}));

describe('About page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.scrollTo = vi.fn();
  });

  it('affiche le titre À propos et le logo', () => {
    renderAbout();
    expect(screen.getByRole('heading', { name: /À propos/i })).toBeInTheDocument();
    expect(screen.getByTestId('afriwonder-logo')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'AfriWonder', level: 2 })).toBeInTheDocument();
    expect(screen.getByText(/Version 1.0.0/)).toBeInTheDocument();
  });

  it('appelle navigate(-1) au clic sur le bouton retour', async () => {
    renderAbout();
    const backButton = screen.getAllByRole('button')[0];
    await userEvent.click(backButton);
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it('affiche les stats (Utilisateurs, Pays, Vidéos)', async () => {
    renderAbout();
    await waitFor(() => {
      expect(screen.getByText('1.0M')).toBeInTheDocument();
      expect(screen.getByText('15')).toBeInTheDocument();
      expect(screen.getByText('50.0M')).toBeInTheDocument();
    });
    expect(screen.getByText('Utilisateurs')).toBeInTheDocument();
    expect(screen.getByText('Pays')).toBeInTheDocument();
    expect(screen.getByText('Vidéos')).toBeInTheDocument();
  });

  it('affiche Notre mission et les liens utiles', () => {
    renderAbout();
    expect(screen.getByRole('heading', { name: /Notre mission/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Liens utiles/i })).toBeInTheDocument();
    expect(screen.getByText(/Conditions d'utilisation/)).toBeInTheDocument();
    expect(screen.getByText(/Politique de confidentialité/)).toBeInTheDocument();
    expect(screen.getAllByText(/Noter l'application/).length).toBeGreaterThanOrEqual(1);
  });

  it('ouvre le dialogue Noter l\'application au clic puis le ferme avec OK', async () => {
    renderAbout();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    const rateButtons = screen.getAllByText(/Noter l'application/);
    await act(async () => {
      await userEvent.click(rateButtons[0]);
    });
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
    expect(screen.getByRole('dialog')).toHaveTextContent(/Noter l'application/);
    expect(screen.getByRole('dialog')).toHaveTextContent(/notation sera bientôt disponible/);
    const okButton = screen.getByRole('button', { name: /^OK$/i });
    await act(async () => {
      await userEvent.click(okButton);
    });
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('affiche BottomNav et le copyright', () => {
    renderAbout();
    expect(screen.getByTestId('bottom-nav')).toBeInTheDocument();
    expect(screen.getByText(/© 2026 AfriWonder/)).toBeInTheDocument();
  });
});
