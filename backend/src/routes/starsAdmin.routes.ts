/**
 * ROUTES ADMIN PAID VIDEO CALLS — module isolé.
 * Monté sur `/api/admin/stars`. Toutes les routes exigent `requireAnyAdmin`.
 */
import { Router } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { requireAnyAdmin } from '../middleware/adminRbac.js';
import { validateBody } from '../utils/zodValidation.js';
import { param } from '../utils/params.js';
import prisma from '../config/database.js';
import adminAuditService from '../services/adminAudit.service.js';
import starCallService from '../services/starCall.service.js';

const router = Router();

async function auditLog(
  req: AuthRequest,
  action: string,
  targetType?: string,
  targetId?: string,
  metadata?: Record<string, unknown>,
) {
  if (!req.user?.id) return;
  await adminAuditService.log({
    admin_id: req.user.id,
    action_type: action,
    target_type: targetType,
    target_id: targetId,
    metadata,
    ip_address: req.ip || 'unknown',
    user_agent: req.get('user-agent') || 'unknown',
  });
}

// ============================================================
// KPIs
// ============================================================
router.get('/kpis', authenticate, requireAnyAdmin, async (_req, res, next) => {
  try {
    const [
      profilesTotal, profilesActive, profilesVerified,
      bookingsTotal, bookingsCompleted, bookingsDisputed,
      bookingsNoShowFan, bookingsNoShowStar,
      revenueAgg, refundsAgg, platformFeeAgg,
      openDisputes,
      upcomingCalls,
    ] = await Promise.all([
      prisma.starProfile.count(),
      prisma.starProfile.count({ where: { is_active: true, is_banned: false } }),
      prisma.starProfile.count({ where: { is_verified: true } }),
      prisma.starBooking.count(),
      prisma.starBooking.count({ where: { status: 'completed' } }),
      prisma.starBooking.count({ where: { status: 'disputed' } }),
      prisma.starBooking.count({ where: { status: 'no_show_fan' } }),
      prisma.starBooking.count({ where: { status: 'no_show_star' } }),
      prisma.starBooking.aggregate({ where: { status: 'completed' }, _sum: { price_fcfa: true } }),
      prisma.starBooking.aggregate({ _sum: { refund_amount_fcfa: true } }),
      prisma.starBooking.aggregate({ where: { status: 'completed' }, _sum: { platform_fee_fcfa: true } }),
      prisma.starDispute.count({ where: { status: 'open' } }),
      prisma.starBooking.count({ where: { status: { in: ['confirmed', 'ongoing'] }, scheduled_start_at: { gte: new Date() } } }),
    ]);
    res.json({
      success: true,
      kpis: {
        profiles: { total: profilesTotal, active: profilesActive, verified: profilesVerified },
        bookings: {
          total: bookingsTotal,
          completed: bookingsCompleted,
          disputed: bookingsDisputed,
          no_show_fan: bookingsNoShowFan,
          no_show_star: bookingsNoShowStar,
          upcoming: upcomingCalls,
        },
        revenue_fcfa: revenueAgg._sum.price_fcfa ?? 0,
        platform_fee_fcfa: platformFeeAgg._sum.platform_fee_fcfa ?? 0,
        refunds_fcfa: refundsAgg._sum.refund_amount_fcfa ?? 0,
        open_disputes: openDisputes,
      },
    });
  } catch (err) { next(err); }
});

// ============================================================
// STARS
// ============================================================
router.get('/stars', authenticate, requireAnyAdmin, async (req, res, next) => {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search : '';
    const stars = await prisma.starProfile.findMany({
      where: search
        ? {
            OR: [
              { headline: { contains: search, mode: 'insensitive' } },
              { user: { username: { contains: search, mode: 'insensitive' } } },
              { user: { full_name: { contains: search, mode: 'insensitive' } } },
              { user: { email: { contains: search, mode: 'insensitive' } } },
            ],
          }
        : undefined,
      orderBy: [{ is_verified: 'desc' }, { rating_avg: 'desc' }, { created_at: 'desc' }],
      take: 100,
      include: {
        user: { select: { id: true, username: true, email: true, full_name: true, profile_image: true } },
      },
    });
    res.json({ success: true, stars });
  } catch (err) { next(err); }
});

