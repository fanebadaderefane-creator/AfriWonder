import { describe, expect, it } from '@jest/globals';
import { IDEMPOTENCY_PROCESSING_BODY } from '../idempotency.js';

describe('idempotency middleware markers', () => {
  it('processing body is not valid JSON payload', () => {
    expect(() => JSON.parse(IDEMPOTENCY_PROCESSING_BODY)).toThrow();
  });
});
