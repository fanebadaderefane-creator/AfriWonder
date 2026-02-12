import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import MenuPlus from './MenuPlus';

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
    expect(screen.getByText('Super App AfriWonder')).toBeInTheDocument();
    expect(screen.getByText('Commerce & Services')).toBeInTheDocument();
    expect(screen.getByText('Marketplace')).toBeInTheDocument();
    expect(screen.getByText('Mode hors-ligne')).toBeInTheDocument();
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
