import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useToast, toast, reducer } from './use-toast';

describe('useToast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('useToast returns toasts and toast function', () => {
    const { result } = renderHook(() => useToast());
    expect(result.current).toHaveProperty('toasts');
    expect(result.current).toHaveProperty('toast');
    expect(result.current).toHaveProperty('dismiss');
    expect(Array.isArray(result.current.toasts)).toBe(true);
    expect(typeof result.current.toast).toBe('function');
    expect(typeof result.current.dismiss).toBe('function');
  });

  it('toast() adds a toast and returns id, dismiss, update', () => {
    const ret = toast({ title: 'Test' });
    expect(ret).toHaveProperty('id');
    expect(ret).toHaveProperty('dismiss');
    expect(ret).toHaveProperty('update');
    expect(typeof ret.dismiss).toBe('function');
    expect(typeof ret.update).toBe('function');
  });

  it('dismiss removes toast', () => {
    const { result } = renderHook(() => useToast());
    const ret = toast({ title: 'To dismiss' });
    act(() => {
      result.current.dismiss(ret.id);
    });
    expect(result.current.toasts.find((t) => t.id === ret.id)?.open).toBe(false);
  });

  it('reducer ADD_TOAST adds toast and limits to 20', () => {
    const state = { toasts: [] };
    const newState = reducer(state, {
      type: 'ADD_TOAST',
      toast: { id: '1', title: 'A', open: true },
    });
    expect(newState.toasts).toHaveLength(1);
    expect(newState.toasts[0].title).toBe('A');
  });

  it('reducer UPDATE_TOAST updates existing toast', () => {
    const state = { toasts: [{ id: '1', title: 'A' }] };
    const newState = reducer(state, {
      type: 'UPDATE_TOAST',
      toast: { id: '1', title: 'B' },
    });
    expect(newState.toasts[0].title).toBe('B');
  });

  it('reducer REMOVE_TOAST filters toast', () => {
    const state = { toasts: [{ id: '1' }, { id: '2' }] };
    const newState = reducer(state, { type: 'REMOVE_TOAST', toastId: '1' });
    expect(newState.toasts).toHaveLength(1);
    expect(newState.toasts[0].id).toBe('2');
  });

  it('reducer REMOVE_TOAST with undefined clears all', () => {
    const state = { toasts: [{ id: '1' }] };
    const newState = reducer(state, { type: 'REMOVE_TOAST', toastId: undefined });
    expect(newState.toasts).toHaveLength(0);
  });

  it('reducer DISMISS_TOAST sets open false for toast', () => {
    const state = { toasts: [{ id: '1', open: true }, { id: '2', open: true }] };
    const newState = reducer(state, { type: 'DISMISS_TOAST', toastId: '1' });
    expect(newState.toasts.find((t) => t.id === '1').open).toBe(false);
    expect(newState.toasts.find((t) => t.id === '2').open).toBe(true);
  });

  it('toast then useToast sees the new toast', () => {
    const { result } = renderHook(() => useToast());
    act(() => {
      result.current.toast({ title: 'Hello' });
    });
    expect(result.current.toasts.some((t) => t.title === 'Hello')).toBe(true);
  });
});
