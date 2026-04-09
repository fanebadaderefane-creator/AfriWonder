import crypto from 'node:crypto';
import request from 'supertest';
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import app from '../../app.js';
import paymentService from '../../services/payment.service.js';

describe('Orange Money webhook', () => {
  const prev = {
    NODE_ENV: process.env.NODE_ENV,
    ORANGE_MONEY_ENV: process.env.ORANGE_MONEY_ENV,
    ORANGE_MONEY_WEBHOOK_SECRET: process.env.ORANGE_MONEY_WEBHOOK_SECRET,
    ORANGE_MONEY_TRUST_WEBHOOK: process.env.ORANGE_MONEY_TRUST_WEBHOOK,
  };

  afterEach(() => {
    process.env.NODE_ENV = prev.NODE_ENV;
    process.env.ORANGE_MONEY_ENV = prev.ORANGE_MONEY_ENV;
    process.env.ORANGE_MONEY_WEBHOOK_SECRET = prev.ORANGE_MONEY_WEBHOOK_SECRET;
    process.env.ORANGE_MONEY_TRUST_WEBHOOK = prev.ORANGE_MONEY_TRUST_WEBHOOK;
    jest.restoreAllMocks();
  });

  it('rejects invalid signature in production mode', async () => {
    process.env.NODE_ENV = 'production';
    process.env.ORANGE_MONEY_ENV = 'production';
    process.env.ORANGE_MONEY_WEBHOOK_SECRET = 'secret-test';

    const raw = JSON.stringify({ orderId: 'ord_bad_sig', status: 'SUCCESS', pay_token: 'tok_x' });
    const res = await request(app)
      .post('/api/payments/orange-money/webhook')
      .set('Content-Type', 'application/json')
      .set('x-orange-signature', 'deadbeef')
      .send(raw);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('accepts valid signature and processes payment', async () => {
    process.env.NODE_ENV = 'production';
    process.env.ORANGE_MONEY_ENV = 'production';
    process.env.ORANGE_MONEY_WEBHOOK_SECRET = 'secret-test';

    const verifySpy = jest
      .spyOn(paymentService, 'verifyOrangeMoneyPayment')
      .mockResolvedValue({ success: true } as any);

    const raw = JSON.stringify({ orderId: 'ord_ok_sig', status: 'SUCCESS', pay_token: 'tok_ok' });
    const sig = crypto.createHmac('sha256', 'secret-test').update(raw).digest('hex');

    const res = await request(app)
      .post('/api/payments/orange-money/webhook')
      .set('Content-Type', 'application/json')
      .set('x-orange-signature', sig)
      .send(raw);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.processed).toBe(true);
    expect(verifySpy).toHaveBeenCalledWith('ord_ok_sig', expect.objectContaining({ status: 'SUCCESS' }));
  });
});

