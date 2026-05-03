import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { devLog } from './devLog';

describe('devLog', () => {
  const g = globalThis as { __DEV__?: boolean };

  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete g.__DEV__;
  });

  it('ne journalise pas hors __DEV__', () => {
    g.__DEV__ = false;
    devLog('x');
    expect(console.log).not.toHaveBeenCalled();
  });

  it('journalise en __DEV__', () => {
    g.__DEV__ = true;
    devLog('hello', 1);
    expect(console.log).toHaveBeenCalledWith('hello', 1);
  });
});
