import { computeFoodOrderSplit, roundMoney } from '../../src/services/foodOrderVertical.compute.js';

describe('foodOrderVertical.compute', () => {
  it('computeFoodOrderSplit ventile commission et livreur', () => {
    const s = computeFoodOrderSplit({
      subtotal: 10_000,
      deliveryFee: 1_500,
      platformCommissionPct: 10,
      fulfillmentType: 'delivery',
    });
    expect(s.platform_fee_amount).toBe(1000);
    expect(s.restaurant_payout_amount).toBe(9000);
    expect(s.courier_payout_amount).toBe(1500);
    expect(s.customer_total).toBe(11_500);
  });

  it('computeFoodOrderSplit sans livraison si retrait', () => {
    const s = computeFoodOrderSplit({
      subtotal: 5000,
      deliveryFee: 1000,
      platformCommissionPct: 12,
      fulfillmentType: 'pickup',
    });
    expect(s.courier_payout_amount).toBe(0);
    expect(s.customer_total).toBe(5000);
  });

  it('roundMoney', () => {
    expect(roundMoney(10.126)).toBe(10.13);
  });
});
