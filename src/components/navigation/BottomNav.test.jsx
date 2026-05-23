import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import BottomNav from './BottomNav';

vi.mock('@/components/common/useTranslation', () => ({
  useTranslation: () => ({
    t: (key) => key,
  }),
}));

function renderBottomNav(initialPath = '/Home') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <BottomNav />
    </MemoryRouter>
  );
}

describe('BottomNav', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('access_token', 'token');
  });

  it('affiche les onglets principaux', () => {
    renderBottomNav('/home');
    expect(screen.getByText('home')).toBeInTheDocument();
    expect(screen.getByText('discover')).toBeInTheDocument();
    expect(screen.getByText('profile')).toBeInTheDocument();
  });


  it('affiche l’indicateur actif sur l’onglet courant', () => {
    renderBottomNav('/home');
    expect(screen.getByTestId('active-tab-indicator')).toBeInTheDocument();
  });
});