const verifySchema = z.object({ verified: z.boolean() });
router.post('/stars/:id/verify', authenticate, requireAnyAdmin, validateBody(verifySchema), async (req: AuthRequest, res, next) => {
  try {
    const id = param(req, 'id');
    const body = req.body as z.infer<typeof verifySchema>;
    const profile = await prisma.starProfile.update({ where: { id }, data: { is_verified: body.verified } });
    await auditLog(req, body.verified ? 'star_verify' : 'star_unverify', 'star_profile', id);
    res.json({ success: true, profile });
  } catch (err) { next(err); }
});

const banSchema = z.object({ banned: z.boolean(), reason: z.string().max(500).optional() });
router.post('/stars/:id/ban', authenticate, requireAnyAdmin, validateBody(banSchema), async (req: AuthRequest, res, next) => {
  try {
    const id = param(req, 'id');
    const body = req.body as z.infer<typeof banSchema>;
    const profile = await prisma.starProfile.update({
      where: { id },
      data: { is_banned: body.banned, ban_reason: body.banned ? (body.reason ?? null) : null, is_active: body.banned ? false : undefined },
    });
    await auditLog(req, body.banned ? 'star_ban' : 'star_unban', 'star_profile', id, { reason: body.reason });
    res.json({ success: true, profile });
  } catch (err) { next(err); }
});

// ============================================================
// BOOKINGS
// ============================================================
router.get('/bookings', authenticate, requireAnyAdmin, async (req, res, next) => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const bookings = await prisma.starBooking.findMany({
      where: status ? { status } : undefined,
      orderBy: { created_at: 'desc' },
      take: 200,
      include: {
        star_profile: { include: { user: { select: { id: true, username: true, full_name: true } } } },
        fan: { select: { id: true, username: true, full_name: true } },
      },
    });
    res.json({ success: true, bookings });
  } catch (err) { next(err); }
});

router.get('/bookings/:id', authenticate, requireAnyAdmin, async (req, res, next) => {
  try {
    const id = param(req, 'id');
    const booking = await prisma.starBooking.findUnique({
      where: { id },
      include: {
        star_profile: { include: { user: { select: { id: true, username: true, full_name: true } } } },
        fan: { select: { id: true, username: true, full_name: true } },
        call_session: true,
        extensions: { orderBy: { created_at: 'asc' } },
        rating: true,
        disputes: { include: { messages: { orderBy: { created_at: 'asc' } } } },
      },
    });
    if (!booking) return res.status(404).json({ success: false, error: { message: 'Introuvable' } });
    res.json({ success: true, booking });
  } catch (err) { next(err); }
});

// ============================================================
// DISPUTES — résolution admin
// ============================================================
router.get('/disputes', authenticate, requireAnyAdmin, async (req, res, next) => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : 'open';
    const disputes = await prisma.starDispute.findMany({
      where: { status },
      orderBy: { created_at: 'desc' },
      take: 200,
      include: {
        booking: {
          include: {
            star_profile: { include: { user: { select: { id: true, username: true } } } },
            fan: { select: { id: true, username: true } },
          },
        },
        opener: { select: { id: true, username: true } },
      },
    });
    res.json({ success: true, disputes });
  } catch (err) { next(err); }
});

