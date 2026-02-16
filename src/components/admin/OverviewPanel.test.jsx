import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import OverviewPanel from './OverviewPanel';

vi.mock('@/api/expressClient', () => ({
  api: { admin: { getDashboard: vi.fn().mockResolvedValue({}) } },
}));

const mockUseQuery = vi.fn();
vi.mock('@tanstack/react-query', () => ({ useQuery: (opts) => mockUseQuery(opts) }));

const dashboard = {
  stats: { totalRevenue: 5000, totalUsers: 100, totalOrders: 50, totalVideos: 20 },
  recentOrders: [],
};

describe('OverviewPanel', () => {
  beforeEach(() => {
    mockUseQuery.mockReturnValue({ data: dashboard, isLoading: false });
  });

  it('renders Actions rapides section', () => {
    render(
      <MemoryRouter>
        <OverviewPanel />
      </MemoryRouter>
    );
    expect(screen.getByText(/Actions rapides/i)).toBeInTheDocument();
  });

  it('renders Revenu total when dashboard loaded', () => {
    render(
      <MemoryRouter>
        <OverviewPanel />
      </MemoryRouter>
    );
    expect(screen.getByText(/Revenu total/i)).toBeInTheDocument();
  });

  it('shows Chargement when loading', () => {
    mockUseQuery.mockReturnValue({ data: null, isLoading: true });
    render(
      <MemoryRouter>
        <OverviewPanel />
      </MemoryRouter>
    );
    expect(screen.getByText(/Chargement/i)).toBeInTheDocument();
  });

  it('renders recent orders when dashboard has recentOrders', () => {
    mockUseQuery.mockReturnValue({
      data: {
        ...dashboard,
        recentOrders: [
          { id: 'ord-12345678', total_amount: 5000, status: 'delivered', user: { username: 'john' } },
        ],
      },
      isLoading: false,
    });
    render(
      <MemoryRouter>
        <OverviewPanel />
      </MemoryRouter>
    );
    expect(screen.getByText(/Commandes recentes/i)).toBeInTheDocument();
    expect(screen.getByText('#ord-1234')).toBeInTheDocument();
    expect(screen.getByText('delivered')).toBeInTheDocument();
  });

  it('formats totalRevenue in millions (M) when >= 1e6', () => {
    mockUseQuery.mockReturnValue({
      data: {
        stats: { totalRevenue: 2_500_000, totalUsers: 100, totalOrders: 50, totalVideos: 20 },
        recentOrders: [],
      },
      isLoading: false,
    });
    render(
      <MemoryRouter>
        <OverviewPanel />
      </MemoryRouter>
    );
    expect(screen.getByText(/2\.50M XOF/)).toBeInTheDocument();
  });

  it('formats totalRevenue in thousands (K) when >= 1e3 and < 1e6', () => {
    mockUseQuery.mockReturnValue({
      data: {
        stats: { totalRevenue: 5000, totalUsers: 100, totalOrders: 50, totalVideos: 20 },
        recentOrders: [],
      },
      isLoading: false,
    });
    render(
      <MemoryRouter>
        <OverviewPanel />
      </MemoryRouter>
    );
    expect(screen.getByText(/5K XOF/)).toBeInTheDocument();
  });

  it('formats totalUsers with K when >= 1000', () => {
    mockUseQuery.mockReturnValue({
      data: {
        stats: { totalRevenue: 0, totalUsers: 2500, totalOrders: 50, totalVideos: 20 },
        recentOrders: [],
      },
      isLoading: false,
    });
    render(
      <MemoryRouter>
        <OverviewPanel />
      </MemoryRouter>
    );
    expect(screen.getByText(/2\.5K/)).toBeInTheDocument();
  });

  it('formats totalVideos with K when >= 1000', () => {
    mockUseQuery.mockReturnValue({
      data: {
        stats: { totalRevenue: 0, totalUsers: 100, totalOrders: 50, totalVideos: 1500 },
        recentOrders: [],
      },
      isLoading: false,
    });
    render(
      <MemoryRouter>
        <OverviewPanel />
      </MemoryRouter>
    );
    expect(screen.getByText(/1\.5K/)).toBeInTheDocument();
  });

  it('shows Aucune commande recente when recentOrders is empty', () => {
    mockUseQuery.mockReturnValue({ data: dashboard, isLoading: false });
    render(
      <MemoryRouter>
        <OverviewPanel />
      </MemoryRouter>
    );
    expect(screen.getByText(/Aucune commande recente/)).toBeInTheDocument();
  });

  it('renders order without user username (no bullet)', () => {
    mockUseQuery.mockReturnValue({
      data: {
        ...dashboard,
        recentOrders: [
          { id: 'ord-aaa', total_amount: 1000, status: 'pending', user: null },
        ],
      },
      isLoading: false,
    });
    render(
      <MemoryRouter>
        <OverviewPanel />
      </MemoryRouter>
    );
    expect(screen.getByText(/1[\s,\u202f]?000 XOF/)).toBeInTheDocument();
    expect(screen.getByText('pending')).toBeInTheDocument();
  });

  it('handles dashboard with no stats (empty object)', () => {
    mockUseQuery.mockReturnValue({
      data: { stats: undefined, recentOrders: [] },
      isLoading: false,
    });
    render(
      <MemoryRouter>
        <OverviewPanel />
      </MemoryRouter>
    );
    expect(screen.getByText(/Revenu total/i)).toBeInTheDocument();
    expect(screen.getByText(/0 XOF/)).toBeInTheDocument();
  });

  it('renders order with user.username (bullet and username)', () => {
    mockUseQuery.mockReturnValue({
      data: {
        ...dashboard,
        recentOrders: [
          { id: 'ord-user123', total_amount: 3000, status: 'paid', user: { username: 'alice' } },
        ],
      },
      isLoading: false,
    });
    render(
      <MemoryRouter>
        <OverviewPanel />
      </MemoryRouter>
    );
    expect(screen.getByText(/3[\s,\u202f]?000 XOF.*alice/)).toBeInTheDocument();
  });

  it('renders order with user but no username (no bullet)', () => {
    mockUseQuery.mockReturnValue({
      data: {
        ...dashboard,
        recentOrders: [
          { id: 'ord-nouser', total_amount: 500, status: 'pending', user: {} },
        ],
      },
      isLoading: false,
    });
    render(
      <MemoryRouter>
        <OverviewPanel />
      </MemoryRouter>
    );
    expect(screen.getByText(/500 XOF/)).toBeInTheDocument();
    expect(screen.queryByText(/\s•\s/)).not.toBeInTheDocument();
  });
});
