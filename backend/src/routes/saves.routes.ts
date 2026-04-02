import { Router } from 'express';
import prisma from '../config/database.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { invalidateUserFeedCaches } from '../services/feedCache.service.js';

import { validateBody } from '../utils/zodValidation.js';
import { jsonObjectBodySchema } from '../schemas/jsonObjectBody.js';

const router = Router();

// POST /api/saves - Save a video
router.post('/', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const { video_id } = req.body;
    const userId = req.user!.id;

    const existing = await prisma.save.findFirst({
      where: { user_id: userId, video_id },
    });

    if (existing) {
      await prisma.save.delete({ where: { id: existing.id } });
      await prisma.video.update({
        where: { id: video_id },
        data: { saves: { decrement: 1 } },
      });
      invalidateUserFeedCaches(userId).catch(() => {});
      res.json({ success: true, data: { saved: false } });
    } else {
      await prisma.save.create({
        data: { user_id: userId, video_id },
      });
      await prisma.video.update({
        where: { id: video_id },
        data: { saves: { increment: 1 } },
      });
      invalidateUserFeedCaches(userId).catch(() => {});
      res.json({ success: true, data: { saved: true } });
    }
  } catch (error) {
    next(error);
  }
});

// GET /api/saves - Get user's saved videos
router.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limitParam = req.query.limit as string;
    // Si limit n'est pas spécifié ou est 0, récupérer toutes les vidéos
    const limit = limitParam ? parseInt(limitParam) : 0;
    const shouldGetAll = !limit || limit === 0;
    const skip = shouldGetAll ? undefined : (page - 1) * limit;

    let saves: any[];
    let total: number;
    try {
      [saves, total] = await Promise.all([
        prisma.save.findMany({
          where: { user_id: userId },
          include: {
            video: {
              include: {
                creator: {
                  select: { id: true, username: true, full_name: true, profile_image: true },
                },
              },
            },
          },
          orderBy: { created_at: 'desc' },
          ...(skip !== undefined && { skip }),
          ...(!shouldGetAll && { take: limit }),
        }),
        prisma.save.count({ where: { user_id: userId } }),
      ]);
    } catch {
      total = await prisma.save.count({ where: { user_id: userId } });
      const rows = await prisma.$queryRaw<any[]>`
        SELECT v.*, u.id as "creator_id", u.username, u.full_name as "creator_name", u.profile_image as "creator_avatar"
        FROM "Save" s
        JOIN "Video" v ON v.id = s.video_id
        JOIN "User" u ON u.id = v.creator_id
        WHERE s.user_id = ${userId}
        ORDER BY s.created_at DESC
        LIMIT ${shouldGetAll ? 9999 : limit} OFFSET ${skip ?? 0}
      `;
      saves = rows.map((r: any) => ({
        video: {
          ...r,
          creator: { id: r.creator_id, username: r.username, full_name: r.creator_name, profile_image: r.creator_avatar },
        },
      }));
    }

    res.json({
      success: true,
      data: {
        videos: saves.map(s => s.video),
        pagination: { 
          page: shouldGetAll ? 1 : page, 
          limit: shouldGetAll ? total : limit, 
          total, 
          totalPages: shouldGetAll ? 1 : Math.ceil(total / limit) 
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;

