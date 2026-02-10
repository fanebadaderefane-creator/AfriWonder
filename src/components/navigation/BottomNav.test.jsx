import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import BottomNav from './BottomNav';

const getUnreadCountMock = vi.fn();

vi.mock('@/api/expressClient', () => ({
  api: {
    messages: {
      getUnreadCount: (...args) => getUnreadCountMock(...args),
    },
  },
}));

vi.mock('@/components/common/useTranslation', () => ({
  useTranslation: () => ({
    t: (key) => key,
  }),
}));

function renderBottomNav(initialPath = '/Home') {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>
        <BottomNav />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('BottomNav', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('access_token', 'token');
  });

  it('affiche les onglets principaux', async () => {
    getUnreadCountMock.mockResolvedValueOnce({ count: 0 });
    renderBottomNav('/Home');

    expect(await screen.findByText('home')).toBeInTheDocument();
    expect(screen.getByText('discover')).toBeInTheDocument();
    expect(screen.getByText('inbox')).toBeInTheDocument();
    expect(screen.getByText('profile')).toBeInTheDocument();
  });

  it('affiche le badge inbox quand unreadCount > 0', async () => {
    getUnreadCountMock.mockResolvedValueOnce({ count: 7 });
    renderBottomNav('/Inbox');

    expect(await screen.findByText('7')).toBeInTheDocument();
  });

  it('affiche 99+ quand unreadCount dépasse 99', async () => {
    getUnreadCountMock.mockResolvedValueOnce({ count: 120 });
    renderBottomNav('/Inbox');

    expect(await screen.findByText('99+')).toBeInTheDocument();
  });
});
