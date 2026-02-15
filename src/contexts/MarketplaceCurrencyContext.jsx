import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '@/api/expressClient';
import { getItem, setItem } from '@/utils/safeStorage';

const STORAGE_KEY = 'marketplace_currency';

const MarketplaceCurrencyContext = createContext({
  currency: 'XOF',
  setCurrency: () => {},
  formatPrice: (amountXof) => `${(amountXof || 0).toLocaleString('fr-FR')} FCFA`,
  isLoading: false
});

export function MarketplaceCurrencyProvider({ children }) {
  const [currency, setCurrencyState] = useState(() => getItem(STORAGE_KEY) || 'XOF');
  const [eurToXofRate, setEurToXofRate] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setItem(STORAGE_KEY, currency);
  }, [currency]);

  useEffect(() => {
    let cancelled = false;
    api.exchangeRates.getRates()
      .then((data) => {
        if (cancelled) return;
        const rates = Array.isArray(data) ? data : (data?.data ?? data?.rates ?? []);
        const eurXof = rates.find((r) =>
          (r.from_currency === 'EUR' && r.to_currency === 'XOF') ||
          (r.from_currency === 'XOF' && r.to_currency === 'EUR')
        );
        if (eurXof) {
          const rate = eurXof.from_currency === 'EUR' ? eurXof.rate : 1 / eurXof.rate;
          setEurToXofRate(rate);
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const setCurrency = useCallback((value) => {
    setCurrencyState(value === 'EUR' || value === 'XOF' ? value : 'XOF');
  }, []);

  const formatPrice = useCallback((amountXof) => {
    const n = Number(amountXof) || 0;
    if (currency === 'EUR' && eurToXofRate && eurToXofRate > 0) {
      const eur = n / eurToXofRate;
      return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(eur);
    }
    return `${n.toLocaleString('fr-FR')} FCFA`;
  }, [currency, eurToXofRate]);

  const value = { currency, setCurrency, formatPrice, isLoading, eurToXofRate };

  return (
    <MarketplaceCurrencyContext.Provider value={value}>
      {children}
    </MarketplaceCurrencyContext.Provider>
  );
}

export function useMarketplaceCurrency() {
  const ctx = useContext(MarketplaceCurrencyContext);
  return ctx || {
    currency: 'XOF',
    setCurrency: () => {},
    formatPrice: (amountXof) => `${(amountXof || 0).toLocaleString('fr-FR')} FCFA`,
    isLoading: false
  };
}
