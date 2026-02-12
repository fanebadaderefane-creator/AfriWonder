import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSwipeGesture } from './useSwipeGesture';

describe('useSwipeGesture', () => {
  it('returns onTouchStart, onTouchMove, onTouchEnd', () => {
    const { result } = renderHook(() => useSwipeGesture(vi.fn(), vi.fn()));
    expect(typeof result.current.onTouchStart).toBe('function');
    expect(typeof result.current.onTouchMove).toBe('function');
    expect(typeof result.current.onTouchEnd).toBe('function');
  });

  it('calls onSwipeLeft when swipe left > 50px', () => {
    const onSwipeLeft = vi.fn();
    const onSwipeRight = vi.fn();
    const { result } = renderHook(() => useSwipeGesture(onSwipeLeft, onSwipeRight));

    act(() => {
      result.current.onTouchStart({ targetTouches: [{ clientX: 200 }] });
    });
    act(() => {
      result.current.onTouchMove({ targetTouches: [{ clientX: 100 }] });
    });
    act(() => {
      result.current.onTouchEnd();
    });

    expect(onSwipeLeft).toHaveBeenCalledTimes(1);
    expect(onSwipeRight).not.toHaveBeenCalled();
  });

  it('calls onSwipeRight when swipe right > 50px', () => {
    const onSwipeLeft = vi.fn();
    const onSwipeRight = vi.fn();
    const { result } = renderHook(() => useSwipeGesture(onSwipeLeft, onSwipeRight));

    act(() => {
      result.current.onTouchStart({ targetTouches: [{ clientX: 100 }] });
    });
    act(() => {
      result.current.onTouchMove({ targetTouches: [{ clientX: 200 }] });
    });
    act(() => {
      result.current.onTouchEnd();
    });

    expect(onSwipeRight).toHaveBeenCalledTimes(1);
    expect(onSwipeLeft).not.toHaveBeenCalled();
  });

  it('does not call callbacks when swipe distance < 50', () => {
    const onSwipeLeft = vi.fn();
    const onSwipeRight = vi.fn();
    const { result } = renderHook(() => useSwipeGesture(onSwipeLeft, onSwipeRight));

    act(() => {
      result.current.onTouchStart({ targetTouches: [{ clientX: 100 }] });
    });
    act(() => {
      result.current.onTouchMove({ targetTouches: [{ clientX: 80 }] });
    });
    act(() => {
      result.current.onTouchEnd();
    });

    expect(onSwipeLeft).not.toHaveBeenCalled();
    expect(onSwipeRight).not.toHaveBeenCalled();
  });
});