const resolveSchema = z.object({
  resolution: z.enum(['refund_full', 'refund_partial', 'reject']),
  amount_fcfa: z.number().min(0).optional(),
  note: z.string().max(2000).optional(),
});
router.post('/disputes/:id/resolve', authenticate, requireAnyAdmin, validateBody(resolveSchema), async (req: AuthRequest, res, next) => {
  try {
    const id = param(req, 'id');
    const body = req.body as z.infer<typeof resolveSchema>;
    const adminId = req.user!.id;

    const dispute = await prisma.starDispute.findUnique({ where: { id }, include: { booking: true } });
    if (!dispute) return res.status(404).json({ success: false, error: { message: 'Litige introuvable' } });
    if (dispute.status !== 'open') return res.status(409).json({ success: false, error: { message: 'Litige déjà résolu' } });

    let refundAmount = 0;
    if (body.resolution === 'refund_full') refundAmount = dispute.booking.price_fcfa;
    else if (body.resolution === 'refund_partial') refundAmount = Math.min(body.amount_fcfa ?? 0, dispute.booking.price_fcfa);

    const statusMap = {
      refund_full: 'resolved_refund_full',
      refund_partial: 'resolved_refund_partial',
      reject: 'resolved_rejected',
    } as const;

    const updated = await prisma.$transaction(async (tx) => {
      if (refundAmount > 0) {
        // reproduit la logique refundBookingTx mais dans la même transaction
        const wallet = await tx.wallet.findFirst({ where: { user_id: dispute.booking.fan_user_id, wallet_type: 'user' } });
        if (wallet) {
          const availBefore = wallet.available_balance ?? wallet.balance ?? 0;
          const lockedBefore = wallet.locked_balance ?? 0;
          const availAfter = availBefore + refundAmount;
          const lockedAfter = Math.max(0, lockedBefore - refundAmount);
          await tx.wallet.update({
            where: { id: wallet.id },
            data: { balance: availAfter, available_balance: availAfter, locked_balance: lockedAfter },
          });
          await tx.transaction.create({
            data: {
              user_id: dispute.booking.fan_user_id,
              type: 'star_call_admin_refund',
              amount: refundAmount,
              currency: dispute.booking.currency,
              status: 'completed',
              description: `Remboursement admin (litige ${dispute.id.slice(0, 8)})`,
              reference_id: dispute.booking.id,
            },
          });
          await tx.ledgerEntry.create({
            data: {
              wallet_id: wallet.id,
              type: 'star_call_admin_refund',
              amount: refundAmount,
              reference_id: dispute.booking.id,
              reference_type: 'star_booking',
              description: `Admin refund (${dispute.id})`,
              balance_before: availBefore,
              balance_after: availAfter,
            },
          });
        }
        await tx.starBooking.update({
          where: { id: dispute.booking.id },
          data: { refund_amount_fcfa: { increment: refundAmount }, status: 'refunded' },
        });
      } else if (body.resolution === 'reject') {
        await tx.starBooking.update({
          where: { id: dispute.booking.id },
          data: { status: dispute.booking.status === 'disputed' ? 'completed' : dispute.booking.status },
        });
      }

      return tx.starDispute.update({
        where: { id: dispute.id },
        data: {
          status: statusMap[body.resolution],
          resolved_by: adminId,
          resolution_note: body.note?.slice(0, 2000) ?? null,
          resolved_at: new Date(),
          refund_amount_fcfa: refundAmount,
        },
      });
    });

    await auditLog(req, `star_dispute_${body.resolution}`, 'star_dispute', id, {
      booking_id: dispute.booking.id,
      refund_amount_fcfa: refundAmount,
    });
    res.json({ success: true, dispute: updated });
  } catch (err) { next(err); }
});

const forceRefundSchema = z.object({ amount_fcfa: z.number().positive(), reason: z.string().max(500) });
router.post('/bookings/:id/force-refund', authenticate, requireAnyAdmin, validateBody(forceRefundSchema), async (req: AuthRequest, res, next) => {
  try {
    const id = param(req, 'id');
    const body = req.body as z.infer<typeof forceRefundSchema>;
    const booking = await prisma.starBooking.findUnique({ where: { id } });
    if (!booking) return res.status(404).json({ success: false, error: { message: 'Réservation introuvable' } });

    await prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findFirst({ where: { user_id: booking.fan_user_id, wallet_type: 'user' } });
      if (!wallet) throw new Error('Wallet fan introuvable');
      const availBefore = wallet.available_balance ?? wallet.balance ?? 0;
      const lockedBefore = wallet.locked_balance ?? 0;
      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: availBefore + body.amount_fcfa,
          available_balance: availBefore + body.amount_fcfa,
          locked_balance: Math.max(0, lockedBefore - body.amount_fcfa),
        },
      });
      await tx.transaction.create({
        data: {
          user_id: booking.fan_user_id,
          type: 'star_call_admin_force_refund',
          amount: body.amount_fcfa,
          currency: booking.currency,
          status: 'completed',
          description: `Force refund admin — ${body.reason}`,
          reference_id: booking.id,
        },
      });
      await tx.ledgerEntry.create({
        data: {
          wallet_id: wallet.id,
          type: 'star_call_admin_force_refund',
          amount: body.amount_fcfa,
          reference_id: booking.id,
          reference_type: 'star_booking',
          description: body.reason,
          balance_before: availBefore,
          balance_after: availBefore + body.amount_fcfa,
        },
      });
      await tx.starBooking.update({
        where: { id: booking.id },
        data: { refund_amount_fcfa: { increment: body.amount_fcfa }, status: 'refunded' },
      });
    });
    await auditLog(req, 'star_call_force_refund', 'star_booking', id, { amount: body.amount_fcfa, reason: body.reason });
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.post('/reaper-run', authenticate, requireAnyAdmin, async (req: AuthRequest, res, next) => {
  try {
    const out = await starCallService.reaperTick();
    await auditLog(req, 'star_reaper_run', 'star_booking', undefined, out);
    res.json({ success: true, ...out });
  } catch (err) { next(err); }
});

export default router;
