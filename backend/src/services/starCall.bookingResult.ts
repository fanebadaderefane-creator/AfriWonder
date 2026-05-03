/**
 * Résultat typé de `StarCallService.createBooking` (wallet vs Orange Money).
 * Module léger : pas d’import Prisma client, uniquement le modèle — pour tests Jest et garde-fou tsc.
 */
import type { StarBooking } from '@prisma/client';

export type CreateStarBookingPaymentPayload = {
  paymentUrl: string;
  orderId: string;
  reference: string;
  provider: string;
};

export type CreateStarBookingResult =
  | { booking: StarBooking; payment: CreateStarBookingPaymentPayload }
  | { booking: StarBooking };

/** `if ('payment' in r)` ne rétrécit pas toujours l’union (CI / versions strictes). */
export function isCreateStarBookingWithOrangePayment(
  r: CreateStarBookingResult,
): r is { booking: StarBooking; payment: CreateStarBookingPaymentPayload } {
  return 'payment' in r;
}
