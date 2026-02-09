import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { param } from '../utils/params.js';
import prisma from '../config/database.js';
import platformControlService from '../services/platformControl.service.js';
import { requireKycFor } from '../services/kycRequired.service.js';

const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const [list, total] = await Promise.all([
      prisma.appointment.findMany({
        where: { patient_id: userId },
        orderBy: { appointment_date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { doctor: { select: { id: true, full_name: true, specialty: true } } },
      }),
      prisma.appointment.count({ where: { patient_id: userId } }),
    ]);
    res.json({ success: true, data: { appointments: list, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } } });
  } catch (e) {
    next(e);
  }
});

router.get('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const id = param(req, 'id');
    const appointment = await prisma.appointment.findFirst({
      where: { id, patient_id: req.user!.id },
      include: { doctor: true },
    });
    if (!appointment) return res.status(404).json({ success: false, message: 'Rendez-vous non trouvé' });
    res.json({ success: true, data: appointment });
  } catch (e) {
    next(e);
  }
});

router.post('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    if (!(await platformControlService.isHealthEnabled())) {
      return res.status(503).json({ success: false, message: 'Prise de rendez-vous temporairement indisponible.' });
    }
    const kyc = await requireKycFor(userId, 'appointment');
    if (!kyc.allowed) return res.status(403).json({ success: false, message: kyc.message });
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { full_name: true } });
    const b = req.body;
    if (!b.doctor_id || !b.appointment_date || !b.reason) return res.status(400).json({ success: false, message: 'doctor_id, appointment_date et reason requis' });
    const doctor = await prisma.doctor.findUnique({ where: { id: b.doctor_id } });
    if (!doctor) return res.status(404).json({ success: false, message: 'Médecin non trouvé' });
    const appointment = await prisma.appointment.create({
      data: {
        patient_id: userId,
        patient_name: user?.full_name ?? undefined,
        doctor_id: b.doctor_id,
        doctor_name: doctor.full_name,
        doctor_specialty: doctor.specialty,
        appointment_date: new Date(b.appointment_date),
        reason: b.reason,
        appointment_type: ['telemedicine', 'in_person', 'follow_up'].includes(b.appointment_type) ? b.appointment_type : 'telemedicine',
        duration_minutes: b.duration_minutes ?? 30,
        consultation_fee: doctor.consultation_fee ?? undefined,
        status: 'scheduled',
      },
    });
    res.status(201).json({ success: true, data: appointment });
  } catch (e) {
    next(e);
  }
});

// PATCH /api/appointments/:id — mise à jour statut (patient ou médecin). Confirmer exige payment_status === 'paid'
router.patch('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const id = param(req, 'id');
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: { doctor: { select: { user_id: true } } },
    });
    if (!appointment) return res.status(404).json({ success: false, message: 'Rendez-vous non trouvé' });
    const isPatient = appointment.patient_id === req.user!.id;
    const isDoctor = (appointment.doctor as any)?.user_id === req.user!.id;
    if (!isPatient && !isDoctor) return res.status(403).json({ success: false, message: 'Non autorisé' });
    const { status } = req.body;
    if (status === 'confirmed' && (appointment as any).payment_status !== 'paid') {
      return res.status(400).json({ success: false, message: 'Le créneau ne peut être confirmé qu\'après paiement (payment_status = paid)' });
    }
    const allowed = ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'];
    if (!status || !allowed.includes(status)) return res.status(400).json({ success: false, message: 'Statut invalide' });
    const updated = await prisma.appointment.update({
      where: { id },
      data: { status, ...(status === 'completed' ? { completed_at: new Date() } : {}) },
    });
    res.json({ success: true, data: updated });
  } catch (e) {
    next(e);
  }
});

export default router;
