import { describe, expect, it } from 'vitest';
import { getCallKeep } from './callKeepIos';

describe('callKeepIos (stub Android/web)', () => {
  it('ne charge pas CallKeep hors iOS (Vitest = stub callKeepIos.ts)', () => {
    expect(getCallKeep()).toBeNull();
  });
});
