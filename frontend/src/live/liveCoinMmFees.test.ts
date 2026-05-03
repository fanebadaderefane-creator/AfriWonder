import { describe, expect, it } from 'vitest';
import {
  computeLiveCoinMmTotals,
  feeRateForLiveCoinMm,
  LIVE_COIN_MM_OPERATORS,
} from './liveCoinMmFees';

describe('liveCoinMmFees', () => {
  it('exposes three operators with MTN disabled', () => {
    expect(LIVE_COIN_MM_OPERATORS).toHaveLength(3);
    expect(LIVE_COIN_MM_OPERATORS.find((o) => o.id === 'mtn_money')?.enabled).toBe(false);
    expect(LIVE_COIN_MM_OPERATORS.find((o) => o.id === 'wave')?.enabled).toBe(true);
  });

  it('computes Orange Money fees at 1%', () => {
    const t = computeLiveCoinMmTotals(3500, 'orange_money');
    expect(t.packFcfa).toBe(3500);
    expect(t.operatorFeesFcfa).toBe(35);
    expect(t.customerPaysFcfa).toBe(3535);
  });

  it('computes Wave with zero fees', () => {
    const t = computeLiveCoinMmTotals(15_000, 'wave');
    expect(t.operatorFeesFcfa).toBe(0);
    expect(t.customerPaysFcfa).toBe(15_000);
  });

  it('feeRateForLiveCoinMm matches operator row', () => {
    expect(feeRateForLiveCoinMm('orange_money')).toBe(0.01);
    expect(feeRateForLiveCoinMm('mtn_money')).toBe(0.005);
    expect(feeRateForLiveCoinMm('wave')).toBe(0);
  });
});
