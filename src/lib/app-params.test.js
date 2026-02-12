import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('app-params', () => {
  let origSearch;
  let origReplaceState;

  beforeEach(() => {
    origSearch = window.location.search;
    origReplaceState = window.history.replaceState;
  });
  afterEach(() => {
    window.history.replaceState = origReplaceState;
    window.history.replaceState({}, document.title, window.location.pathname + origSearch + window.location.hash);
  });

  it('exports appParams with expected keys', async () => {
    const { appParams } = await import('./app-params');
    expect(appParams).toBeDefined();
    expect(appParams).toHaveProperty('appId');
    expect(appParams).toHaveProperty('token');
    expect(appParams).toHaveProperty('fromUrl');
  });

  it('removes access_token and token from storage when clear_access_token is true in URL', async () => {
    vi.resetModules();
    localStorage.setItem('access_token', 'old-token');
    localStorage.setItem('token', 'old-token');
    window.history.pushState({}, '', window.location.pathname + '?clear_access_token=true');
    await import('./app-params');
    expect(localStorage.getItem('access_token')).toBeNull();
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('uses stored token when URL has no access_token param', async () => {
    vi.resetModules();
    localStorage.setItem('afriwonder_access_token', 'stored-token-value');
    window.history.pushState({}, '', window.location.pathname);
    const { appParams } = await import('./app-params');
    expect(appParams.token).toBe('stored-token-value');
  });
});
