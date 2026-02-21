import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TopHeader from './TopHeader';

const authMeMock = vi.fn();
const notificationsListMock = vi.fn();

vi.mock('@/api/expressClient', () => ({
  api: {
    auth: {
      me: (...args) => authMeMock(...args),
    },
    notifications: {
      list: (...args) => notificationsListMock(...args),
    },
  },
}));

vi.mock('@/components/common/useTranslation', () => ({
  useTranslation: () => ({
    t: (key) => key,
  }),
}));

vi.mock('@/components/notifications/NotificationCenter', () => ({
  default: ({ isOpen }) => <div data-testid="notification-center">{String(isOpen)}</div>,
}));

function renderTopHeader(props = {}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <TopHeader {...props} />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('TopHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMeMock.mockResolvedValue({ id: 'u1', language: 'fr' });
    notificationsListMock.mockResolvedValue({
      notifications: [{ id: 'n1', is_read: false }, { id: 'n2', is_read: true }],
    });
  });

  it(
    'affiche les tabs et déclenche onTabChange',
    async () => {
      const onTabChange = vi.fn();
      const user = userEvent.setup();
      renderTopHeader({ activeTab: 'pourtoi', onTabChange, followingCount: 3 });

      expect(await screen.findByText('my_wonder')).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: /my_wonder/i }));
      expect(onTabChange).toHaveBeenCalledWith('abonnements');
    },
    10000
  );

  it('affiche le title si showTabs=false', async () => {
    renderTopHeader({ showTabs: false, title: 'Mon Espace' });
    expect(await screen.findByText('Mon Espace')).toBeInTheDocument();
  });

  it('ouvre le centre de notifications et appelle onMenuOpen', async () => {
    const onMenuOpen = vi.fn();
    const user = userEvent.setup();
    renderTopHeader({ showMenuButton: true, onMenuOpen });

    await waitFor(() => {
      expect(authMeMock).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(notificationsListMock).toHaveBeenCalled();
    });

    const unreadBadge = screen.getByText('1');
    expect(unreadBadge).toBeInTheDocument();
    const notificationsButton = unreadBadge.closest('button');
    expect(notificationsButton).not.toBeNull();
    await user.click(notificationsButton);
    expect(screen.getByTestId('notification-center')).toHaveTextContent('true');

    const iconButtons = screen.getAllByRole('button');
    await user.click(iconButtons[iconButtons.length - 1]);
    expect(onMenuOpen).toHaveBeenCalledTimes(1);
  });
});
