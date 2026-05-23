import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CookieBanner from './CookieBanner';

vi.mock('@/services/api', () => ({ default: { post: vi.fn().mockResolvedValue({}) } }));

describe('CookieBanner', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows nothing when cookie_consent already in localStorage', () => {
    localStorage.setItem('cookie_consent', JSON.stringify({ essential: true }));
    render(
      <MemoryRouter>
        <CookieBanner />
      </MemoryRouter>
    );
    expect(screen.queryByText(/Gestion des Cookies/i)).not.toBeInTheDocument();
  });

  it('renders without crash when no consent', () => {
    expect(() =>
      render(
        <MemoryRouter>
          <CookieBanner />
        </MemoryRouter>
      )
    ).not.toThrow();
  });
});
