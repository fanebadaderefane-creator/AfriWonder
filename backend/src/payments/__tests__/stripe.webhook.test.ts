import request from 'supertest';
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import app from '../../app.js';
import paymentService from '../../services/payment.service.js';

describe('Stripe webhook', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns 400 when stripe-signature or raw body is missing', async () => {
    const resNoSig = await request(app)
      .post('/api/payments/stripe/webhook')
      .set('Content-Type', 'application/json')
      .send(Buffer.from('{}'));
    expect(resNoSig.status).toBe(400);
    expect(resNoSig.body.success).toBe(false);
  });

  it('returns 400 when signature verification fails', async () => {
    jest.spyOn(paymentService, 'verifyStripeWebhook').mockImplementation(() => {
      throw new Error('Invalid signature');
    });
    const raw = Buffer.from(JSON.stringify({ id: 'evt_test_webhook' }));
    const res = await request(app)
      .post('/api/payments/stripe/webhook')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', 'v1,deadbeef')
      .send(raw);
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 200 and forwards to handler when verification succeeds', async () => {
    const mockEvent = {
      type: 'checkout.session.completed',
      data: { object: { metadata: { order_id: 'order_ci' }, payment_status: 'paid' } },
    };
    jest.spyOn(paymentService, 'verifyStripeWebhook').mockReturnValue(mockEvent as any);
    const handleSpy = jest
      .spyOn(paymentService, 'handleStripeWebhookEvent')
      .mockResolvedValue({ processed: true });

    const raw = Buffer.from(JSON.stringify({ id: 'evt_ci' }));
    const res = await request(app)
      .post('/api/payments/stripe/webhook')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', 'v1,mock')
      .send(raw);

    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);
    expect(res.body.processed).toBe(true);
    expect(handleSpy).toHaveBeenCalledTimes(1);
  });
});
