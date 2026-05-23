import { expect, afterEach, beforeAll } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Suppress known React act() and Radix/React Router warnings in tests (third-party async updates)
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    const msg = args.map((a) => (typeof a === 'string' ? a : '')).join(' ');
    if (
      (msg.includes('An update to ') && msg.includes('was not wrapped in act')) ||
      msg.includes('React Router Future Flag') ||
      msg.includes('v7_startTransition') ||
      msg.includes('v7_relativeSplatPath')
    ) {
      return;
    }
    originalError.apply(console, args);
  };
});

// jsdom does not provide IntersectionObserver (required by framer-motion and other libs)
beforeAll(() => {
  class MockIntersectionObserver {
    observe = () => null;
    disconnect = () => null;
    unobserve = () => null;
    root = null;
    rootMargin = '';
    thresholds = [];
  }
  globalThis.IntersectionObserver = MockIntersectionObserver;
  globalThis.ResizeObserver = class ResizeObserver {
    observe = () => null;
    disconnect = () => null;
    unobserve = () => null;
  };
  if (typeof window !== 'undefined') {
    window.scrollTo = () => {};
    Element.prototype.scrollIntoView = () => {};
    // jsdom n'a pas matchMedia (thème / PWAInstallBanner)
    window.matchMedia = (query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => true,
    });
  }
  if (typeof globalThis.indexedDB === 'undefined') {
    globalThis.indexedDB = { open: () => ({ result: {}, transaction: () => {} }), deleteDatabase: () => {} };
  }
  // jsdom : pas de MediaStream (pages type DirectCall / WebRTC)
  if (typeof globalThis.MediaStream === 'undefined') {
    const MS = class MediaStream {
      constructor() {
        this._tracks = [];
      }
      getTracks() {
        return this._tracks;
      }
      addTrack() {}
    };
    globalThis.MediaStream = MS;
    if (typeof window !== 'undefined') {
      window.MediaStream = MS;
    }
  }
});

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Cleanup after each test
afterEach(() => {
  cleanup();
});

