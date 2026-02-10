import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ErrorBoundary from './ErrorBoundary';

const ThrowError = ({ shouldThrow }) => {
  if (shouldThrow) throw new Error('Test error');
  return <div>Child content</div>;
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );
    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  it('renders fallback UI when a child throws', async () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    await waitFor(() => {
      expect(screen.getByText('Une erreur est survenue')).toBeInTheDocument();
    });
    expect(screen.getByText(/Rechargez la page pour réessayer/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Recharger la page/i })).toBeInTheDocument();
  });

  it('reload button triggers window.location.reload', async () => {
    const reloadMock = vi.fn();
    Object.defineProperty(window, 'location', { value: { reload: reloadMock }, writable: true });
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Recharger la page/i })).toBeInTheDocument();
    });
    await userEvent.click(screen.getByRole('button', { name: /Recharger la page/i }));
    expect(reloadMock).toHaveBeenCalled();
  });
});
