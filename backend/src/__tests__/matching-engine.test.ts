import request from 'supertest';
import { beforeEach, afterEach, describe, expect, it } from '@jest/globals';
import bcrypt from 'bcryptjs';
import app from '../app.js';
import { prisma } from './setup.js';

describe('Matching Engine Phase 1', () => {
  let userId: string;
  let token: string;
  let counter = 0;

  beforeEach(async () => {
    counter += 1;
    const suffix = `${Date.now()}_${counter}`;
    const passwordHash = await bcrypt.hash('Test123!@#', 10);

    await prisma.analytics.deleteMany();
    await prisma.service.deleteMany();
    await prisma.serviceProvider.deleteMany();
    await prisma.job.deleteMany();
    await prisma.course.deleteMany();
    await prisma.loanRequest.deleteMany();
    await prisma.product.deleteMany();
    await prisma.candidateProfile.deleteMany();
    await prisma.user.deleteMany({
      where: { email: { contains: `match_${suffix}` } },
    }).catch(() => {});

    const user = await prisma.user.create({
      data: {
        email: `match_${suffix}@example.com`,
        username: `match_${suffix}`,
        password_hash: passwordHash,
        full_name: 'Matching Test User',
        location: 'Bamako',
        bio: 'Je veux gagner de l argent et apprendre',
      },
    });
    userId = user.id;

    await prisma.candidateProfile.create({
      data: {
        user_id: userId,
        skills: ['design', 'marketing', 'sales'] as any,
        availability: 'immediate',
      },
    });

    await prisma.job.create({
      data: {
        employer_id: userId,
        title: 'Designer Marketing Junior',
        description: 'Mission design et marketing digital',
        job_type: 'freelance',
        status: 'open',
        location: 'Bamako',
      },
    });

    await prisma.course.create({
      data: {
        creator_id: userId,
        title: 'Formation Marketing Digital',
        description: 'Apprendre le marketing de A a Z',
        price: 10000,
        is_published: true,
        level: 'beginner',
      },
    });

    await prisma.product.create({
      data: {
        seller_id: userId,
        name: 'Template Branding',
        description: 'Template pour entrepreneurs',
        price: 5000,
        stock: 10,
        status: 'active',
      },
    });

    const provider = await prisma.serviceProvider.create({
      data: {
        user_id: userId,
        status: 'active',
        is_verified: true,
        city: 'Bamako',
        service_categories: ['marketing', 'design'],
        average_rating: 4.8,
        bio: 'Consultant marketing et design',
      },
    });

    await prisma.service.create({
      data: {
        provider_id: provider.id,
        title: 'Accompagnement branding',
        description: 'Service branding complet',
        price: 25000,
        is_available: true,
      },
    });

    await prisma.loanRequest.create({
      data: {
        borrower_id: userId,
        amount_requested: 200000,
        interest_rate: 5,
        repayment_period_months: 12,
        purpose: 'business',
        status: 'active',
      },
    });

    const login = await request(app).post('/api/auth/login').send({
      email: `match_${suffix}@example.com`,
      password: 'Test123!@#',
    });
    token = login.body.data.accessToken;
  });

  afterEach(async () => {
    await prisma.analytics.deleteMany({ where: { user_id: userId } });
    await prisma.service.deleteMany();
    await prisma.serviceProvider.deleteMany({ where: { user_id: userId } });
    await prisma.job.deleteMany({ where: { employer_id: userId } });
    await prisma.course.deleteMany({ where: { creator_id: userId } });
    await prisma.loanRequest.deleteMany({ where: { borrower_id: userId } });
    await prisma.product.deleteMany({ where: { seller_id: userId } });
    await prisma.candidateProfile.deleteMany({ where: { user_id: userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
  });

  it('returns journey preview from onboarding input', async () => {
    const response = await request(app)
      .post('/api/matching/journey/preview')
      .set('Authorization', `Bearer ${token}`)
      .send({
        goal: 'earn_money',
        skills: ['design', 'sales'],
        level: 'beginner',
        location: 'Bamako',
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.profile.goal).toBe('earn_money');
    expect(Array.isArray(response.body.data.journey)).toBe(true);
    expect(response.body.data.journey.length).toBeGreaterThan(2);
  });

  it('returns cross-module opportunities for user', async () => {
    const response = await request(app)
      .get('/api/matching/opportunities-for-you?limit=15')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data.opportunities)).toBe(true);
    expect(response.body.data.opportunities.length).toBeGreaterThan(0);

    const modules = new Set(response.body.data.opportunities.map((o: any) => o.module));
    expect(modules.has('jobs') || modules.has('services') || modules.has('courses')).toBe(true);
  });

  it('returns interconnection map', async () => {
    const response = await request(app)
      .get('/api/matching/interconnections')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source: 'education', target: 'jobs' }),
        expect.objectContaining({ source: 'marketplace', target: 'wallet' }),
      ])
    );
  });

  it('saves and returns onboarding profile', async () => {
    const saveRes = await request(app)
      .post('/api/matching/onboarding')
      .set('Authorization', `Bearer ${token}`)
      .send({
        goal: 'find_job',
        level: 'intermediate',
        skills: ['design', 'communication'],
        interests: ['emploi', 'business'],
        location: 'Bamako',
        availability: '2weeks',
        financialGoal: 300000,
      });

    expect(saveRes.status).toBe(200);
    expect(saveRes.body.success).toBe(true);
    expect(saveRes.body.data.goal).toBe('find_job');
    expect(saveRes.body.data.availability).toBe('2weeks');
    expect(Array.isArray(saveRes.body.data.skills)).toBe(true);

    const getRes = await request(app)
      .get('/api/matching/onboarding')
      .set('Authorization', `Bearer ${token}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.success).toBe(true);
    expect(getRes.body.data.goal).toBe('find_job');
    expect(getRes.body.data.location).toBe('Bamako');
  });

  it('tracks opportunity action and exposes enriched dashboard KPI', async () => {
    await request(app)
      .post('/api/matching/opportunity-action')
      .set('Authorization', `Bearer ${token}`)
      .send({
        opportunityId: 'job:test-opportunity',
        module: 'jobs',
        action: 'open',
      });

    const dashboardRes = await request(app)
      .get('/api/matching/dashboard')
      .set('Authorization', `Bearer ${token}`);

    expect(dashboardRes.status).toBe(200);
    expect(dashboardRes.body.success).toBe(true);
    expect(dashboardRes.body.data.kpi).toEqual(
      expect.objectContaining({
        progressionPercent: expect.any(Number),
        opportunitiesAvailable: expect.any(Number),
        revenuesGenerated: expect.any(Number),
        conversionRevenueRate: expect.any(Number),
        retentionD7: expect.any(Number),
        retentionD30: expect.any(Number),
      })
    );
    expect(Array.isArray(dashboardRes.body.data.recommendedActions)).toBe(true);
  });

  it('returns kpi summary window with trends and funnel', async () => {
    await request(app)
      .post('/api/matching/opportunity-action')
      .set('Authorization', `Bearer ${token}`)
      .send({
        opportunityId: 'course:test-kpi',
        module: 'courses',
        action: 'open',
      });

    const response = await request(app)
      .get('/api/matching/kpi-summary?windowDays=30')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual(
      expect.objectContaining({
        window: expect.objectContaining({
          days: 30,
        }),
        current: expect.objectContaining({
          activationRate: expect.any(Number),
          engagement: expect.any(Number),
          matchingSuccessRate: expect.any(Number),
          conversionRevenueRate: expect.any(Number),
        }),
        trends: expect.objectContaining({
          engagement: expect.any(Number),
          conversionRevenueRate: expect.any(Number),
        }),
        funnel: expect.any(Array),
      })
    );
  });

  it('returns coach suggestions', async () => {
    const response = await request(app)
      .get('/api/matching/coach')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual(
      expect.objectContaining({
        coachMode: expect.any(String),
        summary: expect.any(String),
        tips: expect.any(Array),
      })
    );
  });

  it('returns trust status', async () => {
    const response = await request(app)
      .get('/api/matching/trust-status')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual(
      expect.objectContaining({
        trustScore: expect.any(Number),
        status: expect.any(String),
        checks: expect.any(Object),
        risk: expect.any(Object),
      })
    );
  });

  it('returns localization and progression status', async () => {
    const [locRes, progRes] = await Promise.all([
      request(app).get('/api/matching/localization').set('Authorization', `Bearer ${token}`),
      request(app).get('/api/matching/progression').set('Authorization', `Bearer ${token}`),
    ]);

    expect(locRes.status).toBe(200);
    expect(locRes.body.success).toBe(true);
    expect(locRes.body.data).toEqual(
      expect.objectContaining({
        currency: expect.any(String),
        nearbyOpportunities: expect.any(Object),
      })
    );

    expect(progRes.status).toBe(200);
    expect(progRes.body.success).toBe(true);
    expect(progRes.body.data).toEqual(
      expect.objectContaining({
        level: expect.any(Number),
        progressToNextLevel: expect.any(Number),
        badgesUnlocked: expect.any(Number),
      })
    );
  });

  it('returns smart notifications', async () => {
    const response = await request(app)
      .get('/api/matching/smart-notifications')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  it('supports coach chat history flow', async () => {
    const chatRes = await request(app)
      .post('/api/matching/coach/chat')
      .set('Authorization', `Bearer ${token}`)
      .send({ message: 'Comment puis-je augmenter mes revenus rapidement ?' });

    expect(chatRes.status).toBe(200);
    expect(chatRes.body.success).toBe(true);
    expect(typeof chatRes.body.data.reply).toBe('string');

    const historyRes = await request(app)
      .get('/api/matching/coach/history?limit=10')
      .set('Authorization', `Bearer ${token}`);

    expect(historyRes.status).toBe(200);
    expect(historyRes.body.success).toBe(true);
    expect(Array.isArray(historyRes.body.data)).toBe(true);
    expect(historyRes.body.data.length).toBeGreaterThan(0);
  });
});
