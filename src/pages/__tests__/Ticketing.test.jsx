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

// Mock léger du client API pour éviter tout appel réseau réel
vi.mock('@/api/expressClient', () => ({
  __esModule: true,
  default: {
    tickets: {
      getMyTickets: vi.fn().mockResolvedValue([
        {
          id: 1,
          event_name: 'Concert test',
          event_date: '2027-03-15T20:00:00.000Z',
          qr_code: 'QR-CODE',
          status: 'valid',
        },
      ]),
    },
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
});

