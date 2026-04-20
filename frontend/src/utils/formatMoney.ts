/**
 * Phase 8 — Devises Afrique / formatage monétaire.
 */
export type SupportedCurrencyCode = 'XOF' | 'XAF' | 'MAD' | 'NGN' | 'KES' | 'EUR' | 'USD';

const SYMBOLS: Partial<Record<SupportedCurrencyCode, string>> = {
  XOF: 'FCFA',
  XAF: 'FCFA',
  MAD: 'MAD',
  NGN: '₦',
  KES: 'KSh',
};

export function formatMoneyAmount(
  amount: number,
  currency: SupportedCurrencyCode,
  locale: string = 'fr-FR'
): string {
  const n = Number(amount);
  if (!Number.isFinite(n)) return '—';
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: currency === 'XOF' || currency === 'XAF' ? 0 : 2,
    }).format(n);
  } catch {
    const sym = SYMBOLS[currency] ?? currency;
    return `${n.toLocaleString(locale)} ${sym}`;
  }
}

/** Affichage court type catalogue (ex. 1 500 FCFA). */
export function formatMoneyShort(amount: number, currency: SupportedCurrencyCode = 'XOF'): string {
  const n = Number(amount);
  if (!Number.isFinite(n)) return '—';
  const sym = SYMBOLS[currency] ?? currency;
  return `${n.toLocaleString('fr-FR')} ${sym}`;
}
