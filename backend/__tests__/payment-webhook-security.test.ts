/**
 * Tests sécurité webhooks paiement - validation signature en production
 */
import crypto from 'crypto';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import paymentService from '../src/services/payment.service.js';

describe('Payment webhook signature validation', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    Object.keys(process.env).forEach((k) => delete process.env[k]);
    Object.assign(process.env, originalEnv);
  });

  afterEach(() => {
    Object.keys(process.env).forEach((k) => delete process.env[k]);
    Object.assign(process.env, originalEnv);
  });

  describe('Orange Money', () => {
    it('rejette en production si ORANGE_MONEY_WEBHOOK_SECRET manquant', () => {
      process.env.NODE_ENV = 'production';
      process.env.ORANGE_MONEY_ENV = 'production';
      delete process.env.ORANGE_MONEY_WEBHOOK_SECRET;

      const result = paymentService.verifyOrangeMoneyWebhookSignature('{"orderId":"x","status":"SUCCESS"}', 'abc');
      expect(result).toBe(false);
    });

    it('accepte en test sans secret', () => {
      process.env.NODE_ENV = 'test';
      delete process.env.ORANGE_MONEY_WEBHOOK_SECRET;

      const result = paymentService.verifyOrangeMoneyWebhookSignature('{"orderId":"x"}', undefined);
      expect(result).toBe(true);
    });

    it('accepte en production avec signature valide', () => {
      process.env.NODE_ENV = 'production';
      process.env.ORANGE_MONEY_WEBHOOK_SECRET = 'test-secret';
      const body = '{"orderId":"x","status":"SUCCESS"}';
      const sig = crypto.createHmac('sha256', 'test-secret').update(body).digest('hex');

      const result = paymentService.verifyOrangeMoneyWebhookSignature(body, sig);
      expect(result).toBe(true);
    });
  });

  describe('Moov Money', () => {
    it('rejette en production si MOOV_MONEY_WEBHOOK_SECRET manquant', () => {
      process.env.NODE_ENV = 'production';
      process.env.MOOV_MONEY_ENV = 'production';
      delete process.env.MOOV_MONEY_WEBHOOK_SECRET;

      const result = paymentService.verifyMoovWebhookSignature('{"orderId":"x"}', 'abc');
      expect(result).toBe(false);
    });

    it('accepte en test sans secret', () => {
      process.env.NODE_ENV = 'test';
      delete process.env.MOOV_MONEY_WEBHOOK_SECRET;

      const result = paymentService.verifyMoovWebhookSignature('{"orderId":"x"}', undefined);
      expect(result).toBe(true);
    });
  });
});
