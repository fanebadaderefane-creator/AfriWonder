import { expect, afterEach, beforeAll } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

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
});

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Cleanup after each test
afterEach(() => {
  cleanup();
});

