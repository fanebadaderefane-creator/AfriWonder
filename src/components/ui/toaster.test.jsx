import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Toaster } from './toaster';

vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toasts: [
      { id: '1', title: 'Toast 1', description: 'Desc 1' },
      { id: '2', title: 'Toast 2' },
    ],
  }),
}));

describe('Toaster', () => {
  it('renders toasts from useToast', () => {
    render(<Toaster />);
    expect(screen.getByText('Toast 1')).toBeInTheDocument();
    expect(screen.getByText('Desc 1')).toBeInTheDocument();
    expect(screen.getByText('Toast 2')).toBeInTheDocument();
  });
});
