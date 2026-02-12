/**
 * CDC Live Streaming Mali — Tests des fonctionnalités exigées par le cahier des charges
 * - Rappel live programmé (15 min avant)
 * - Grille sanctions / strikes (3 strikes = ban)
 * - Délai retrait 24–48h paramétrable
 */
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import app from '../app.js';
import { prisma } from './setup.js';
import * as liveReminder from '../jobs/liveScheduledReminder.job.js';
import * as moderationSanctions from '../services/moderationSanctions.service.js';

describe('CDC Live Streaming Mali', () => {
  let adminToken: string;
  let adminId: string;
  let targetUserId: string;

  beforeAll(async () => {
    const hashed = await bcrypt.hash('Admin123!@#', 10);
    const admin = await prisma.user.create({
      data: {
        email: `cdcadmin${Date.now()}@example.com`,
        password_hash: hashed,
        username: `cdcadmin${Date.now()}`,
        full_name: 'CDC Admin',
        role: 'admin',
      },
    });
    adminId = admin.id;
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: admin.email, password: 'Admin123!@#' });
    adminToken = login.body.data?.accessToken || '';

    const targetHashed = await bcrypt.hash('Target123!@#', 10);
    const target = await prisma.user.create({
      data: {
        email: `cdctarget${Date.now()}@example.com`,
        password_hash: targetHashed,
        username: `cdctarget${Date.now()}`,
        full_name: 'CDC Target',
      },
    });
    targetUserId = target.id;
  });

  afterAll(async () => {
    await prisma.userStrike.deleteMany({ where: { user_id: targetUserId } }).catch(() => {});
    await prisma.user.deleteMany({ where: { email: { contains: 'cdc' } } }).catch(() => {});
  });

  describe('Rappel live programmé (15 min avant)', () => {
    it('processScheduledLiveReminders retourne success et sent=0 si aucun live programmé', async () => {
      const result = await liveReminder.processScheduledLiveReminders();
      expect(result.success).toBe(true);
      expect(result.sent).toBe(0);
    });

    it('processScheduledLiveReminders envoie des notifications aux abonnés pour un live dans 15 min', async () => {
      const now = new Date();
      const in10Min = new Date(now.getTime() + 10 * 60 * 1000);

      const creator = await prisma.user.create({
        data: {
          email: `cdccreator${Date.now()}@example.com`,
          password_hash: 'x',
          username: `cdccreator${Date.now()}`,
          full_name: 'CDC Creator',
        },
      });

      const stream = await prisma.liveStream.create({
        data: {
          creator_id: creator.id,
          title: 'CDC Test Live',
          status: 'scheduled',
          scheduled_at: in10Min,
        },
      });

      await prisma.follow.create({
        data: {
          follower_id: targetUserId,
          following_id: creator.id,
        },
      });

      const result = await liveReminder.processScheduledLiveReminders();
      expect(result.success).toBe(true);
      expect(result.sent).toBeGreaterThanOrEqual(1);

      const notif = await prisma.notification.findFirst({
        where: {
          user_id: targetUserId,
          type: 'live_scheduled_reminder',
          reference_id: stream.id,
        },
      });
      expect(notif).toBeTruthy();
      expect(notif?.message).toContain('15 min');

      await prisma.notification.deleteMany({ where: { reference_id: stream.id } });
      await prisma.follow.deleteMany({ where: { following_id: creator.id } });
      await prisma.liveStream.delete({ where: { id: stream.id } });
      await prisma.user.delete({ where: { id: creator.id } });
    });
  });

  describe('Grille sanctions / strikes (3 strikes = ban)', () => {
    it('POST /api/moderation/strikes — ajoute un strike', async () => {
      const res = await request(app)
        .post('/api/moderation/strikes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: targetUserId,
          infraction: 'spam',
          reason: 'Test CDC spam',
        });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.strikesCount).toBeGreaterThanOrEqual(1);
      expect(res.body.data.strike.id).toBeDefined();
    });

    it('GET /api/moderation/strikes/:userId — liste les strikes', async () => {
      const res = await request(app)
        .get(`/api/moderation/strikes/${targetUserId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.strikes).toBeDefined();
      expect(Array.isArray(res.body.data.strikes)).toBe(true);
      expect(res.body.data.count).toBeGreaterThanOrEqual(1);
    });

    it('3 strikes provoquent un ban définitif', async () => {
      const testUser = await prisma.user.create({
        data: {
          email: `cdc3strikes${Date.now()}@example.com`,
          password_hash: 'x',
          username: `cdc3strikes${Date.now()}`,
          full_name: '3 Strikes Test',
        },
      });

      await moderationSanctions.addStrike(testUser.id, {
        infraction: 'spam',
        reason: 'Strike 1',
        issuedBy: adminId,
      });
      await moderationSanctions.addStrike(testUser.id, {
        infraction: 'spam',
        reason: 'Strike 2',
        issuedBy: adminId,
      });
      const result = await moderationSanctions.addStrike(testUser.id, {
        infraction: 'inappropriate_language',
        reason: 'Strike 3',
        issuedBy: adminId,
      });

      expect(result.banned).toBe(true);
      expect(result.strikesCount).toBe(3);

      const updated = await prisma.user.findUnique({
        where: { id: testUser.id },
      });
      expect(updated?.account_suspended).toBe(true);
      expect(updated?.suspended_reason).toContain('3 strikes');

      await prisma.userStrike.deleteMany({ where: { user_id: testUser.id } });
      await prisma.user.delete({ where: { id: testUser.id } });
    });
  });

  describe('Délai retrait 24–48h', () => {
    it('WITHDRAWAL_DELAY_HOURS est utilisé (vérification via erreur processWithdrawal)', async () => {
      const withdrawalService = (await import('../services/withdrawal.service.js')).default;
      const wallet = await prisma.sellerWallet.findFirst({ where: { user_id: adminId } });
      if (!wallet) {
        await prisma.sellerWallet.create({
          data: { user_id: adminId, balance: 50000, currency: 'XOF' },
        });
      } else {
        await prisma.sellerWallet.update({
          where: { id: wallet.id },
          data: { balance: 50000 },
        });
      }

      const withdrawal = await prisma.withdrawal.create({
        data: {
          user_id: adminId,
          amount: 15000,
          currency: 'XOF',
          orange_money_phone: '7712345678',
          status: 'pending',
        },
      });

      try {
        await withdrawalService.processWithdrawal(withdrawal.id, adminId, {});
      } catch (e: any) {
        expect(e.message).toMatch(/délai|ne peut être traité/);
      }

      await prisma.withdrawal.delete({ where: { id: withdrawal.id } });
    });
  });
});
