import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useIsMobile } from './use-mobile';

describe('useIsMobile', () => {
  let matchMediaMock;
  let listeners = [];

  beforeEach(() => {
    listeners = [];
    matchMediaMock = vi.fn((query) => ({
      matches: false,
      media: query,
      addEventListener: (ev, fn) => { listeners.push({ ev, fn }); },
      removeEventListener: vi.fn(),
    }));
    window.matchMedia = matchMediaMock;
    Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns boolean', () => {
    const { result } = renderHook(() => useIsMobile());
    expect(typeof result.current).toBe('boolean');
  });

  it('uses window.innerWidth for initial value', () => {
    Object.defineProperty(window, 'innerWidth', { value: 400, configurable: true });
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it('returns false when innerWidth >= 768', () => {
    Object.defineProperty(window, 'innerWidth', { value: 768, configurable: true });
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it('updates when matchMedia change event fires', () => {
    Object.defineProperty(window, 'innerWidth', { value: 400, configurable: true });
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
    const changeListener = listeners.find((l) => l.ev === 'change')?.fn;
    expect(changeListener).toBeDefined();
    Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true });
    act(() => {
      changeListener?.();
    });
    expect(result.current).toBe(false);
  });
});
