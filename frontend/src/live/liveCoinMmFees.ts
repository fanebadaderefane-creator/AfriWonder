/**
 * Frais indicatifs affichés dans le tunnel recharge coins (live).
 * Le montant facturé pack reste celui du backend (`price_fcfa`) ; les frais opérateur sont une estimation UX.
 */
export type LiveCoinMmProvider = 'orange_money' | 'mtn_money' | 'wave';

export const LIVE_COIN_MM_OPERATORS: {
  id: LiveCoinMmProvider;
  label: string;
  feeHint: string;
  feeRate: number;
  enabled: boolean;
  regionsHint: string;
}[] = [
  {
    id: 'orange_money',
    label: 'Orange Money',
    feeHint: '~1 %',
    feeRate: 0.01,
    enabled: true,
    regionsHint: 'Sénégal, CI, Mali, Burkina…',
  },
  {
    id: 'mtn_money',
    label: 'MTN MoMo',
    feeHint: '~0,5 %',
    feeRate: 0.005,
    enabled: false,
    regionsHint: 'Ghana, Nigeria, Cameroun…',
  },
  {
    id: 'wave',
    label: 'Wave',
    feeHint: 'Sans frais',
    feeRate: 0,
    enabled: true,
    regionsHint: 'Sénégal, CI, Mali…',
  },
];

export function feeRateForLiveCoinMm(provider: LiveCoinMmProvider): number {
  const row = LIVE_COIN_MM_OPERATORS.find((o) => o.id === provider);
  return row?.feeRate ?? 0;
}

export function computeLiveCoinMmTotals(packFcfa: number, provider: LiveCoinMmProvider) {
  const pack = Math.max(0, Math.round(Number(packFcfa)) || 0);
  const rate = feeRateForLiveCoinMm(provider);
  const operatorFeesFcfa = Math.round(pack * rate);
  return {
    packFcfa: pack,
    operatorFeesFcfa,
    customerPaysFcfa: pack + operatorFeesFcfa,
  };
}
