import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import AfriWonderLogo from './AfriWonderLogo';

describe('AfriWonderLogo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders img with logo by default', () => {
    render(<AfriWonderLogo />);
    const img = screen.getByRole('img', { name: 'AfriWonder Logo' });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', '/icon-192.png');
  });

  it('renders fallback text when image fails to load', () => {
    render(<AfriWonderLogo />);
    const img = screen.getByRole('img', { name: 'AfriWonder Logo' });
    fireEvent.error(img);
    expect(screen.getByText('AfriWonder')).toBeInTheDocument();
  });

  it('applies size class', () => {
    const { container } = render(<AfriWonderLogo size="lg" />);
    const wrap = container.querySelector('.afriwonder-logo');
    expect(wrap).toHaveClass('w-24', 'h-24');
  });

  it('falls back to md size class when size is unknown', () => {
    const { container } = render(<AfriWonderLogo size="xxl" />);
    const wrap = container.querySelector('.afriwonder-logo');
    expect(wrap).toHaveClass('w-16', 'h-16');
  });
});
