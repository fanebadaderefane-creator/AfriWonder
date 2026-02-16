import { describe, it, expect } from 'vitest';
import { queryClientInstance } from './query-client';

describe('query-client', () => {
  it('exports a QueryClient instance', () => {
    expect(queryClientInstance).toBeDefined();
    expect(typeof queryClientInstance.getQueryData).toBe('function');
    expect(typeof queryClientInstance.setQueryData).toBe('function');
  });
  it('has defaultOptions with refetchOnWindowFocus false and retry configured', () => {
    const opts = queryClientInstance.getDefaultOptions?.() ?? queryClientInstance.defaultOptions;
    expect(opts?.queries?.refetchOnWindowFocus).toBe(false);
    expect(typeof opts?.queries?.retry).toBe('function');
  });
});
