import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import OfflineIndicator from './OfflineIndicator';

describe('OfflineIndicator', () => {
  beforeEach(() => {
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
  });

  it('renders nothing when online and no recent offline', () => {
    const { container } = render(<OfflineIndicator />);
    expect(container.querySelector('.bg-amber-500')).not.toBeInTheDocument();
    expect(container.querySelector('.bg-green-500')).not.toBeInTheDocument();
  });

  it('hides back-online state when window goes offline after mount', async () => {
    render(<OfflineIndicator />);
    window.dispatchEvent(new Event('offline'));
    expect(await screen.findByText(/Mode hors ligne/i)).toBeInTheDocument();
  });

  it('shows offline banner when window goes offline', () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    render(<OfflineIndicator />);
    expect(screen.getByText(/Mode hors ligne/i)).toBeInTheDocument();
  });

  it('shows back online banner and Actualiser button when online after offline', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    render(<OfflineIndicator />);
    expect(screen.getByText(/Mode hors ligne/i)).toBeInTheDocument();
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    window.dispatchEvent(new Event('online'));
    expect(await screen.findByText(/Vous êtes de nouveau en ligne/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Actualiser/i })).toBeInTheDocument();
  });

  it('calls location.reload when Actualiser clicked', async () => {
    const reloadFn = vi.fn();
    Object.defineProperty(window, 'location', { value: { ...window.location, reload: reloadFn }, configurable: true });
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    render(<OfflineIndicator />);
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    window.dispatchEvent(new Event('online'));
    const btn = await screen.findByRole('button', { name: /Actualiser/i });
    await userEvent.setup().click(btn);
    expect(reloadFn).toHaveBeenCalled();
  });

  it('clears previous backOnline timer when online fires twice', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    render(<OfflineIndicator />);
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    window.dispatchEvent(new Event('online'));
    await vi.waitFor(() => {
      expect(screen.getByText(/Vous êtes de nouveau en ligne/)).toBeInTheDocument();
    });
    window.dispatchEvent(new Event('online'));
    await vi.waitFor(() => {
      expect(screen.getByText(/Vous êtes de nouveau en ligne/)).toBeInTheDocument();
    });
  });
});
