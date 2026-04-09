/**
 * Normalise le numéro abonné pour Orange Money Mali (WebPay).
 * Beaucoup d’API attendent le format international sans « + ».
 */
export function normalizeOrangeMoneySubscriberMl(phone: string | undefined | null): string {
  if (phone == null || typeof phone !== 'string') return '';
  const d = phone.replace(/\D/g, '');
  if (!d) return '';
  if (d.startsWith('223') && d.length >= 11) return d;
  /* 10 chiffres type 77xxxxxxxx (Mali) */
  if (d.length === 10 && d.startsWith('7')) return `223${d}`;
  /* 8 chiffres type local */
  if (d.length === 8 && /^[67]/.test(d)) return `223${d}`;
  return d;
}
