import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import OfflinePage from './Offline';

vi.mock('@/services/offlineCache.service.js', () => ({
  default: {
    listCachedDownloads: vi.fn().mockResolvedValue([]),
  },
}));

describe('Offline page', () => {
  const originalOnLine = Object.getOwnPropertyDescriptor(global, 'navigator');

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(global, 'navigator', {
      value: { onLine: true },
      configurable: true,
      writable: true,
    });
    if ('caches' in global) {
      global.caches.keys = vi.fn().mockResolvedValue(['cache-1']);
    } else {
      global.caches = { keys: vi.fn().mockResolvedValue(['cache-1']) };
    }
  });

  afterEach(() => {
    if (originalOnLine) Object.defineProperty(global, 'navigator', originalOnLine);
  });

  it('affiche le titre Mode hors ligne', async () => {
    render(<OfflinePage />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(screen.getByRole('heading', { name: /Mode hors ligne/i })).toBeInTheDocument();
  });

  it('affiche le statut en ligne quand navigator.onLine est true', async () => {
    render(<OfflinePage />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(screen.getByText(/Vous êtes en ligne/)).toBeInTheDocument();
  });

  it('affiche le bouton Actualiser la page quand en ligne', async () => {
    render(<OfflinePage />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(screen.getByRole('button', { name: /Actualiser la page/i })).toBeInTheDocument();
  });

  it('appelle window.location.reload au clic sur Actualiser', async () => {
    const reloadMock = vi.fn();
    Object.defineProperty(window, 'location', { value: { reload: reloadMock }, writable: true });
    render(<OfflinePage />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    await userEvent.click(screen.getByRole('button', { name: /Actualiser la page/i }));
    expect(reloadMock).toHaveBeenCalled();
  });

  it('affiche la section Contenu disponible hors ligne', async () => {
    render(<OfflinePage />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(screen.getByText(/Contenu disponible hors ligne/)).toBeInTheDocument();
    expect(screen.getByText(/Disponible hors ligne/)).toBeInTheDocument();
  });

  it('affiche hors ligne et pas la carte Actualiser quand navigator.onLine est false', async () => {
    Object.defineProperty(global, 'navigator', {
      value: { onLine: false },
      configurable: true,
      writable: true,
    });
    render(<OfflinePage />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(screen.getByText(/Vous êtes hors ligne/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Actualiser la page/i })).not.toBeInTheDocument();
  });
});
