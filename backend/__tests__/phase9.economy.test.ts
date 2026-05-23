import { describe, it, expect, beforeAll } from '@jest/globals';
import request from 'supertest';
import app from '../src/app.js';
import commissionService from '../src/services/commission.service.js';
import commissionSettingsService from '../src/services/commissionSettings.service.js';

describe('Phase 9 economy', () => {
  beforeAll(async () => {
    await commissionSettingsService.ensureLoaded();
  });

  it('videoSocialLiveGift uses 70% creator / 30% platform', () => {
    const r = commissionService.videoSocialLiveGift(1000);
    expect(r.platform).toBe(300);
    expect(r.creator).toBe(700);
  });

  it('GET /api/commissions/calculate live_gift matches 70/30', async () => {
    const res = await request(app).get('/api/commissions/calculate').query({
      vertical: 'video_social',
      rule: 'live_gift',
      amount_fcfa: 1000,
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.platform).toBe(300);
    expect(res.body.data.creator).toBe(700);
  });

  it('GET /api/coins/economy exposes payout rate', async () => {
    const res = await request(app).get('/api/coins/economy');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.fcfa_per_coin_payout).toBe(2);
    expect(typeof res.body.data.min_coins_for_exchange).toBe('number');
  });
});
