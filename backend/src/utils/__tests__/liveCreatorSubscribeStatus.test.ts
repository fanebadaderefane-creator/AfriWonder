import { describe, expect, it } from '@jest/globals';
import { getCreatorSubscribeStatusPure } from '../liveCreatorSubscribeStatus.js';

describe('getCreatorSubscribeStatusPure', () => {
  it('retourne subscribed false si annulé', () => {
    const out = getCreatorSubscribeStatusPure({
      status: 'cancelled',
      amount_fcfa: 500,
      next_billing_at: new Date(),
    });
    expect(out.subscribed).toBe(false);
  });

  it('retourne subscribed true si status active', () => {
    const next = new Date('2026-07-01');
    const out = getCreatorSubscribeStatusPure({ status: 'active', amount_fcfa: 1000, next_billing_at: next });
    expect(out.subscribed).toBe(true);
    expect(out.amount_fcfa).toBe(1000);
  });
});
