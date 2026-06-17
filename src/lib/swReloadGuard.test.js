import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { shouldDeferServiceWorkerReload } from './swReloadGuard.js';

describe('swReloadGuard', () => {
  beforeEach(() => {
    delete window.__AFW_WEBRTC_ACTIVE__;
  });

  afterEach(() => {
    delete window.__AFW_WEBRTC_ACTIVE__;
  });

  it('shouldDeferServiceWorkerReload — false par défaut', () => {
    expect(shouldDeferServiceWorkerReload()).toBe(false);
  });

  it('shouldDeferServiceWorkerReload — true si WebRTC actif', () => {
    window.__AFW_WEBRTC_ACTIVE__ = true;
    expect(shouldDeferServiceWorkerReload()).toBe(true);
  });
});
