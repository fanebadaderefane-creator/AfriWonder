/**
 * Configuration CEDEAO – Lancement Mali, expansion Sénégal / Côte d'Ivoire / Burkina.
 * Infrastructure prête multi-pays avec devise commune (XOF).
 */

export const SUPPORTED_COUNTRIES = ['ML', 'SN', 'CI', 'BF'] as const;
export const COUNTRY_NAMES: Record<string, string> = {
  ML: 'Mali',
  SN: 'Sénégal',
  CI: "Côte d'Ivoire",
  BF: 'Burkina Faso',
};
export const DEFAULT_CURRENCY = 'XOF';
export const DEFAULT_COUNTRY = 'ML';

export function getAppCountry(): string {
  const c = process.env.APP_COUNTRY?.toUpperCase().trim();
  if (c && SUPPORTED_COUNTRIES.includes(c as any)) return c;
  return DEFAULT_COUNTRY;
}

export function isSupportedCountry(code: string): boolean {
  return SUPPORTED_COUNTRIES.includes(code?.toUpperCase() as any);
}
