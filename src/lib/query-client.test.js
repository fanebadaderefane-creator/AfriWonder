import { describe, it, expect } from 'vitest';
import { queryClientInstance, queryPersister } from './query-client';

describe('query-client', () => {
  it('exports a QueryClient instance', () => {
    expect(queryClientInstance).toBeDefined();
    expect(typeof queryClientInstance.getQueryData).toBe('function');
    expect(typeof queryClientInstance.setQueryData).toBe('function');
  });
  it('has defaultOptions with refetchOnWindowFocus false (offline-first) and retry configured', () => {
    const opts = queryClientInstance.getDefaultOptions?.() ?? queryClientInstance.defaultOptions;
    expect(opts?.queries?.refetchOnWindowFocus).toBe(false);
    expect(opts?.queries?.refetchOnReconnect).toBe(false);
    expect(typeof opts?.queries?.retry).toBe('function');
  });
  it('has gcTime 48h for persistence (offline usage)', () => {
    const opts = queryClientInstance.getDefaultOptions?.() ?? queryClientInstance.defaultOptions;
    expect(opts?.queries?.gcTime).toBe(1000 * 60 * 60 * 48);
  });
  it('exports queryPersister with persistClient and restoreClient', () => {
    expect(queryPersister).toBeDefined();
    expect(typeof queryPersister.persistClient).toBe('function');
    expect(typeof queryPersister.restoreClient).toBe('function');
  });
});
