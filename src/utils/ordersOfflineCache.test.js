import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getCachedOrders, setCachedOrders, isOnline } from './ordersOfflineCache';

describe('ordersOfflineCache', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('getCachedOrders', () => {
    it('returns null when no cache', () => {
      expect(getCachedOrders()).toBeNull();
    });
    it('returns null when meta missing', () => {
      localStorage.setItem('afriwonder_orders_cache', JSON.stringify({ orders: [] }));
      expect(getCachedOrders()).toBeNull();
    });
    it('returns null when cache expired', () => {
      const meta = { timestamp: Date.now() - 25 * 60 * 60 * 1000 };
      localStorage.setItem('afriwonder_orders_cache_meta', JSON.stringify(meta));
      localStorage.setItem('afriwonder_orders_cache', JSON.stringify({ orders: [{ id: '1' }] }));
      expect(getCachedOrders()).toBeNull();
    });
    it('returns orders when cache valid', () => {
      const meta = { timestamp: Date.now() };
      localStorage.setItem('afriwonder_orders_cache_meta', JSON.stringify(meta));
      localStorage.setItem('afriwonder_orders_cache', JSON.stringify({ orders: [{ id: '1' }], pagination: {} }));
      const result = getCachedOrders();
      expect(result).toEqual({ orders: [{ id: '1' }], pagination: {}, fromCache: true });
    });
    it('returns null when raw data missing orders', () => {
      const meta = { timestamp: Date.now() };
      localStorage.setItem('afriwonder_orders_cache_meta', JSON.stringify(meta));
      localStorage.setItem('afriwonder_orders_cache', JSON.stringify({}));
      expect(getCachedOrders()).toBeNull();
    });
    it('returns null when cache value is invalid JSON', () => {
      const meta = { timestamp: Date.now() };
      localStorage.setItem('afriwonder_orders_cache_meta', JSON.stringify(meta));
      localStorage.setItem('afriwonder_orders_cache', 'not valid json {');
      expect(getCachedOrders()).toBeNull();
    });
  });

  describe('setCachedOrders', () => {
    it('does nothing when window.localStorage is missing', () => {
      const orig = window.localStorage;
      Object.defineProperty(window, 'localStorage', { value: undefined, configurable: true });
      expect(() => setCachedOrders({ orders: [{ id: '1' }], pagination: {} })).not.toThrow();
      expect(window.localStorage).toBeUndefined();
      Object.defineProperty(window, 'localStorage', { value: orig, configurable: true });
    });
    it('stores orders and meta', () => {
      setCachedOrders({ orders: [{ id: '1' }], pagination: { page: 1 } });
      const meta = JSON.parse(localStorage.getItem('afriwonder_orders_cache_meta'));
      expect(meta.timestamp).toBeDefined();
      const data = JSON.parse(localStorage.getItem('afriwonder_orders_cache'));
      expect(data.orders).toEqual([{ id: '1' }]);
      expect(data.pagination).toEqual({ page: 1 });
    });
    it('does nothing when result has no orders', () => {
      setCachedOrders({});
      setCachedOrders({ pagination: {} });
      expect(localStorage.getItem('afriwonder_orders_cache')).toBeNull();
    });
    it('limits to 50 orders', () => {
      const orders = Array.from({ length: 60 }, (_, i) => ({ id: String(i) }));
      setCachedOrders({ orders, pagination: {} });
      const data = JSON.parse(localStorage.getItem('afriwonder_orders_cache'));
      expect(data.orders.length).toBe(50);
    });
    it('ignores when localStorage.setItem throws', () => {
      const orig = localStorage.setItem;
      localStorage.setItem = () => { throw new Error('QuotaExceeded'); };
      expect(() => setCachedOrders({ orders: [{ id: '1' }], pagination: {} })).not.toThrow();
      localStorage.setItem = orig;
    });
    it('ignores when second setItem throws (after first succeeds)', () => {
      let setItemCalls = 0;
      const orig = localStorage.setItem;
      localStorage.setItem = (...args) => {
        setItemCalls++;
        if (setItemCalls === 2) throw new Error('QuotaExceeded');
        orig.apply(localStorage, args);
      };
      expect(() => setCachedOrders({ orders: [{ id: '1' }], pagination: {} })).not.toThrow();
      localStorage.setItem = orig;
    });
    it('ignores when first setItem throws (catch block)', () => {
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
        throw new Error('QuotaExceeded');
      });
      setCachedOrders({ orders: [{ id: '1' }], pagination: {} });
      expect(setItemSpy).toHaveBeenCalledTimes(1);
      expect(getCachedOrders()).toBeNull();
      setItemSpy.mockRestore();
    });
  });

  describe('isOnline', () => {
    it('returns navigator.onLine value', () => {
      expect(typeof isOnline()).toBe('boolean');
      expect(isOnline()).toBe(navigator.onLine);
    });
  });
});
