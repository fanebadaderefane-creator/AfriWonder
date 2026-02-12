/**
 * Test PageNotFound with real useQuery so the queryFn (and its catch block) runs.
 * Only api is mocked; useQuery is not mocked.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PageNotFound from './PageNotFound';

const { apiMock } = vi.hoisted(() => ({
  apiMock: { auth: { me: vi.fn() } },
}));
vi.mock('@/api/expressClient', () => ({ api: apiMock }));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

function renderPageNotFound(path = '/missing') {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="*" element={<PageNotFound />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('PageNotFound (auth query)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('affiche la page quand api.auth.me rejette (couverture catch)', async () => {
    apiMock.auth.me.mockRejectedValueOnce(new Error('Unauthorized'));
    renderPageNotFound('/any-missing');
    await vi.waitFor(() => {
      expect(screen.getByText(/Page Not Found/i)).toBeInTheDocument();
    });
    expect(screen.getByText('404')).toBeInTheDocument();
  });

  it('affiche la page quand api.auth.me résout (couverture try ligne 15)', async () => {
    apiMock.auth.me.mockResolvedValueOnce({ id: 1, email: 'u@test.com' });
    renderPageNotFound('/missing');
    await vi.waitFor(() => {
      expect(screen.getByText(/Page Not Found/i)).toBeInTheDocument();
    });
    expect(screen.getByText('404')).toBeInTheDocument();
  });
});
