import { describe, expect, it, vi } from 'vitest';
import { removeNativeSubscription } from './callNativeSubscription';

describe('removeNativeSubscription', () => {
  it('appelle une fonction de désabonnement', () => {
    const off = vi.fn();
    removeNativeSubscription(off);
    expect(off).toHaveBeenCalledOnce();
  });

  it('appelle .remove() sur un objet subscription', () => {
    const remove = vi.fn();
    removeNativeSubscription({ remove });
    expect(remove).toHaveBeenCalledOnce();
  });

  it('ignore undefined sans throw', () => {
    expect(() => removeNativeSubscription(undefined)).not.toThrow();
  });
});
