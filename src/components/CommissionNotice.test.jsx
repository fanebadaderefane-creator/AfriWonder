import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CommissionNotice from './CommissionNotice';

const { api } = vi.hoisted(() => ({
  api: {
    commissions: {
      getConfig: vi.fn(),
      calculate: vi.fn(),
    },
  },
}));
vi.mock('@/api/expressClient', () => ({ api }));

function renderWithClient(ui) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      {ui}
    </QueryClientProvider>
  );
}

describe('CommissionNotice', () => {
  beforeEach(() => {
    api.commissions.getConfig.mockResolvedValue({
      data: {
        marketplace: { seller_commission_default_pct: 0.05 },
        ticketing: { ticket_platform_pct: 0.08 },
      },
    });
    api.commissions.calculate.mockResolvedValue({ platform: 150 });
  });

  it('renders nothing while config is loading', () => {
    api.commissions.getConfig.mockImplementation(() => new Promise(() => {}));
    const { container } = renderWithClient(
      <CommissionNotice vertical="marketplace" />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when vertical has no rate', async () => {
    api.commissions.getConfig.mockResolvedValue({ data: {} });
    const { container } = renderWithClient(
      <CommissionNotice vertical="unknown_vertical" />
    );
    await vi.waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it('renders compact notice with commission and estimated fees', async () => {
    renderWithClient(
      <CommissionNotice vertical="marketplace" amountFcfa={5000} compact />
    );
    await vi.waitFor(() => {
      expect(screen.getByText(/Commission plateforme.*5 %/)).toBeInTheDocument();
    });
    await vi.waitFor(() => {
      expect(screen.getByText(/Frais estimés/)).toBeInTheDocument();
    });
  });

  it('renders full notice with Transparence des frais and meta label', async () => {
    renderWithClient(
      <CommissionNotice vertical="ticketing" amountFcfa={3000} />
    );
    await vi.waitFor(() => {
      expect(screen.getByText('Transparence des frais')).toBeInTheDocument();
    });
    expect(screen.getByText(/pour Billetterie/)).toBeInTheDocument();
    await vi.waitFor(() => {
      expect(screen.getByText(/Frais estimés pour ce montant/)).toBeInTheDocument();
    });
  });

  it('renders compact without fees when platformAmount is zero', async () => {
    api.commissions.calculate.mockResolvedValue({ platform: 0 });
    renderWithClient(
      <CommissionNotice vertical="marketplace" amountFcfa={100} compact />
    );
    await vi.waitFor(() => {
      expect(screen.getByText(/Commission plateforme.*5 %/)).toBeInTheDocument();
    });
    expect(screen.queryByText(/Frais estimés/)).not.toBeInTheDocument();
  });

  it('uses service_fee when breakdown has no platform key', async () => {
    api.commissions.calculate.mockResolvedValue({ service_fee: 200 });
    renderWithClient(
      <CommissionNotice vertical="marketplace" amountFcfa={5000} />
    );
    await vi.waitFor(() => {
      expect(screen.getByText(/Frais estimés pour ce montant/)).toBeInTheDocument();
    });
    expect(screen.getByText(/200.*FCFA/)).toBeInTheDocument();
  });

  it('renders full notice without meta label when vertical has no label', async () => {
    api.commissions.getConfig.mockResolvedValue({
      data: { marketplace: { seller_commission_default_pct: 0.05 } },
    });
    renderWithClient(
      <CommissionNotice vertical="marketplace" />
    );
    await vi.waitFor(() => {
      expect(screen.getByText(/Commission plateforme AfriWonder/)).toBeInTheDocument();
    });
  });

  it('does not enable calc query when amountFcfa is 0', async () => {
    api.commissions.calculate.mockClear();
    renderWithClient(
      <CommissionNotice vertical="marketplace" amountFcfa={0} />
    );
    await vi.waitFor(() => {
      expect(screen.getByText(/Commission plateforme AfriWonder/)).toBeInTheDocument();
    });
    expect(api.commissions.calculate).not.toHaveBeenCalled();
  });
});
