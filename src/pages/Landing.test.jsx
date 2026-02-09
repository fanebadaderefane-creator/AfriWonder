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
    const signupButtons = screen.getAllByRole('button', { name: /s'inscrire/i });
    const loginButtons = screen.getAllByRole('button', { name: /se connecter/i });
    expect(signupButtons.length).toBeGreaterThanOrEqual(1);
    expect(loginButtons.length).toBeGreaterThanOrEqual(1);
  });

  it('ouvre le formulaire d\'inscription au clic sur S\'inscrire', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>
    );
    const signupBtn = screen.getAllByRole('button', { name: /s'inscrire/i })[0];
    await user.click(signupBtn);
    expect(screen.getByPlaceholderText(/nom complet/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/nom d'utilisateur/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/mot de passe/i)).toBeInTheDocument();
  });
});
