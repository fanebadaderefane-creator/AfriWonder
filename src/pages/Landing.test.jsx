import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Landing from './Landing';

vi.mock('@/lib/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: false,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  }),
}));

vi.mock('@/api/expressClient', () => ({
  api: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

describe('Landing page (auth)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('affiche les boutons S\'inscrire et Se connecter (mobile-first)', () => {
    render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>
    );
    expect(screen.getByRole('button', { name: /s'inscrire/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /se connecter/i })).toBeInTheDocument();
  });

  it('ouvre le formulaire d\'inscription au clic sur S\'inscrire', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>
    );
    await user.click(screen.getByRole('button', { name: /s'inscrire/i }).first());
    expect(screen.getByPlaceholderText(/nom complet/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/nom d'utilisateur/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/mot de passe/i)).toBeInTheDocument();
  });
});
