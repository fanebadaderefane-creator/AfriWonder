import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import Ticketing from '../Ticketing';

// Mock léger du client API pour éviter tout appel réseau réel
vi.mock('@/api/expressClient', () => ({
  __esModule: true,
  default: {
    tickets: {
      // On retourne la même forme que l'API réelle, mais avec des données simplifiées
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
      <MemoryRouter>
        <Ticketing />
      </MemoryRouter>
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

