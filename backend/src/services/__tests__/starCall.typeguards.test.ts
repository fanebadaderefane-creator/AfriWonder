import { describe, it, expect } from '@jest/globals';
import {
  isCreateStarBookingWithOrangePayment,
  type CreateStarBookingPaymentPayload,
  type CreateStarBookingResult,
} from '../starCall.bookingResult.js';

describe('starCall type guards', () => {
  const bookingStub = { id: 'booking-1' } as CreateStarBookingResult['booking'];

  it('isCreateStarBookingWithOrangePayment est vrai si payment est présent', () => {
    const payment: CreateStarBookingPaymentPayload = {
      paymentUrl: 'https://pay.example/o',
      orderId: 'ord-1',
      reference: 'ref-1',
      provider: 'orange_money',
    };
    const r: CreateStarBookingResult = { booking: bookingStub, payment };
    expect(isCreateStarBookingWithOrangePayment(r)).toBe(true);
  });

  it('isCreateStarBookingWithOrangePayment est faux pour le flux wallet seul', () => {
    const r: CreateStarBookingResult = { booking: bookingStub };
    expect(isCreateStarBookingWithOrangePayment(r)).toBe(false);
  });
});
