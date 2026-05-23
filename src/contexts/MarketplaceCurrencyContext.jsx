import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '@/api/expressClient';
import { getItem, setItem } from '@/utils/safeStorage';
import { getIntlLocale } from '@/lib/localeIntl';
import { AFW_LANGUAGE_CHANGE } from '@/constants/events';

const STORAGE_KEY = 'marketplace_currency';

const SUPPORTED = ['XOF', 'EUR', 'NGN', 'KES'];

function normalizeCurrency(v) {
  const s = String(v || '').toUpperCase();
  return SUPPORTED.includes(s) ? s : 'XOF';
}

function parseRatesFromApi(raw) {
  const list = Array.isArray(raw) ? raw : [];
  const find = (from, to) => {
    const d = list.find((r) => r.from_currency === from && r.to_currency === to);
    if (d && Number(d.rate) > 0) return Number(d.rate);
    const inv = list.find((r) => r.from_currency === to && r.to_currency === from);
    if (inv && Number(inv.rate) > 0) return 1 / Number(inv.rate);
    return null;
  };
  return {
    eurToXof: find('EUR', 'XOF'),
    xofToNgn: find('XOF', 'NGN'),
    xofToKes: find('XOF', 'KES'),
  };
}

const MarketplaceCurrencyContext = createContext({
  currency: 'XOF',
  setCurrency: () => {},
  formatPrice: (amountXof) => `${(amountXof || 0).toLocaleString('fr-FR')} FCFA`,
  isLoading: false
});

function readUiLanguage() {
  return getItem('language', 'fr') || 'fr';
}

export function MarketplaceCurrencyProvider({ children }) {
  const [currency, setCurrencyState] = useState(() => normalizeCurrency(getItem(STORAGE_KEY)));
  const [rates, setRates] = useState({ eurToXof: null, xofToNgn: null, xofToKes: null });
  const [isLoading, setIsLoading] = useState(true);
  const [uiLanguage, setUiLanguage] = useState(() => readUiLanguage());

  useEffect(() => {
    setItem(STORAGE_KEY, currency);
  }, [currency]);

  useEffect(() => {
    let cancelled = false;
    api.exchangeRates.getRates()
      .then((data) => {
        if (cancelled) return;
        const rows = Array.isArray(data) ? data : (data?.data ?? data?.rates ?? []);
        setRates(parseRatesFromApi(rows));
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const sync = () => setUiLanguage(readUiLanguage());
    window.addEventListener(AFW_LANGUAGE_CHANGE, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(AFW_LANGUAGE_CHANGE, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const setCurrency = useCallback((value) => {
    setCurrencyState(normalizeCurrency(value));
  }, []);

  const formatPrice = useCallback((amountXof) => {
    const n = Number(amountXof) || 0;
    const locale = getIntlLocale(uiLanguage);
    const { eurToXof, xofToNgn, xofToKes } = rates;

    if (currency === 'EUR' && eurToXof && eurToXof > 0) {
      const eur = n / eurToXof;
      return new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(eur);
    }
    if (currency === 'NGN' && xofToNgn && xofToNgn > 0) {
      const ngn = n * xofToNgn;
      return new Intl.NumberFormat(locale, { style: 'currency', currency: 'NGN', maximumFractionDigits: 2 }).format(ngn);
    }
    if (currency === 'KES' && xofToKes && xofToKes > 0) {
      const kes = n * xofToKes;
      return new Intl.NumberFormat(locale, { style: 'currency', currency: 'KES', maximumFractionDigits: 2 }).format(kes);
    }

    if (currency === 'NGN' || currency === 'KES') {
      return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(n)} FCFA`;
    }

    return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(n)} FCFA`;
  }, [currency, rates, uiLanguage]);

  const value = {
    currency,
    setCurrency,
    formatPrice,
    isLoading,
    eurToXofRate: rates.eurToXof
  };

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
