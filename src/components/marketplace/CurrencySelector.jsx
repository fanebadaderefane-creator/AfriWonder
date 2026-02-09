import React from 'react';
import { Button } from '@/components/ui/button';
import { useMarketplaceCurrency } from '@/contexts/MarketplaceCurrencyContext';

export default function CurrencySelector() {
  const { currency, setCurrency } = useMarketplaceCurrency();

  return (
    <div className="flex rounded-lg border border-gray-200 overflow-hidden bg-gray-50">
      <Button
        variant={currency === 'XOF' ? 'default' : 'ghost'}
        size="sm"
        className={`rounded-none border-0 ${currency === 'XOF' ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'text-gray-600'}`}
        onClick={() => setCurrency('XOF')}
      >
        FCFA
      </Button>
      <Button
        variant={currency === 'EUR' ? 'default' : 'ghost'}
        size="sm"
        className={`rounded-none border-0 ${currency === 'EUR' ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'text-gray-600'}`}
        onClick={() => setCurrency('EUR')}
      >
        EUR
      </Button>
    </div>
  );
}
