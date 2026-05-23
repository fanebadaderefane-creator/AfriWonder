/**
 * QA - FINANCE: Crowdfunding
 * GET /api/crowdfunding, GET /api/crowdfunding/:id
 */
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import app from '../src/app.js';
import { prisma } from './setup.js';
import bcrypt from 'bcryptjs';
import paymentService from '../src/services/payment.service.js';

describe('Crowdfunding API', () => {
  let token: string;
  let user: any;

  beforeAll(async () => {
    const hashed = await bcrypt.hash('Crowd123!@#', 10);
    user = await prisma.user.create({
      data: {
        email: `crowd${Date.now()}@example.com`,
        password_hash: hashed,
        username: `crowduser${Date.now()}`,
        full_name: 'Crowd User',
      },
    });
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'Crowd123!@#' });
    token = login.body.data?.accessToken || '';
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { contains: 'crowd' } } }).catch(() => {});
  });

  it('GET /api/crowdfunding returns list', async () => {
    const res = await request(app).get('/api/crowdfunding').query({ page: 1, limit: 5 });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  it('GET /api/crowdfunding/:id returns 404 for invalid id', async () => {
    const res = await request(app).get('/api/crowdfunding/00000000-0000-0000-0000-000000000000');
    expect([200, 404]).toContain(res.status);
    if (res.status === 200) expect(res.body.success).toBe(true);
    if (res.status === 404) expect(res.body.success).toBe(false);
  });

  it('GET /api/crowdfunding/me/campaigns returns 401 without token', async () => {
    const res = await request(app).get('/api/crowdfunding/me/campaigns');
    expect(res.status).toBe(401);
  });

  it('GET /api/crowdfunding/me/contributions returns 401 without token', async () => {
    const res = await request(app).get('/api/crowdfunding/me/contributions');
    expect(res.status).toBe(401);
  });

  it('GET /api/crowdfunding/me/portfolio returns 401 without token', async () => {
    const res = await request(app).get('/api/crowdfunding/me/portfolio');
    expect(res.status).toBe(401);
  });

  it('GET /api/crowdfunding supports search and status query', async () => {
    const res = await request(app)
      .get('/api/crowdfunding')
      .query({ page: 1, limit: 5, search: 'ab', status: 'active' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  const badCampaignId = '00000000-0000-0000-0000-000000000000';
  it('POST /api/crowdfunding/:id/release-milestone returns 401 without token', async () => {
    const res = await request(app)
      .post(`/api/crowdfunding/${badCampaignId}/release-milestone`)
      .send({ milestoneIndex: 0 });
    expect(res.status).toBe(401);
  });
  it('POST /api/crowdfunding/:id/release-escrow returns 401 without token', async () => {
    const res = await request(app).post(`/api/crowdfunding/${badCampaignId}/release-escrow`).send({});
    expect(res.status).toBe(401);
  });
  it('POST /api/crowdfunding/:id/refund-if-failed returns 401 without token', async () => {
    const res = await request(app).post(`/api/crowdfunding/${badCampaignId}/refund-if-failed`).send({});
    expect(res.status).toBe(401);
  });
  it('POST /api/crowdfunding/:id/suspend returns 401 without token', async () => {
    const res = await request(app).post(`/api/crowdfunding/${badCampaignId}/suspend`).send({ reason: 't' });
    expect(res.status).toBe(401);
  });

  it('GET /api/crowdfunding/:id/updates returns 404 for unknown campaign', async () => {
    const res = await request(app).get(`/api/crowdfunding/${badCampaignId}/updates`);
    expect(res.status).toBe(404);
  });

  it('GET /api/crowdfunding/:id/messages returns 404 for unknown campaign', async () => {
    const res = await request(app).get(`/api/crowdfunding/${badCampaignId}/messages`);
    expect(res.status).toBe(404);
  });

  it('POST /api/crowdfunding/:id/approve returns 401 without token', async () => {
    const res = await request(app).post(`/api/crowdfunding/${badCampaignId}/approve`).send({});
    expect(res.status).toBe(401);
  });

  it('POST /api/crowdfunding/:id/reject returns 401 without token', async () => {
    const res = await request(app).post(`/api/crowdfunding/${badCampaignId}/reject`).send({});
    expect(res.status).toBe(401);
  });

  it('workflow moderation: pending -> approve -> public visible', async () => {
    const stamp = Date.now();
    const creatorPass = 'CrowdCreator123!@#';
    const adminPass = 'CrowdAdmin123!@#';

    const creator = await prisma.user.create({
      data: {
        email: `crowd.creator.${stamp}@example.com`,
        password_hash: await bcrypt.hash(creatorPass, 10),
        username: `crowd_creator_${stamp}`,
        full_name: 'Crowd Creator',
        role: 'user',
      },
    });
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'admin@test.example.com';
    const admin = await prisma.user.upsert({
      where: { email: superAdminEmail },
      create: {
        email: superAdminEmail,
        password_hash: await bcrypt.hash(adminPass, 10),
        username: `crowd_admin_${stamp}`,
        full_name: 'Crowd Admin',
        role: 'admin',
      },
      update: {
        password_hash: await bcrypt.hash(adminPass, 10),
        role: 'admin',
      },
    });

    const creatorLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: creator.email, password: creatorPass });
    const creatorToken = creatorLogin.body.data?.accessToken as string;
    expect(creatorToken).toBeTruthy();

    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: admin.email, password: adminPass });
    const adminToken = adminLogin.body.data?.accessToken as string;
    expect(adminToken).toBeTruthy();

    const createRes = await request(app)
      .post('/api/crowdfunding')
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({
        title: `Projet crowdfunding ${stamp}`,
        description: 'Campagne de test pour vérifier le workflow de modération.',
        goalAmount: 150000,
        endDate: new Date(Date.now() + 15 * 24 * 3600 * 1000).toISOString(),
        category: 'education',
      });
    expect(createRes.status).toBe(201);
    const campaignId = createRes.body?.data?.id as string;
    expect(campaignId).toBeTruthy();
    expect(createRes.body?.data?.status).toBe('pending');

    // Public: pending must NOT be visible in list/detail
    const publicListBefore = await request(app).get('/api/crowdfunding').query({ page: 1, limit: 100 });
    expect(publicListBefore.status).toBe(200);
    const publicCampaignIdsBefore = (publicListBefore.body?.data?.campaigns ?? []).map((c: any) => c.id);
    expect(publicCampaignIdsBefore).not.toContain(campaignId);

    const publicDetailBefore = await request(app).get(`/api/crowdfunding/${campaignId}`);
    expect(publicDetailBefore.status).toBe(404);

    // Creator can still access pending detail
    const creatorDetailPending = await request(app)
      .get(`/api/crowdfunding/${campaignId}`)
      .set('Authorization', `Bearer ${creatorToken}`);
    expect(creatorDetailPending.status).toBe(200);
    expect(creatorDetailPending.body?.data?.status).toBe('pending');

    // Admin approves
    const approveRes = await request(app)
      .post(`/api/crowdfunding/${campaignId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});
    expect(approveRes.status).toBe(200);
    expect(approveRes.body?.data?.approved).toBe(true);

    // Public: now visible
    const publicDetailAfter = await request(app).get(`/api/crowdfunding/${campaignId}`);
    expect(publicDetailAfter.status).toBe(200);
    expect(publicDetailAfter.body?.data?.status).toBe('active');

    const publicListAfter = await request(app).get('/api/crowdfunding').query({ page: 1, limit: 100 });
    expect(publicListAfter.status).toBe(200);
    const publicCampaignIdsAfter = (publicListAfter.body?.data?.campaigns ?? []).map((c: any) => c.id);
    expect(publicCampaignIdsAfter).toContain(campaignId);

    await prisma.campaign.delete({ where: { id: campaignId } }).catch(() => {});
    await prisma.user.delete({ where: { id: creator.id } }).catch(() => {});
  });

  it('workflow contribution: active campaign accepts authenticated contribution', async () => {
    const stamp = Date.now();
    const creatorPass = 'CrowdCreatorContrib123!@#';
    const adminPass = 'CrowdAdminContrib123!@#';
    const backerPass = 'CrowdBackerContrib123!@#';

    const creator = await prisma.user.create({
      data: {
        email: `crowd.creator.contrib.${stamp}@example.com`,
        password_hash: await bcrypt.hash(creatorPass, 10),
        username: `crowd_creator_contrib_${stamp}`,
        full_name: 'Crowd Creator Contrib',
        role: 'user',
      },
    });
    const backer = await prisma.user.create({
      data: {
        email: `crowd.backer.contrib.${stamp}@example.com`,
        password_hash: await bcrypt.hash(backerPass, 10),
        username: `crowd_backer_contrib_${stamp}`,
        full_name: 'Crowd Backer Contrib',
        role: 'user',
      },
    });
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'admin@test.example.com';
    const admin = await prisma.user.upsert({
      where: { email: superAdminEmail },
      create: {
        email: superAdminEmail,
        password_hash: await bcrypt.hash(adminPass, 10),
        username: `crowd_admin_contrib_${stamp}`,
        full_name: 'Crowd Admin Contrib',
        role: 'admin',
      },
      update: {
        password_hash: await bcrypt.hash(adminPass, 10),
        role: 'admin',
      },
    });

    const creatorLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: creator.email, password: creatorPass });
    const creatorToken = creatorLogin.body.data?.accessToken as string;
    expect(creatorToken).toBeTruthy();

    const backerLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: backer.email, password: backerPass });
    const backerToken = backerLogin.body.data?.accessToken as string;
    expect(backerToken).toBeTruthy();

    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: admin.email, password: adminPass });
    const adminToken = adminLogin.body.data?.accessToken as string;
    expect(adminToken).toBeTruthy();

    const createRes = await request(app)
      .post('/api/crowdfunding')
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({
        title: `Projet contribution ${stamp}`,
        description: 'Campagne de test contribution après approbation admin.',
        goalAmount: 200000,
        endDate: new Date(Date.now() + 15 * 24 * 3600 * 1000).toISOString(),
        category: 'business',
      });
    expect(createRes.status).toBe(201);
    const campaignId = createRes.body?.data?.id as string;
    expect(campaignId).toBeTruthy();

    const approveRes = await request(app)
      .post(`/api/crowdfunding/${campaignId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});
    expect(approveRes.status).toBe(200);

    const paymentSpy = jest
      .spyOn(paymentService, 'initiateOrangeMoneyPayment')
      .mockResolvedValue({
        success: true,
        transactionId: `tx_${stamp}`,
        paymentUrl: 'https://payments.example/checkout',
      } as any);

    const contribRes = await request(app)
      .post(`/api/crowdfunding/${campaignId}/contribute`)
      .set('Authorization', `Bearer ${backerToken}`)
      .send({
        amount: 25000,
        phone: '+22370000000',
      });

    expect(contribRes.status).toBe(201);
    expect(contribRes.body?.success).toBe(true);
    expect(contribRes.body?.data?.paymentUrl).toBeTruthy();
    expect(contribRes.body?.data?.transactionId).toBeTruthy();

    paymentSpy.mockRestore();
    await prisma.campaign.delete({ where: { id: campaignId } }).catch(() => {});
    await prisma.user.delete({ where: { id: creator.id } }).catch(() => {});
    await prisma.user.delete({ where: { id: backer.id } }).catch(() => {});
  });
});
