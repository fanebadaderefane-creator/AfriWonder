import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import prisma from '../config/database.js';
import * as dailyMissionsService from '../services/dailyMissions.service.js';

const router = Router();

router.get('/daily-missions', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const missions = await dailyMissionsService.getDailyMissions(userId);
    res.json({ success: true, data: missions });
  } catch (error: unknown) {
    next(error);
  }
});

const POINTS_MAP: Record<string, number> = {
  like: 5,
  comment: 10,
  share: 15,
  upload_video: 50,
  complete_profile: 100,
  make_purchase: 20,
  follow_user: 10,
  community_post: 15,
  badge_earned: 0,
};

router.get('/me', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const [userPoints, badges] = await Promise.all([
      prisma.userPoints.findUnique({ where: { user_id: userId } }),
      prisma.userBadge.findMany({ where: { user_id: userId }, orderBy: { earned_date: 'desc' } }),
    ]);

    const points = userPoints ?? {
      total_points: 0,
      level: 1,
      current_level_points: 0,
      points_for_next_level: 1000,
      lifetime_points: 0,
    };

    res.json({
      success: true,
      data: {
        ...points,
        badges_count: badges.length,
        badges,
        next_level_progress:
          (points.points_for_next_level > 0
            ? (points.current_level_points / points.points_for_next_level) * 100
            : 0),
      },
    });
  } catch (error: unknown) {
    next(error);
  }
});

router.post('/award', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = (req.body.userId as string) || req.user!.id;
    const action = req.body.action as string;
    const amount = typeof req.body.amount === 'number' ? req.body.amount : 0;
    const pointsToAward = amount || POINTS_MAP[action] || 0;

    if (pointsToAward <= 0) {
      return res.status(400).json({ success: false, error: 'Action invalide ou montant manquant' });
    }

    const existing = await prisma.userPoints.findUnique({ where: { user_id: userId } });
    let userPoints: { total_points: number; current_level_points: number; level: number; points_for_next_level: number };

    if (!existing) {
      const created = await prisma.userPoints.create({
        data: {
          user_id: userId,
          total_points: pointsToAward,
          lifetime_points: pointsToAward,
          level: 1,
          current_level_points: pointsToAward,
          points_for_next_level: 1000,
          last_points_awarded: new Date(),
        },
      });
      userPoints = created;
    } else {
      let newTotal = existing.total_points + pointsToAward;
      let newLifetime = existing.lifetime_points + pointsToAward;
      let newLevel = existing.level;
      let newCurrent = existing.current_level_points + pointsToAward;
      let nextLevel = existing.points_for_next_level;

      while (newCurrent >= nextLevel && newLevel < 100) {
        newCurrent -= nextLevel;
        newLevel += 1;
        nextLevel = 1000 * newLevel;
      }

      const updated = await prisma.userPoints.update({
        where: { user_id: userId },
        data: {
          total_points: newTotal,
          lifetime_points: newLifetime,
          level: newLevel,
          current_level_points: newCurrent,
          points_for_next_level: nextLevel,
          last_points_awarded: new Date(),
        },
      });
      userPoints = updated;
    }

    res.json({
      success: true,
      data: { points: pointsToAward, newTotal: userPoints.total_points },
    });
  } catch (error: unknown) {
    next(error);
  }
});

router.post('/badge', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = (req.body.userId as string) || req.user!.id;
    const { badge_id, badge_name, badge_icon, badge_description, category } = req.body;

    if (!badge_id || !badge_name || !badge_icon) {
      return res.status(400).json({ success: false, error: 'badge_id, badge_name, badge_icon requis' });
    }

    const badge = await prisma.userBadge.upsert({
      where: {
        user_id_badge_id: { user_id: userId, badge_id: String(badge_id) },
      },
      create: {
        user_id: userId,
        badge_id: String(badge_id),
        badge_name: String(badge_name),
        badge_icon: String(badge_icon),
        badge_description: badge_description ? String(badge_description) : null,
        category: category ? String(category) : null,
      },
      update: {},
    });

    res.json({ success: true, data: badge });
  } catch (error: unknown) {
    next(error);
  }
});

export default router;
