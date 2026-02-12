import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useWebSocket } from './useWebSocket';

describe('useWebSocket', () => {
  let MockWs;
  let wsInstance;

  beforeEach(() => {
    wsInstance = {
      close: vi.fn(),
      send: vi.fn(),
      readyState: 1,
      onopen: null,
      onmessage: null,
      onerror: null,
      onclose: null,
    };
    MockWs = vi.fn(() => wsInstance);
    MockWs.OPEN = 1;
    global.WebSocket = MockWs;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not connect when userId is null', () => {
    const { result } = renderHook(() => useWebSocket(null));
    expect(MockWs).not.toHaveBeenCalled();
    expect(result.current.isConnected).toBe(false);
    expect(result.current.messages).toEqual([]);
  });

  it('connects when userId is provided', () => {
    renderHook(() => useWebSocket('user123'));
    expect(MockWs).toHaveBeenCalledWith(expect.stringContaining('user123'));
  });

  it('returns send function', () => {
    const { result } = renderHook(() => useWebSocket('user1'));
    expect(typeof result.current.send).toBe('function');
    expect(() => result.current.send('test', { data: 1 })).not.toThrow();
  });

  it('sets isConnected true on open', async () => {
    const { result } = renderHook(() => useWebSocket('user1'));
    expect(wsInstance.onopen).toBeDefined();
    wsInstance.onopen();
    await vi.waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });
  });
});
