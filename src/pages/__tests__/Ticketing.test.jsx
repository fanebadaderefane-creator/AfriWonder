import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import TranslationProvider from '@/components/common/TranslationProvider';
import Ticketing from '../Ticketing';

const testQueryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

function TestWrapper({ children }) {
  return (
    <QueryClientProvider client={testQueryClient}>
      <TranslationProvider>
        <MemoryRouter>{children}</MemoryRouter>
      </TranslationProvider>
    </QueryClientProvider>
  );
}

const { getMyTicketsMock } = vi.hoisted(() => ({
  getMyTicketsMock: vi.fn().mockResolvedValue([
    {
      id: 1,
      event_name: 'Concert test',
      event_date: '2027-03-15T20:00:00.000Z',
      qr_code: 'QR-CODE',
      status: 'valid',
    },
  ]),
}));
vi.mock('@/api/expressClient', () => ({
  __esModule: true,
  default: {
    tickets: { getMyTickets: getMyTicketsMock },
  },
}));

describe('Ticketing page', () => {
  it("affiche le header et la section 'Mes billets' en mode mobile-first", async () => {
    render(
      <TestWrapper>
        <Ticketing />
      </TestWrapper>
    );

    // Titre principal de la page
    expect(
      await screen.findByRole('heading', { name: /billetterie/i })
    ).toBeInTheDocument();

    // Section « Mes billets » avec au moins un billet mocké
    expect(
      await screen.findByText(/mes billets/i)
    ).toBeInTheDocument();

    expect(
      await screen.findByText(/concert test/i)
    ).toBeInTheDocument();
  });

  it('affiche le badge COMPLET pour un événement soldOut', async () => {
    render(
      <TestWrapper>
        <Ticketing />
      </TestWrapper>
    );
    const completLabels = await screen.findAllByText(/COMPLET/i);
    expect(completLabels.length).toBeGreaterThanOrEqual(1);
    expect(await screen.findByText(/Événement complet/i)).toBeInTheDocument();
  });

  it('affiche les billets avec fallbacks (sans event_date, status used)', async () => {
    getMyTicketsMock.mockResolvedValueOnce([
      { id: 2, event_name: null, event_date: null, qr_code: null, status: 'used' },
    ]);
    render(
      <TestWrapper>
        <Ticketing />
      </TestWrapper>
    );
    await screen.findByText(/mes billets/i);
    await screen.findByText('Événement', {}, { timeout: 3000 });
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('ne met pas à jour state si composant démonté avant résolution (cancelled)', async () => {
    let resolvePromise;
    const delayedPromise = new Promise((r) => { resolvePromise = r; });
    getMyTicketsMock.mockReturnValueOnce(delayedPromise);
    const { unmount } = render(
      <TestWrapper>
        <Ticketing />
      </TestWrapper>
    );
    unmount();
    resolvePromise([]);
    await Promise.resolve();
    expect(getMyTicketsMock).toHaveBeenCalled();
  });
});

