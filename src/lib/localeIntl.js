/**
 * Locales BCP 47 pour Intl (aligné audit : FR, EN, variants régionaux CFA/NGN/KES).
 * Codes clés = clés `language` dans TranslationProvider / localStorage.
 */
const LANGUAGE_TO_INTL_LOCALE = {
  fr: 'fr-FR',
  en: 'en-GB',
  pt: 'pt-PT',
  bm: 'fr-ML',
  wo: 'fr-SN',
  ha: 'ha-NG',
  sw: 'sw-KE',
  ar: 'ar-MA',
};

export function getIntlLocale(language) {
  const key = String(language || 'fr').trim();
  return LANGUAGE_TO_INTL_LOCALE[key] || 'fr-FR';
}

export function formatNumber(value, locale, options = {}) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0';
  return new Intl.NumberFormat(locale, options).format(n);
}

export function formatDate(value, locale, options = {}) {
  if (value == null) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat(locale, options).format(d);
}

/** Montant avec symbole ou code devise (sans taux cross pour NGN/KES : affichage seulement). */
export function formatCurrencyAmount(value, locale, currencyCode) {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return new Intl.NumberFormat(locale, { style: 'currency', currency: currencyCode }).format(0);
  }
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode,
    maximumFractionDigits: currencyCode === 'XOF' || currencyCode === 'XAF' ? 0 : 2,
  }).format(n);
}
