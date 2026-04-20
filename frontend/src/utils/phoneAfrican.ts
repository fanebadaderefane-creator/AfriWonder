/**
 * Phase 8 — Indicatifs téléphone Afrique (extraits courants).
 */
export const AFRICAN_DIAL_CODES: { iso: string; name: string; dial: string }[] = [
  { iso: 'ML', name: 'Mali', dial: '+223' },
  { iso: 'SN', name: 'Sénégal', dial: '+221' },
  { iso: 'CI', name: "Côte d'Ivoire", dial: '+225' },
  { iso: 'BF', name: 'Burkina Faso', dial: '+226' },
  { iso: 'NE', name: 'Niger', dial: '+227' },
  { iso: 'TG', name: 'Togo', dial: '+228' },
  { iso: 'BJ', name: 'Bénin', dial: '+229' },
  { iso: 'MR', name: 'Mauritanie', dial: '+222' },
  { iso: 'GN', name: 'Guinée', dial: '+224' },
  { iso: 'GH', name: 'Ghana', dial: '+233' },
  { iso: 'NG', name: 'Nigeria', dial: '+234' },
  { iso: 'CM', name: 'Cameroun', dial: '+237' },
  { iso: 'GA', name: 'Gabon', dial: '+241' },
  { iso: 'CG', name: 'Congo', dial: '+242' },
  { iso: 'CD', name: 'RDC', dial: '+243' },
  { iso: 'MA', name: 'Maroc', dial: '+212' },
  { iso: 'DZ', name: 'Algérie', dial: '+213' },
  { iso: 'TN', name: 'Tunisie', dial: '+216' },
  { iso: 'KE', name: 'Kenya', dial: '+254' },
  { iso: 'TZ', name: 'Tanzanie', dial: '+255' },
  { iso: 'RW', name: 'Rwanda', dial: '+250' },
];

/** Normalise en +XXXXXXXX… (chiffres seuls après +). */
export function normalizeE164Like(input: string): string {
  const t = String(input || '').trim().replace(/\s/g, '');
  if (!t) return '';
  if (t.startsWith('+')) return `+${t.slice(1).replace(/\D/g, '')}`;
  return `+${t.replace(/\D/g, '')}`;
}
