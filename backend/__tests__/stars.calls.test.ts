/**
 * QA - PAID VIDEO CALLS (Talk with Stars)
 * Flux critique: reservation -> escrow, limites anti-abus, rappel 10 min.
 */
import request from 'supertest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import app from '../src/app.js';
import { prisma } from './setup.js';
import starCallService from '../src/services/starCall.service.js';

describe('Stars Calls API', () => {
  jest.setTimeout(120_000);

  const stamp = Date.now();
  const createdBookingIds: string[] = [];
  let starUser: { id: string; email: string };
  let fanUser: { id: string; email: string };
  let fanReminderUser: { id: string; email: string };
  let starProfileId = '';
  let fanToken = '';
  let fanReminderToken = '';
  let starToken = '';

  beforeAll(async () => {
    const pass = 'StarsCall123!@#';
    const hash = await bcrypt.hash(pass, 10);

    starUser = await prisma.user.create({
      data: {
        email: `star.call.${stamp}@example.com`,
        password_hash: hash,
        username: `star_call_${stamp}`,
        full_name: 'Star Call Creator',
        bio: 'Creator bio test',
        profile_image: 'https://example.com/avatar-star.png',
      },
      select: { id: true, email: true },
    });
    fanUser = await prisma.user.create({
      data: {
        email: `fan.call.${stamp}@example.com`,
        password_hash: hash,
        username: `fan_call_${stamp}`,
        full_name: 'Fan Call User',
        bio: 'Fan bio test',
        profile_image: 'https://example.com/avatar-fan.png',
      },
      select: { id: true, email: true },
    });
    fanReminderUser = await prisma.user.create({
      data: {
        email: `fan.reminder.${stamp}@example.com`,
        password_hash: hash,
        username: `fan_reminder_${stamp}`,
        full_name: 'Fan Reminder User',
        bio: 'Fan reminder bio',
        profile_image: 'https://example.com/avatar-fan-reminder.png',
      },
      select: { id: true, email: true },
    });

    await prisma.wallet.upsert({
      where: { id: `wallet-fan-${fanUser.id}` },
      update: { balance: 1_000_000, available_balance: 1_000_000, locked_balance: 0 },
      create: {
        id: `wallet-fan-${fanUser.id}`,
        user_id: fanUser.id,
        wallet_type: 'user',
        balance: 1_000_000,
        available_balance: 1_000_000,
        locked_balance: 0,
        currency: 'XOF',
      },
    });
    await prisma.wallet.upsert({
      where: { id: `wallet-fan-reminder-${fanReminderUser.id}` },
      update: { balance: 200_000, available_balance: 200_000, locked_balance: 0 },
      create: {
        id: `wallet-fan-reminder-${fanReminderUser.id}`,
        user_id: fanReminderUser.id,
        wallet_type: 'user',
        balance: 200_000,
        available_balance: 200_000,
        locked_balance: 0,
        currency: 'XOF',
      },
    });

    const secret = process.env.JWT_SECRET || 'test_jwt_secret_global_for_all_tests';
    starToken = jwt.sign({ userId: starUser.id, id: starUser.id }, secret, { expiresIn: '1h' });
    fanToken = jwt.sign({ userId: fanUser.id, id: fanUser.id }, secret, { expiresIn: '1h' });
    fanReminderToken = jwt.sign({ userId: fanReminderUser.id, id: fanReminderUser.id }, secret, { expiresIn: '1h' });

    const activateRes = await request(app)
      .post('/api/stars/me/star/activate')
      .set('Authorization', `Bearer ${starToken}`)
      .send({
        headline: 'Test creator',
        bio: 'Bio for test creator',
        category: 'Influencer',
        country: 'ML',
      });
    expect([200, 201]).toContain(activateRes.status);
    starProfileId = activateRes.body?.profile?.id || activateRes.body?.data?.profile?.id || activateRes.body?.data?.id;
    if (!starProfileId) {
      const p = await prisma.starProfile.findUnique({ where: { user_id: starUser.id } });
      starProfileId = p?.id || '';
    }
    expect(starProfileId).toBeTruthy();

    await request(app)
      .patch('/api/stars/me/star')
      .set('Authorization', `Bearer ${starToken}`)
      .send({
        price_fcfa_5min: 1000,
        price_fcfa_10min: 2000,
        price_fcfa_15min: 3000,
        max_calls_per_day: 50,
      });
    await request(app)
      .post('/api/stars/me/star/toggle')
      .set('Authorization', `Bearer ${starToken}`)
      .send({ active: true });
    expect(fanToken).toBeTruthy();
    expect(fanReminderToken).toBeTruthy();
  });

  /** En premier : aucune autre réservation sur la star → évite « Créneau déjà réservé ». */
  it('fan late cancel refunds partial per FAN_LATE_CANCEL_REFUND_RATE (CdC §14)', async () => {
    const startAt = new Date(Date.now() + 20 * 60_000).toISOString();
    const { booking: created } = await starCallService.createBooking(fanReminderUser.id, {
      star_profile_id: starProfileId,
      duration_minutes: 5,
      scheduled_start_at: startAt,
    });
    createdBookingIds.push(created.id);

    await starCallService.cancelByFan(created.id, fanReminderUser.id, 'test annulation tardive');

    const row = await prisma.starBooking.findUnique({
      where: { id: created.id },
      select: { refund_amount_fcfa: true, status: true, price_fcfa: true },
    });
    expect(row?.status).toBe('cancelled');
    const expected = Math.round(Number(row?.price_fcfa ?? 0) * 0.5);
    expect(row?.refund_amount_fcfa).toBe(expected);
  });

  it('fan cancels pending_payment without touching wallet escrow', async () => {
    const startAt = new Date(Date.now() + 400 * 60_000);
    const endAt = new Date(startAt.getTime() + 5 * 60_000);
    const ch = `star-call-pending-${Date.now()}`;
    const b = await prisma.starBooking.create({
      data: {
        star_profile_id: starProfileId,
        fan_user_id: fanUser.id,
        star_user_id: starUser.id,
        price_fcfa: 1500,
        duration_minutes: 5,
        currency: 'XOF',
        scheduled_start_at: startAt,
        scheduled_end_at: endAt,
        status: 'pending_payment',
        payment_method: 'orange_money',
        platform_fee_fcfa: 300,
        star_earnings_fcfa: 1200,
        agora_channel: ch,
      },
    });
    createdBookingIds.push(b.id);
    const before = await prisma.wallet.findFirst({
      where: { user_id: fanUser.id, wallet_type: 'user' },
      select: { available_balance: true, locked_balance: true },
    });
    const out = await starCallService.cancelByFan(b.id, fanUser.id, 'abandon paiement OM');
    expect(out.status).toBe('cancelled');
    const after = await prisma.wallet.findFirst({
      where: { user_id: fanUser.id, wallet_type: 'user' },
      select: { available_balance: true, locked_balance: true },
    });
    expect(Number(after?.available_balance ?? 0)).toBe(Number(before?.available_balance ?? 0));
    expect(Number(after?.locked_balance ?? 0)).toBe(Number(before?.locked_balance ?? 0));
  });

  afterAll(async () => {
    if (createdBookingIds.length) {
      await prisma.starBooking.deleteMany({ where: { id: { in: createdBookingIds } } }).catch(() => {});
    }
    await prisma.starProfile.deleteMany({ where: { user_id: starUser.id } }).catch(() => {});
    await prisma.notification.deleteMany({
      where: { type: { in: ['star_call_reminder_10min', 'star_call_ready'] } },
    }).catch(() => {});
    await prisma.wallet.deleteMany({
      where: { user_id: { in: [fanUser.id, fanReminderUser.id, starUser.id] } },
    }).catch(() => {});
    await prisma.user.deleteMany({
      where: { email: { in: [starUser.email, fanUser.email, fanReminderUser.email] } },
    }).catch(() => {});
  });

  it('creates booking and moves fan balance to escrow', async () => {
    const startAt = new Date(Date.now() + 25 * 60_000).toISOString();
    const before = await prisma.wallet.findFirst({
      where: { user_id: fanUser.id, wallet_type: 'user' },
      select: { available_balance: true, locked_balance: true },
    });
    const { booking } = await starCallService.createBooking(fanUser.id, {
      star_profile_id: starProfileId,
      duration_minutes: 5,
      scheduled_start_at: startAt,
    });
    expect(booking?.status).toBe('confirmed');
    createdBookingIds.push(booking.id);

    const after = await prisma.wallet.findFirst({
      where: { user_id: fanUser.id, wallet_type: 'user' },
      select: { available_balance: true, locked_balance: true },
    });
    expect((after?.available_balance || 0)).toBeLessThan(before?.available_balance || 0);
    expect((after?.locked_balance || 0)).toBeGreaterThan(before?.locked_balance || 0);
  });

  it('blocks fan when active booking limit is reached', async () => {
    const baseStart = Date.now() + 60 * 60_000;
    for (let i = 0; i < 4; i++) {
      try {
        const { booking } = await starCallService.createBooking(fanUser.id, {
          star_profile_id: starProfileId,
          duration_minutes: 5,
          scheduled_start_at: new Date(baseStart + i * 10 * 60_000).toISOString(),
        });
        createdBookingIds.push(booking.id);
      } catch {
        // The loop may already hit active-bookings limit before i=3.
      }
    }
    let thrown: any = null;
    try {
      await starCallService.createBooking(fanUser.id, {
        star_profile_id: starProfileId,
        duration_minutes: 5,
        scheduled_start_at: new Date(baseStart + 6 * 10 * 60_000).toISOString(),
      });
    } catch (error: any) {
      thrown = error;
    }
    expect(thrown?.statusCode).toBe(409);
    const msg = String(thrown?.message || '');
    expect(msg.toLowerCase()).toContain('réservations actives');
  });

  it('sends 10-min reminder and marks booking as reminded', async () => {
    const startAt = new Date(Date.now() + 8 * 60_000);
    const booking = await prisma.starBooking.create({
      data: {
        star_profile_id: starProfileId,
        fan_user_id: fanReminderUser.id,
        star_user_id: starUser.id,
        price_fcfa: 1000,
        duration_minutes: 5,
        currency: 'XOF',
        scheduled_start_at: startAt,
        scheduled_end_at: new Date(startAt.getTime() + 5 * 60_000),
        status: 'confirmed',
        payment_method: 'wallet',
        agora_channel: `star-call-reminder-${Date.now()}`,
      },
      select: { id: true },
    });
    const bookingId = booking.id;
    createdBookingIds.push(bookingId);

    const out = await starCallService.processUpcomingReminders();
    expect(out.sent).toBeGreaterThan(0);

    const refreshed = await prisma.starBooking.findUnique({
      where: { id: bookingId },
      select: { reminder_sent_at: true },
    });
    expect(refreshed?.reminder_sent_at).toBeTruthy();
  });

  it('extends a confirmed booking by +5 minutes with immediate payment', async () => {
    const startAt = new Date(Date.now() + 300 * 60_000).toISOString();
    const { booking: created } = await starCallService.createBooking(fanReminderUser.id, {
      star_profile_id: starProfileId,
      duration_minutes: 5,
      scheduled_start_at: startAt,
    });
    const bookingId = created.id as string;
    createdBookingIds.push(bookingId);

    const before = await prisma.starBooking.findUnique({
      where: { id: bookingId },
      select: { extra_minutes: true },
    });
    const extOut = await starCallService.extendCall(bookingId, fanReminderUser.id);
    expect(extOut.booking.id).toBe(bookingId);
    const after = await prisma.starBooking.findUnique({
      where: { id: bookingId },
      select: { extra_minutes: true },
    });
    expect((after?.extra_minutes || 0)).toBe((before?.extra_minutes || 0) + 5);
  });

  it('opens a dispute on completed booking', async () => {
    const booking = await prisma.starBooking.create({
      data: {
        star_profile_id: starProfileId,
        fan_user_id: fanReminderUser.id,
        star_user_id: starUser.id,
        price_fcfa: 1000,
        duration_minutes: 5,
        currency: 'XOF',
        scheduled_start_at: new Date(Date.now() - 30 * 60_000),
        scheduled_end_at: new Date(Date.now() - 25 * 60_000),
        actually_started_at: new Date(Date.now() - 29 * 60_000),
        actually_ended_at: new Date(Date.now() - 24 * 60_000),
        status: 'completed',
        payment_method: 'wallet',
        agora_channel: `star-call-dispute-${Date.now()}`,
      },
      select: { id: true },
    });
    createdBookingIds.push(booking.id);

    const disputeRes = await request(app)
      .post(`/api/stars/bookings/${booking.id}/dispute`)
      .set('Authorization', `Bearer ${fanReminderToken}`)
      .send({ reason: 'qualité mauvaise', requested_refund_fcfa: 500 });
    expect(disputeRes.status).toBe(201);
    expect(disputeRes.body?.dispute?.status).toBe('open');
  });
});
