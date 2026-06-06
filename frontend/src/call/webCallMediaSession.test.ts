import { describe, expect, it, vi } from 'vitest';

vi.mock('./callNativeMedia', () => ({
  beginWebCallMediaCapture: vi.fn(),
}));

import {
  clearWebCallMediaCapture,
  consumeWebCallMediaCapture,
  stashWebCallMediaCapture,
} from './webCallMediaSession';

describe('webCallMediaSession', () => {
  it('consume returns null when empty', () => {
    clearWebCallMediaCapture();
    expect(consumeWebCallMediaCapture()).toBeNull();
  });

  it('stash then consume returns the same promise once', async () => {
    clearWebCallMediaCapture();
    const stream = { getTracks: () => [] } as unknown as MediaStream;
    const promise = Promise.resolve(stream);
    stashWebCallMediaCapture(promise);
    expect(consumeWebCallMediaCapture()).toBe(promise);
    expect(consumeWebCallMediaCapture()).toBeNull();
    await expect(promise).resolves.toBe(stream);
  });

  it('stash swallows rejected prefetch without unhandled rejection', async () => {
    clearWebCallMediaCapture();
    const err = new DOMException('The object can not be found here.', 'NotFoundError');
    stashWebCallMediaCapture(Promise.reject(err));
    await new Promise((r) => setTimeout(r, 0));
    const pending = consumeWebCallMediaCapture();
    expect(pending).not.toBeNull();
    await expect(pending).rejects.toBe(err);
    expect(consumeWebCallMediaCapture()).toBeNull();
  });
});
