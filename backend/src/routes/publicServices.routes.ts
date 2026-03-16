import { Router } from 'express';
import prisma from '../config/database.js';

const router = Router();

// GET /api/public-services — liste des services publics / administratifs (hub)
router.get('/', async (_req, res, next) => {
  try {
    const services = await prisma.publicService.findMany({
      where: { is_active: true },
      select: { id: true, name: true, slug: true, description: true, category: true, link_url: true, sort_order: true },
      orderBy: [{ sort_order: 'asc' }, { name: 'asc' }],
    });
    res.json({ success: true, data: services });
  } catch (e) {
    next(e);
  }
});

export default router;
