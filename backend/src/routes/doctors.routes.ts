import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { param } from '../utils/params.js';
import prisma from '../config/database.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const specialty = req.query.specialty as string | undefined;
    const city = req.query.city as string | undefined;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const where: Record<string, unknown> = { is_available: true };
    if (specialty) where.specialty = specialty;
    if (city) where.city = { contains: city, mode: 'insensitive' };
    const [doctors, total] = await Promise.all([
      prisma.doctor.findMany({
        where,
        orderBy: { rating: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.doctor.count({ where }),
    ]);
    res.json({ success: true, data: { doctors, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } } });
  } catch (e) {
    next(e);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const id = param(req, 'id');
    const doctor = await prisma.doctor.findUnique({ where: { id } });
    if (!doctor) return res.status(404).json({ success: false, message: 'Médecin non trouvé' });
    res.json({ success: true, data: doctor });
  } catch (e) {
    next(e);
  }
});

router.post('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { full_name: true } });
    const { full_name, specialty, phone, email, clinic_name, clinic_address, city, consultation_fee } = req.body;
    if (!full_name || !specialty || !phone) return res.status(400).json({ success: false, message: 'full_name, specialty et phone requis' });
    const doctor = await prisma.doctor.create({
      data: {
        user_id: userId,
        full_name: full_name ?? user?.full_name ?? 'Médecin',
        specialty: String(specialty),
        phone: String(phone),
        email: email ?? undefined,
        clinic_name: clinic_name ?? undefined,
        clinic_address: clinic_address ?? undefined,
        city: city ?? undefined,
        consultation_fee: consultation_fee != null ? Number(consultation_fee) : undefined,
      },
    });
    res.status(201).json({ success: true, data: doctor });
  } catch (e) {
    next(e);
  }
});

export default router;
