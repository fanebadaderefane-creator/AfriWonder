/**
 * Integration tests - API Publicité CDC Phase 1
 * Force JWT_SECRET avant tout import pour garantir cohérence auth/login ↔ middleware
 */
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.test'), override: false });
// Forcer les secrets JWT pour cohérence login ↔ authenticate (aligné script test:ads)
process.env.JWT_SECRET = 'test_secret_key_for_jest_tests_only';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_key_for_jest_tests';

import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import app from '../src/app.js';
import prisma from '../src/config/database.js';
import bcrypt from 'bcryptjs';

describe('Ads API', () => {
  let advertiserToken: string;
  let advertiserId: string;
  let campaignId: string;
  let creativeId: string;

  beforeAll(async () => {
    const hashed = await bcrypt.hash('Advertiser123!@#', 10);
    const user = await prisma.user.create({
      data: {
        email: `advertiser${Date.now()}@example.com`,
        password_hash: hashed,
        username: `adv${Date.now()}`,
        full_name: 'Advertiser Test',
      },
    });
    advertiserId = user.id;
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'Advertiser123!@#' });
    if (login.status !== 200) {
      throw new Error(`Login failed: ${login.status} - ${JSON.stringify(login.body)}`);
    }
    advertiserToken = login.body.data?.accessToken || login.body.data?.access_token || '';
    if (!advertiserToken) {
      throw new Error('No token received from login');
    }
  });

  afterAll(async () => {
    await prisma.adClick.deleteMany({}).catch(() => {});
    await prisma.adImpression.deleteMany({}).catch(() => {});
    await prisma.adCreative.deleteMany({}).catch(() => {});
    await prisma.adCampaign.deleteMany({}).catch(() => {});
    await prisma.user.deleteMany({ where: { email: { contains: 'advertiser' } } }).catch(() => {});
  });

  it('GET /api/ads/feed retourne 200 sans auth', async () => {
    const res = await request(app).get('/api/ads/feed?limit=5');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('GET /api/feed retourne items (vidéos + pubs)', async () => {
    const res = await request(app).get('/api/feed?page=1&limit=20');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('items');
    expect(res.body.data).toHaveProperty('pagination');
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it('POST /api/ads/impression retourne 404 pour creative/campaign inexistant', async () => {
    const res = await request(app)
      .post('/api/ads/impression')
      .send({ creative_id: 'non-existent', campaign_id: 'non-existent' });
    expect(res.status).toBe(404);
  });

  it('POST /api/ads/click retourne 404 pour creative/campaign inexistant', async () => {
    const res = await request(app)
      .post('/api/ads/click')
      .send({ creative_id: 'non-existent', campaign_id: 'non-existent' });
    expect(res.status).toBe(404);
  });

  it('GET /api/ads/pricing requiert auth', async () => {
    const res = await request(app).get('/api/ads/pricing');
    expect(res.status).toBe(401);
  });

  it('GET /api/ads/pricing retourne tarifs avec auth', async () => {
    const res = await request(app)
      .get('/api/ads/pricing')
      .set('Authorization', `Bearer ${advertiserToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data[1]).toBe(2000);
    expect(res.body.data[7]).toBe(10000);
    expect(res.body.data[30]).toBe(35000);
  });

  it('POST /api/ads/campaigns crée une campagne', async () => {
    const res = await request(app)
      .post('/api/ads/campaigns')
      .set('Authorization', `Bearer ${advertiserToken}`)
      .send({
        name: 'Test Campaign',
        duration_days: 7,
        ad_type: 'in_feed',
      });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.data.name).toBe('Test Campaign');
    expect(res.body.data.duration_days).toBe(7);
    expect(res.body.data.price_fcfa).toBe(10000);
    expect(res.body.data.status).toBe('draft');
    campaignId = res.body.data.id;
  });

  it('POST /api/ads/campaigns/:id/creatives ajoute un créatif', async () => {
    const res = await request(app)
      .post(`/api/ads/campaigns/${campaignId}/creatives`)
      .set('Authorization', `Bearer ${advertiserToken}`)
      .send({
        media_type: 'video',
        media_url: 'https://example.com/ad-video.mp4',
        thumbnail_url: 'https://example.com/thumb.jpg',
        title: 'Test Ad',
        cta_type: 'visit',
        cta_url: 'https://example.com',
        cta_label: 'Découvrir',
      });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('id');
    creativeId = res.body.data.id;
  });

  it('GET /api/ads/campaigns liste les campagnes', async () => {
    const res = await request(app)
      .get('/api/ads/campaigns')
      .set('Authorization', `Bearer ${advertiserToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.campaigns.length).toBeGreaterThanOrEqual(1);
  });

  it('POST /api/ads/campaigns/:id/submit soumet pour review', async () => {
    // Submit debits the campaign price from the advertiser wallet; ensure sufficient balance
    const ledgerService = (await import('../src/services/ledger.service.js')).default;
    const wallet = await ledgerService.getOrCreateUserWallet(advertiserId, 'XOF');
    await ledgerService.credit(wallet.id, 50000, { referenceType: 'deposit', description: 'Test credit' });

    const res = await request(app)
      .post(`/api/ads/campaigns/${campaignId}/submit`)
      .set('Authorization', `Bearer ${advertiserToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('pending_review');
  });
});
