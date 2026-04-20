import { Router } from 'express';
import prisma from '../config/database.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { param } from '../utils/params.js';
import { invalidateUserFeedCaches } from '../services/feedCache.service.js';

import { validateBody } from '../utils/zodValidation.js';
import { jsonObjectBodySchema } from '../schemas/jsonObjectBody.js';
import { z } from 'zod';

const router = Router();

const saveToggleBodySchema = z.object({
  video_id: z.string().min(1).max(64),
  collection_id: z.string().max(64).optional().nullable(),
});

const saveCollectionBodySchema = z.object({
  name: z.string().min(1).max(80),
});

const saveCollectionRenameSchema = z.object({
  name: z.string().min(1).max(80),
});

// GET /api/saves/collections — Mes dossiers
router.get('/collections', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const rows = await prisma.saveCollection.findMany({
      where: { user_id: userId },
      orderBy: { updated_at: 'desc' },
      include: { _count: { select: { saves: true } } },
    });
    res.json({
      success: true,
      data: rows.map((c) => ({
        id: c.id,
        name: c.name,
        created_at: c.created_at,
        updated_at: c.updated_at,
        save_count: c._count.saves,
      })),
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/saves/collections — Créer un dossier
router.post('/collections', authenticate, validateBody(saveCollectionBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const col = await prisma.saveCollection.create({
      data: { user_id: userId, name: String(req.body.name).trim() },
    });
    res.status(201).json({ success: true, data: col });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/saves/collections/:collectionId — Renommer
router.patch('/collections/:collectionId', authenticate, validateBody(saveCollectionRenameSchema), async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const collectionId = param(req, 'collectionId');
    const existing = await prisma.saveCollection.findFirst({
      where: { id: collectionId, user_id: userId },
    });
    if (!existing) {
      return res.status(404).json({ success: false, error: { message: 'Collection introuvable' } });
    }
    const col = await prisma.saveCollection.update({
      where: { id: collectionId },
      data: { name: String(req.body.name).trim() },
    });
    res.json({ success: true, data: col });
  } catch (error) {
    next(error);
  }
});

// POST /api/saves - Save a video
router.post('/', authenticate, validateBody(saveToggleBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const { video_id, collection_id: collectionIdRaw } = req.body;
    const collection_id =
      typeof collectionIdRaw === 'string' && collectionIdRaw.trim() ? collectionIdRaw.trim() : null;
    const userId = req.user!.id;

    if (collection_id) {
      const col = await prisma.saveCollection.findFirst({
        where: { id: collection_id, user_id: userId },
      });
      if (!col) {
        return res.status(400).json({ success: false, error: { message: 'Collection invalide' } });
      }
    }

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
        data: { user_id: userId, video_id, ...(collection_id ? { collection_id } : {}) },
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
    const collectionId =
      typeof req.query.collection_id === 'string' && req.query.collection_id.trim()
        ? req.query.collection_id.trim()
        : undefined;
    const unsortedOnly = String(req.query.unsorted || '') === '1' || String(req.query.unsorted || '') === 'true';
    // Si limit n'est pas spécifié ou est 0, récupérer toutes les vidéos
    const limit = limitParam ? parseInt(limitParam) : 0;
    const shouldGetAll = !limit || limit === 0;
    const skip = shouldGetAll ? undefined : (page - 1) * limit;

    const saveWhere: any = { user_id: userId };
    if (collectionId) saveWhere.collection_id = collectionId;
    else if (unsortedOnly) saveWhere.collection_id = null;

    let saves: any[];
    let total: number;
    try {
      [saves, total] = await Promise.all([
        prisma.save.findMany({
          where: saveWhere,
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
        prisma.save.count({ where: saveWhere }),
      ]);
    } catch {
      total = await prisma.save.count({ where: saveWhere });
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

