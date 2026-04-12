import { describe, it, expect } from 'vitest';
import { stripTrailingSlash, stripApiSuffix } from './urlNormalize';

describe('urlNormalize', () => {
  it('stripTrailingSlash removes trailing slashes', () => {
    expect(stripTrailingSlash('https://api.example.com/')).toBe('https://api.example.com');
    expect(stripTrailingSlash('  http://localhost:3000///  ')).toBe('http://localhost:3000');
  });

  it('stripApiSuffix removes /api', () => {
    expect(stripApiSuffix('https://x.com/api')).toBe('https://x.com');
    expect(stripApiSuffix('https://x.com/api/')).toBe('https://x.com');
  });
});
