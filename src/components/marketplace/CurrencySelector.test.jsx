import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import CurrencySelector from './CurrencySelector';

const mockSetCurrency = vi.fn();
let mockCurrency = 'XOF';

vi.mock('@/contexts/MarketplaceCurrencyContext', () => ({
  useMarketplaceCurrency: () => ({ currency: mockCurrency, setCurrency: mockSetCurrency }),
}));

describe('CurrencySelector', () => {
  beforeEach(() => {
    mockSetCurrency.mockClear();
    mockCurrency = 'XOF';
  });

  it('renders currency buttons including FCFA, EUR, NGN, KES', () => {
    render(<CurrencySelector />);
    expect(screen.getByRole('button', { name: /FCFA/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^EUR$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^NGN$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^KES$/i })).toBeInTheDocument();
  });

  it('calls setCurrency when clicking EUR', async () => {
    render(<CurrencySelector />);
    await userEvent.click(screen.getByRole('button', { name: /EUR/i }));
    expect(mockSetCurrency).toHaveBeenCalledWith('EUR');
  });

  it('calls setCurrency when clicking FCFA', async () => {
    render(<CurrencySelector />);
    await userEvent.click(screen.getByRole('button', { name: /FCFA/i }));
    expect(mockSetCurrency).toHaveBeenCalledWith('XOF');
  });

  it('renders with EUR selected when currency is EUR', () => {
    mockCurrency = 'EUR';
    render(<CurrencySelector />);
    const eurBtn = screen.getByRole('button', { name: /^EUR$/i });
    expect(eurBtn).toHaveClass('bg-blue-500');
  });

  it('calls setCurrency when clicking NGN', async () => {
    render(<CurrencySelector />);
    await userEvent.click(screen.getByRole('button', { name: /^NGN$/i }));
    expect(mockSetCurrency).toHaveBeenCalledWith('NGN');
  });
});
