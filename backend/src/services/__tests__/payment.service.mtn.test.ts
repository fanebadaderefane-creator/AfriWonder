/**
 * Régression : pas de stub MTN silencieux en production (RTP requis, pas sandbox).
 */
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import axios from 'axios';
import paymentService from '../payment.service.js';

describe('PaymentService — MTN MoMo', () => {
  const prev = { ...process.env };
  let postSpy: jest.SpiedFunction<typeof axios.post>;

  beforeEach(() => {
    process.env = { ...prev };
    postSpy = jest.spyOn(axios, 'post');
  });

  afterEach(() => {
    process.env = { ...prev };
    postSpy.mockRestore();
  });

  it('production : refuse sans RTP ni token', async () => {
    process.env.NODE_ENV = 'production';
    process.env.MTN_MOBILE_MONEY_SUBSCRIPTION_KEY = 'sub-test';
    delete process.env.MTN_MOMO_RTP_URL;
    delete process.env.MTN_MOMO_ACCESS_TOKEN;

    await expect(
      paymentService.initiateMtnMoneyPayment('u1', 'o1', {
        amount: 500,
        phone: '+22370123456',
        returnUrl: 'https://app.example/return',
      }),
    ).rejects.toThrow(/MTN_MOMO_RTP_URL/);
    expect(postSpy).not.toHaveBeenCalled();
  });

  it('production : refuse MTN_MOMO_TARGET_ENVIRONMENT=sandbox', async () => {
    process.env.NODE_ENV = 'production';
    process.env.MTN_MOBILE_MONEY_SUBSCRIPTION_KEY = 'sub-test';
    process.env.MTN_MOMO_RTP_URL = 'https://momodeveloper.mtn.com/collection/v1_0/requesttopay';
    process.env.MTN_MOMO_ACCESS_TOKEN = 'bearer-test';
    process.env.MTN_MOMO_TARGET_ENVIRONMENT = 'sandbox';

    await expect(
      paymentService.initiateMtnMoneyPayment('u1', 'o1', {
        amount: 500,
        phone: '+22370123456',
        returnUrl: 'https://app.example/return',
      }),
    ).rejects.toThrow(/sandbox interdit/);
    expect(postSpy).not.toHaveBeenCalled();
  });

  it('production : RTP réponse non 2xx → erreur (pas de stub)', async () => {
    process.env.NODE_ENV = 'production';
    process.env.MTN_MOBILE_MONEY_SUBSCRIPTION_KEY = 'sub-test';
    process.env.MTN_MOMO_RTP_URL = 'https://example.invalid/mtn/rtp';
    process.env.MTN_MOMO_ACCESS_TOKEN = 'bearer-test';
    process.env.MTN_MOMO_TARGET_ENVIRONMENT = 'mtnml';

    postSpy.mockResolvedValue({ status: 409, data: { message: 'conflict' } } as any);

    await expect(
      paymentService.initiateMtnMoneyPayment('u1', 'o1', {
        amount: 500,
        phone: '+22370123456',
        returnUrl: 'https://app.example/return',
      }),
    ).rejects.toThrow(/RTP requis en production/);
    expect(postSpy).toHaveBeenCalled();
  });

  it('test : sans RTP, retour stub local (hors production)', async () => {
    process.env.NODE_ENV = 'test';
    process.env.MTN_MOBILE_MONEY_SUBSCRIPTION_KEY = 'sub-test';
    delete process.env.MTN_MOMO_RTP_URL;
    delete process.env.MTN_MOMO_ACCESS_TOKEN;

    const r = await paymentService.initiateMtnMoneyPayment('u1', 'o1', {
      amount: 500,
      phone: '+22370123456',
      returnUrl: 'https://app.example/return',
    });

    expect(r.provider).toBe('mtn_money');
    expect(r.reference).toBe('o1');
    expect(postSpy).not.toHaveBeenCalled();
  });
});
