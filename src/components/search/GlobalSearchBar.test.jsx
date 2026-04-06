import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import GlobalSearchBar from './GlobalSearchBar';

vi.mock('@/api/expressClient', () => ({
  api: {
    products: { list: vi.fn().mockResolvedValue([]) },
    entities: { SellerProfile: { list: vi.fn().mockResolvedValue([]) } },
  },
}));
vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: { products: [], sellers: [] } })),
}));

describe('GlobalSearchBar', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('renders search input', () => {
    render(
      <MemoryRouter>
        <GlobalSearchBar />
      </MemoryRouter>
    );
    const input = document.querySelector('input');
    expect(input).toBeInTheDocument();
  });

  it('renders without crash when onSearch is not provided', () => {
    expect(() =>
      render(
        <MemoryRouter>
          <GlobalSearchBar />
        </MemoryRouter>
      )
    ).not.toThrow();
  });
});
