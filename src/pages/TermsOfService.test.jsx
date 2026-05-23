import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import TermsOfService from './TermsOfService';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});
vi.mock('../components/navigation/BottomNav', () => ({ default: () => <div data-testid="bottom-nav" /> }));

describe('TermsOfService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.scrollTo = vi.fn();
  });

  it('affiche le titre et le contenu des conditions', () => {
    render(
      <MemoryRouter>
        <TermsOfService />
      </MemoryRouter>
    );
    expect(screen.getByRole('heading', { name: 'Conditions de service', level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/Conditions de service – AfriWonder/)).toBeInTheDocument();
    expect(screen.getByText(/1. Objet/)).toBeInTheDocument();
    expect(screen.getByText(/Acceptation des conditions/)).toBeInTheDocument();
  });

  it('appelle navigate(-1) au clic sur le bouton retour', async () => {
    render(
      <MemoryRouter>
        <TermsOfService />
      </MemoryRouter>
    );
    const backButton = screen.getAllByRole('button')[0];
    await userEvent.click(backButton);
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it('affiche BottomNav', () => {
    render(
      <MemoryRouter>
        <TermsOfService />
      </MemoryRouter>
    );
    expect(screen.getByTestId('bottom-nav')).toBeInTheDocument();
  });
});
