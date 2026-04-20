/**
 * Économie des coins AfriWonder — Phase 9 (document align_spec).
 * - Achat : ~5 FCFA / coin (packs type 100 coins / 500 FCFA).
 * - Conversion solde coins → FCFA portefeuille créateur / retrait : 1 coin = 2 FCFA (document).
 */
const envNum = (key: string, fallback: number) => {
  const v = parseFloat(process.env[key] || '');
  return Number.isFinite(v) && v > 0 ? v : fallback;
};

/** FCFA crédités sur le portefeuille vendeur pour chaque coin échangé (Phase 9). */
export const COIN_FCFA_PER_COIN_PAYOUT = envNum('COIN_FCFA_PER_COIN_PAYOUT', 2);

/** Ordre de grandeur achat (information API / UI), FCFA par coin. */
export const COIN_FCFA_APPROX_PURCHASE_PER_COIN = envNum('COIN_FCFA_APPROX_PURCHASE_PER_COIN', 5);

/** Minimum de coins pour un échange vers FCFA (évite le spam). */
export const COIN_EXCHANGE_MIN_COINS = Math.max(1, Math.floor(envNum('COIN_EXCHANGE_MIN_COINS', 50)));

/**
 * Valeur indicative **USD** pour **100 coins** reversés au créateur (CDC 6.4 — configurable par région).
 * L’encaissement réel reste en FCFA via `COIN_FCFA_PER_COIN_PAYOUT` ; ce champ sert à l’affichage / transparence.
 */
export const COIN_USD_PER_100_COINS_PAYOUT = envNum('COIN_USD_PER_100_COINS_PAYOUT', 0.5);
