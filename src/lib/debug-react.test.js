import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('debug-react', () => {
  let logSpy;
  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });
  afterEach(() => {
    logSpy.mockRestore();
    vi.resetModules();
  });

  it('runs without throwing when window exists', async () => {
    await expect(import('./debug-react.js')).resolves.toBeDefined();
  });

  it('logs warning when React is not on window', async () => {
    vi.resetModules();
    const origReact = window.React;
    delete window.React;
    await import('./debug-react.js');
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('n\'est pas disponible'));
    window.React = origReact;
  });
});
