import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import Layout from './Layout';

vi.mock('@/components/ui/sonner', () => ({
  Toaster: () => <div data-testid="sonner-toaster" />,
}));

vi.mock('@/components/common/TranslationProvider', () => ({
  default: ({ children }) => <>{children}</>,
}));

vi.mock('@/contexts/MarketplaceCurrencyContext', () => ({
  MarketplaceCurrencyProvider: ({ children }) => <>{children}</>,
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
    render(
      <Layout currentPageName="Home">
        <div>Page Content</div>
      </Layout>
    );

    expect(screen.getByTestId('offline-indicator')).toBeInTheDocument();
    expect(screen.getByText('Page Content')).toBeInTheDocument();
    expect(screen.getByTestId('sonner-toaster')).toBeInTheDocument();
  });

  it('applique et nettoie les styles de protection du scroll', () => {
    const { unmount } = render(
      <Layout currentPageName="Create">
        <div>Another Content</div>
      </Layout>
    );

    expect(document.body.style.overscrollBehavior).toBe('none');
    expect(document.documentElement.style.overscrollBehavior).toBe('none');

    unmount();

    expect(document.body.style.overscrollBehavior).toBe('');
    expect(document.documentElement.style.overscrollBehavior).toBe('');
  });
});
