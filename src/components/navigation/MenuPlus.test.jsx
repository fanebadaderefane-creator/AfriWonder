import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import MenuPlus from './MenuPlus';

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: null, isLoading: false, isError: false })),
}));

vi.mock('@/contexts/FeatureFlagsContext', () => ({
  useFeatureFlags: () => ({ isEnabled: () => true }),
}));

describe('MenuPlus', () => {
  it('renders when open with user and section titles', () => {
    render(
      <MemoryRouter>
        <MenuPlus
          isOpen
          onClose={vi.fn()}
          user={{ full_name: 'Test User', email: 'test@example.com' }}
        />
      </MemoryRouter>
    );
    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('COMMERCE & SERVICES')).toBeInTheDocument();
    expect(screen.getByText('Marketplace')).toBeInTheDocument();
  });

  it('renders Utilisateur when user has no full_name', () => {
    render(
      <MemoryRouter>
        <MenuPlus isOpen onClose={vi.fn()} user={{}} />
      </MemoryRouter>
    );
    expect(screen.getByText('Utilisateur')).toBeInTheDocument();
  });
});
