import { describe, expect, it, vi, beforeEach } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  isCacheableThreadMessage,
  mergeThreadWithLocalOutbound,
  saveThreadMessageCache,
  loadThreadMessageCache,
} from './dmThreadMessageCache';

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
}));

describe('dmThreadMessageCache', () => {
  beforeEach(() => {
    vi.mocked(AsyncStorage.getItem).mockReset();
    vi.mocked(AsyncStorage.setItem).mockReset();
    vi.mocked(AsyncStorage.removeItem).mockReset();
  });

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

  it('saveThreadMessageCache fusionne avec l’existant au lieu d’écraser', async () => {
    vi.mocked(AsyncStorage.getItem).mockResolvedValue(
      JSON.stringify([
        {
          id: 'old-1',
          text: 'ancien',
          isMine: false,
          time: '09:00',
          status: 'read',
          type: 'text',
          createdAt: '2026-06-01T09:00:00.000Z',
        },
      ]),
    );
    await saveThreadMessageCache('conv-1', [
      {
        id: 'new-1',
        text: 'récent',
        isMine: true,
        time: '10:00',
        status: 'delivered',
        type: 'text',
        createdAt: '2026-06-09T10:00:00.000Z',
      },
    ]);
    const payload = vi.mocked(AsyncStorage.setItem).mock.calls[0]?.[1];
    const saved = JSON.parse(String(payload)) as { id: string }[];
    expect(saved.map((m) => m.id)).toEqual(['old-1', 'new-1']);
  });

  it('loadThreadMessageCache retourne [] si absent', async () => {
    vi.mocked(AsyncStorage.getItem).mockResolvedValue(null);
    await expect(loadThreadMessageCache('conv-x')).resolves.toEqual([]);
  });
});
