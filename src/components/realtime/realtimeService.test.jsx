import { describe, it, expect, vi } from 'vitest';
import {
  subscribeLiveChat,
  subscribeLiveViewers,
  subscribeNotifications,
  subscribeDirectMessages,
  subscribeLiveGifts,
  getRealtimeLiveStream,
} from './realtimeService';

describe('realtimeService', () => {
  it('subscribeLiveChat returns unsubscribe function', () => {
    const unsub = subscribeLiveChat('stream1', vi.fn());
    expect(typeof unsub).toBe('function');
    expect(() => unsub()).not.toThrow();
  });

  it('subscribeLiveViewers returns unsubscribe function', () => {
    const unsub = subscribeLiveViewers('stream1', vi.fn());
    expect(typeof unsub).toBe('function');
  });

  it('subscribeNotifications returns unsubscribe function', () => {
    const unsub = subscribeNotifications('user1', vi.fn());
    expect(typeof unsub).toBe('function');
  });

  it('subscribeDirectMessages returns unsubscribe function', () => {
    const unsub = subscribeDirectMessages('user1', vi.fn());
    expect(typeof unsub).toBe('function');
  });

  it('subscribeLiveGifts returns unsubscribe function', () => {
    const unsub = subscribeLiveGifts('stream1', vi.fn());
    expect(typeof unsub).toBe('function');
  });

  it('getRealtimeLiveStream returns a promise resolving to array', async () => {
    const result = await getRealtimeLiveStream('stream1');
    expect(Array.isArray(result)).toBe(true);
  });
});
