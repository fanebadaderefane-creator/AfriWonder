import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import OptimizedImage from './ImageOptimizer';

describe('ImageOptimizer', () => {
  beforeEach(() => {
    delete window.navigator.connection;
    delete window.navigator.mozConnection;
    delete window.navigator.webkitConnection;
  });

  it('renders img with src and alt', () => {
    render(<OptimizedImage src="https://example.com/img.jpg" alt="Test" />);
    const img = screen.getByRole('img', { name: 'Test' });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/img.jpg');
  });

  it('uses lazy loading by default', () => {
    render(<OptimizedImage src="https://a.com/x.jpg" alt="Lazy" />);
    expect(screen.getByRole('img')).toHaveAttribute('loading', 'lazy');
  });

  it('uses eager when priority', () => {
    render(<OptimizedImage src="https://a.com/x.jpg" alt="Eager" priority />);
    expect(screen.getByRole('img')).toHaveAttribute('loading', 'eager');
  });

  it('appends q=40 for slow connection', async () => {
    Object.defineProperty(navigator, 'connection', {
      value: { effectiveType: '2g' },
      configurable: true,
    });
    render(<OptimizedImage src="https://example.com/pic.jpg" alt="Pic" />);
    await vi.waitFor(() => {
      const img = screen.getByRole('img');
      expect(img.getAttribute('src')).toMatch(/\?q=40|&q=40/);
    });
  });

  it('appends &q=40 for slow connection when src has query string', async () => {
    Object.defineProperty(navigator, 'connection', {
      value: { effectiveType: '3g' },
      configurable: true,
    });
    render(<OptimizedImage src="https://example.com/pic.jpg?size=large" alt="Pic" />);
    await vi.waitFor(() => {
      const img = screen.getByRole('img');
      expect(img.getAttribute('src')).toBe('https://example.com/pic.jpg?size=large&q=40');
    });
  });

  it('does not modify url when src is empty', () => {
    render(<OptimizedImage src="" alt="Empty" />);
    const img = screen.getByRole('img', { name: 'Empty' });
    expect(img).toHaveAttribute('src', '');
  });

  it('applies opacity-100 after image loads', async () => {
    render(<OptimizedImage src="https://example.com/loaded.jpg" alt="Loaded" />);
    const img = screen.getByRole('img', { name: 'Loaded' });
    expect(img).toHaveClass('opacity-0');
    fireEvent.load(img);
    expect(img).toHaveClass('opacity-100');
  });
});
