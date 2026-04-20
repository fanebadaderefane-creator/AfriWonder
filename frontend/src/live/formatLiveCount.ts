/** Affichage type FYP (1.2K, 3M) pour spectateurs / likes. */
export function formatLiveCount(n: number): string {
  if (!Number.isFinite(n) || n < 0) return '0';
  if (n < 1000) return String(Math.floor(n));
  if (n < 1_000_000) {
    const k = n / 1000;
    return k >= 100 ? `${Math.floor(k)}K` : `${k >= 10 ? k.toFixed(1) : k.toFixed(2)}K`.replace(/\.?0+K$/, 'K');
  }
  const m = n / 1_000_000;
  return `${m >= 10 ? m.toFixed(1) : m.toFixed(2)}M`.replace(/\.0M$/, 'M');
}
