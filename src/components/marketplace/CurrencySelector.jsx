import React from 'react';
import { Button } from '@/components/ui/button';
import { useMarketplaceCurrency } from '@/contexts/MarketplaceCurrencyContext';

const OPTIONS = [
  { id: 'XOF', label: 'FCFA' },
  { id: 'EUR', label: 'EUR' },
  { id: 'NGN', label: 'NGN' },
  { id: 'KES', label: 'KES' },
];

export default function CurrencySelector() {
  const { currency, setCurrency } = useMarketplaceCurrency();

  return (
    <div className="grid grid-cols-2 sm:flex sm:flex-wrap rounded-lg border border-gray-200 overflow-hidden bg-gray-50">
      {OPTIONS.map(({ id, label }) => (
        <Button
          key={id}
          variant={currency === id ? 'default' : 'ghost'}
          size="sm"
          className={`rounded-none border-0 min-h-9 text-xs sm:text-sm ${currency === id ? 'bg-blue-500 hover:bg-blue-600 text-white' : 'text-gray-600'}`}
          onClick={() => setCurrency(id)}
        >
          {label}
        </Button>
      ))}
    </div>
  );
}
