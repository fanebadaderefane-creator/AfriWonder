import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { param } from '../utils/params.js';
import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';

const router = Router();

// GET /api/doctors/admin/pending - Liste des médecins en attente (Admin seulement)
router.get('/admin/pending', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const user = req.user!;
    if (!['super_admin', 'admin', 'moderation_admin'].includes(user.role ?? '')) {
      return res.status(403).json({ success: false, message: 'Accès refusé' });
    }
    const list = await prisma.doctor.findMany({
      where: { is_verified: false },
      include: { user: { select: { id: true, full_name: true, email: true } } },
      orderBy: { created_at: 'desc' },
    });
    res.json({ success: true, data: list });
  } catch (e) {
    next(e);
  }
});

// POST /api/doctors/:id/approve - Approuver un médecin (Admin seulement)
router.post('/:id/approve', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const user = req.user!;
    if (!['super_admin', 'admin', 'moderation_admin'].includes(user.role ?? '')) {
      return res.status(403).json({ success: false, message: 'Accès refusé' });
    }
    const id = param(req, 'id');
    const doctor = await prisma.doctor.findUnique({ where: { id } });
    if (!doctor) return res.status(404).json({ success: false, message: 'Médecin non trouvé' });
    const updated = await prisma.doctor.update({
      where: { id },
      data: { is_verified: true },
    });
    try {
      await prisma.notification.create({
        data: {
          user_id: doctor.user_id,
          type: 'doctor_approved',
          title: 'Profil médecin approuvé',
          message: `Votre profil "${doctor.full_name}" a été approuvé et est maintenant visible sur la plateforme.`,
          reference_type: 'doctor',
          reference_id: id,
        },
      });
    } catch (notifErr) {
      logger.warn('Notification médecin approuvé', { err: (notifErr as Error).message });
    }
    res.json({ success: true, data: updated, message: 'Médecin approuvé' });
  } catch (e) {
    next(e);
  }
});

// POST /api/doctors/:id/reject - Rejeter un médecin (Admin seulement)
router.post('/:id/reject', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const user = req.user!;
    if (!['super_admin', 'admin', 'moderation_admin'].includes(user.role ?? '')) {
      return res.status(403).json({ success: false, message: 'Accès refusé' });
    }
    const id = param(req, 'id');
    const { reason } = req.body || {};
    const doctor = await prisma.doctor.findUnique({ where: { id } });
    if (!doctor) return res.status(404).json({ success: false, message: 'Médecin non trouvé' });
    try {
      await prisma.notification.create({
        data: {
          user_id: doctor.user_id,
          type: 'doctor_rejected',
          title: 'Demande médecin rejetée',
          message: reason
            ? `Votre demande pour "${doctor.full_name}" a été rejetée. Raison: ${reason}`
            : `Votre demande a été rejetée.`,
          reference_type: 'doctor',
          reference_id: id,
        },
      });
    } catch (notifErr) {
      logger.warn('Notification médecin rejeté', { err: (notifErr as Error).message });
    }
    res.json({ success: true, data: doctor, message: 'Médecin rejeté' });
  } catch (e) {
    next(e);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const specialty = req.query.specialty as string | undefined;
    const city = req.query.city as string | undefined;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const where: Record<string, unknown> = { is_verified: true, is_available: true };
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
    if (!doctor.is_verified) return res.status(404).json({ success: false, message: 'Médecin non trouvé' });
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
        is_verified: false,
      },
    });
    try {
      const admins = await prisma.user.findMany({
        where: { role: { in: ['super_admin', 'admin', 'moderation_admin'] } },
        select: { id: true },
      });
      const ownerName = user?.full_name || 'Un prestataire';
      for (const admin of admins) {
        await prisma.notification.create({
          data: {
            user_id: admin.id,
            type: 'doctor_pending_approval',
            title: 'Nouveau médecin en attente d\'approbation',
            message: `${ownerName} a demandé à rejoindre la plateforme télémédecine (${full_name}). Veuillez l'examiner et l'approuver.`,
            reference_type: 'doctor',
            reference_id: doctor.id,
          },
        });
      }
    } catch (notifErr) {
      logger.warn('Notification admin médecin', { err: (notifErr as Error).message });
    }
    res.status(201).json({ success: true, data: doctor, message: 'Demande enregistrée. Vous serez notifié après validation par l\'administrateur.' });
  } catch (e) {
    next(e);
  }
});

export default router;
