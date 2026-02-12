import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/api/expressClient', () => ({
  api: {
    commissions: {
      getConfig: vi.fn(),
      calculate: vi.fn(),
    },
  },
}));

import { api } from '@/api/expressClient';
import {
  getCommissionConfig,
  getCommissionBreakdown,
  formatCommissionRate,
  formatFcfa,
} from './commissions';

describe('commissions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getCommissionConfig', () => {
    it('returns config from API and caches', async () => {
      api.commissions.getConfig.mockResolvedValue({ data: { rate: 0.1 }, currency_default: 'XOF' });
      const first = await getCommissionConfig();
      expect(first).toEqual({ data: { rate: 0.1 }, currency_default: 'XOF' });
      const second = await getCommissionConfig();
      expect(second).toEqual(first);
      expect(api.commissions.getConfig).toHaveBeenCalledTimes(1);
    });
    it('wraps response without data as { data: res, currency_default: XOF }', async () => {
      vi.resetModules();
      api.commissions.getConfig.mockResolvedValue({ rate: 0.05 });
      const { getCommissionConfig: getConfigFresh } = await import('./commissions');
      const result = await getConfigFresh();
      expect(result).toEqual({ data: { rate: 0.05 }, currency_default: 'XOF' });
    });
    it('uses XOF when API returns data but currency_default missing (branch 20)', async () => {
      vi.resetModules();
      api.commissions.getConfig.mockResolvedValue({ data: { rate: 0.08 }, currency_default: undefined });
      const { getCommissionConfig: getConfigFresh } = await import('./commissions');
      const result = await getConfigFresh();
      expect(result).toEqual({ data: { rate: 0.08 }, currency_default: 'XOF' });
    });
    it('returns res as-is when API returns falsy (null/undefined)', async () => {
      vi.resetModules();
      api.commissions.getConfig.mockResolvedValue(null);
      const { getCommissionConfig: getConfigFresh } = await import('./commissions');
      const result = await getConfigFresh();
      expect(result).toBeNull();
    });
  });

  describe('getCommissionBreakdown', () => {
    it('calls API and returns result', async () => {
      const breakdown = { platform: 100, seller: 900 };
      api.commissions.calculate.mockResolvedValue(breakdown);
      const result = await getCommissionBreakdown('marketplace', 'sale', 1000);
      expect(api.commissions.calculate).toHaveBeenCalledWith('marketplace', 'sale', 1000, 0);
      expect(result).toEqual(breakdown);
    });
    it('passes deliveryFeeFcfa for food', async () => {
      api.commissions.calculate.mockResolvedValue({});
      await getCommissionBreakdown('food', 'delivery_fee', 500, 200);
      expect(api.commissions.calculate).toHaveBeenCalledWith('food', 'delivery_fee', 500, 200);
    });
    it('returns empty object when API returns falsy', async () => {
      api.commissions.calculate.mockResolvedValue(null);
      const result = await getCommissionBreakdown('video_social', 'tips', 100);
      expect(result).toEqual({});
    });
  });

  describe('formatCommissionRate', () => {
    it('formats decimal rate as percentage', () => {
      expect(formatCommissionRate(0.1)).toBe('10 %');
      expect(formatCommissionRate(0.05)).toBe('5 %');
    });
    it('returns em dash for null/NaN', () => {
      expect(formatCommissionRate(null)).toBe('—');
      expect(formatCommissionRate(undefined)).toBe('—');
      expect(formatCommissionRate(Number.NaN)).toBe('—');
    });
  });

  describe('formatFcfa', () => {
    it('formats number with fr-FR locale', () => {
      expect(formatFcfa(1000)).toMatch(/\d[\s\u202f]?000 FCFA/);
      expect(formatFcfa(500)).toContain('500');
    });
    it('returns "0" for null/NaN', () => {
      expect(formatFcfa(null)).toBe('0');
      expect(formatFcfa(Number.NaN)).toBe('0');
    });
  });
});
