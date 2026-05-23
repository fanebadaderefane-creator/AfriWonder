import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Layout from './Layout';

function renderWithRouter(ui) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

vi.mock('@/components/ui/sonner', () => ({
  Toaster: () => <div data-testid="sonner-toaster" />,
}));

vi.mock('@/components/common/TranslationProvider', () => ({
  default: ({ children }) => <>{children}</>,
}));

vi.mock('@/contexts/MarketplaceCurrencyContext', () => ({
  MarketplaceCurrencyProvider: ({ children }) => <>{children}</>,
}));

vi.mock('@/lib/AuthContext', () => ({
  useAuth: () => ({ user: { id: '1', email: 'test@test.com' } }),
}));

vi.mock('@/components/navigation/MenuPlus', () => ({
  default: () => null,
}));

vi.mock('@/components/navigation/GlobalMenuButton', () => ({
  default: () => null,
}));

vi.mock('@/components/common/OfflineIndicator', () => ({
  default: () => <div data-testid="offline-indicator" />,
}));

describe('Layout', () => {
  beforeEach(() => {
    document.body.style.overscrollBehavior = '';
    document.documentElement.style.overscrollBehavior = '';
  });

  it('rend les enfants et les composants globaux', () => {
    renderWithRouter(
      <Layout currentPageName="Home">
        <div>Page Content</div>
      </Layout>
    );

    expect(screen.getByTestId('offline-indicator')).toBeInTheDocument();
    expect(screen.getByText('Page Content')).toBeInTheDocument();
    expect(screen.getByTestId('sonner-toaster')).toBeInTheDocument();
  });

  it('applique padding quand currentPageName n\'est pas fullScreen', () => {
    const { container } = renderWithRouter(
      <Layout currentPageName="About">
        <div>About Content</div>
      </Layout>
    );
    const main = container.querySelector('main');
    expect(main).toBeInTheDocument();
    expect(main?.className).not.toMatch(/pt-0|pb-0/);
  });
});
