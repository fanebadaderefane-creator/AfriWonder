/** Calculs financiers commandes repas — sans Prisma (tests unitaires isolés). */

export function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

export function computeFoodOrderSplit(input: {
  subtotal: number;
  deliveryFee: number;
  platformCommissionPct: number;
  fulfillmentType: 'delivery' | 'pickup';
}): {
  platform_fee_amount: number;
  restaurant_payout_amount: number;
  courier_payout_amount: number;
  customer_total: number;
} {
  const subtotal = Math.max(0, input.subtotal);
  const deliveryFee = input.fulfillmentType === 'delivery' ? Math.max(0, input.deliveryFee) : 0;
  const pct = Math.max(0, Math.min(100, input.platformCommissionPct));
  const platform_fee_amount = roundMoney(subtotal * (pct / 100));
  const restaurant_payout_amount = roundMoney(subtotal - platform_fee_amount);
  const courier_payout_amount = input.fulfillmentType === 'delivery' ? roundMoney(deliveryFee) : 0;
  const customer_total = roundMoney(subtotal + deliveryFee);
  return {
    platform_fee_amount,
    restaurant_payout_amount,
    courier_payout_amount,
    customer_total,
  };
}
