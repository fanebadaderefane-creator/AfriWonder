import { describe, expect, it } from 'vitest';
import {
  isCacheableThreadMessage,
  mergeThreadWithLocalOutbound,
} from './dmThreadMessageCache';

describe('dmThreadMessageCache', () => {
  it('isCacheableThreadMessage rejects in-flight and local URIs', () => {
    expect(isCacheableThreadMessage({ id: '1', status: 'delivered', imageUri: 'https://cdn/x.jpg' })).toBe(true);
    expect(isCacheableThreadMessage({ id: '2', status: 'sending' })).toBe(false);
    expect(isCacheableThreadMessage({ id: '3', status: 'failed' })).toBe(false);
    expect(isCacheableThreadMessage({ id: '4', status: 'delivered', imageUri: 'file:///tmp/x.jpg' })).toBe(false);
    expect(isCacheableThreadMessage({ id: '5', status: 'delivered', retryMeta: { localUri: 'x' } })).toBe(false);
  });

  it('mergeThreadWithLocalOutbound appends pending and failed without duplicates', () => {
    type Row = { id: string; status?: string };
    const base: Row[] = [{ id: 'srv-1', status: 'delivered' }];
    const pending: Row[] = [{ id: 'tmp-1', status: 'pending' }];
    const failed: Row[] = [{ id: 'tmp-2', status: 'failed' }];
    const merged = mergeThreadWithLocalOutbound(base, pending, failed);
    expect(merged).toHaveLength(3);
    expect(merged.find((m) => m.id === 'tmp-1')?.status).toBe('sending');
    expect(merged.find((m) => m.id === 'tmp-2')?.status).toBe('failed');
  });
});
