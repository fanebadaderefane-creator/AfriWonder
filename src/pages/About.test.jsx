import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import About from './About';

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
    render(
      <MemoryRouter>
        <About />
      </MemoryRouter>
    );
    expect(screen.getByRole('heading', { name: /À propos/i })).toBeInTheDocument();
    expect(screen.getByTestId('afriwonder-logo')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'AfriWonder', level: 2 })).toBeInTheDocument();
    expect(screen.getByText(/Version 1.0.0/)).toBeInTheDocument();
  });

  it('appelle navigate(-1) au clic sur le bouton retour', async () => {
    render(
      <MemoryRouter>
        <About />
      </MemoryRouter>
    );
    const backButton = screen.getAllByRole('button')[0];
    await userEvent.click(backButton);
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it('affiche les stats (Utilisateurs, Pays, Interactions)', () => {
    render(
      <MemoryRouter>
        <About />
      </MemoryRouter>
    );
    expect(screen.getByText('1M+')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('50M+')).toBeInTheDocument();
    expect(screen.getByText('Utilisateurs')).toBeInTheDocument();
    expect(screen.getByText('Pays')).toBeInTheDocument();
    expect(screen.getByText('Interactions')).toBeInTheDocument();
  });

  it('affiche Notre mission et les liens utiles', () => {
    render(
      <MemoryRouter>
        <About />
      </MemoryRouter>
    );
    expect(screen.getByRole('heading', { name: /Notre mission/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Liens utiles/i })).toBeInTheDocument();
    expect(screen.getByText(/Conditions d'utilisation/)).toBeInTheDocument();
    expect(screen.getByText(/Politique de confidentialité/)).toBeInTheDocument();
    expect(screen.getAllByText(/Noter l'application/).length).toBeGreaterThanOrEqual(1);
  });

  it('ouvre le dialogue Noter l\'application au clic puis le ferme avec OK', async () => {
    render(
      <MemoryRouter>
        <About />
      </MemoryRouter>
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    const rateButtons = screen.getAllByText(/Noter l'application/);
    await userEvent.click(rateButtons[0]);
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
    expect(screen.getByRole('dialog')).toHaveTextContent(/Noter l'application/);
    expect(screen.getByRole('dialog')).toHaveTextContent(/notation sera bientôt disponible/);
    const okButton = screen.getByRole('button', { name: /^OK$/i });
    await userEvent.click(okButton);
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('affiche BottomNav et le copyright', () => {
    render(
      <MemoryRouter>
        <About />
      </MemoryRouter>
    );
    expect(screen.getByTestId('bottom-nav')).toBeInTheDocument();
    expect(screen.getByText(/© 2026 AfriWonder/)).toBeInTheDocument();
  });
});
