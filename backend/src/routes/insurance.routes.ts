import { Router } from 'express';
import { authenticate, optionalAuth, AuthRequest } from '../middleware/auth.js';
import { param } from '../utils/params.js';
import { requireStaff } from '../middleware/requireRole.js';
import prisma from '../config/database.js';
import platformControlService from '../services/platformControl.service.js';
import { requireKycFor } from '../services/kycRequired.service.js';
import { logger } from '../utils/logger.js';

import { validateBody } from '../utils/zodValidation.js';
import { jsonObjectBodySchema } from '../schemas/jsonObjectBody.js';

const router = Router();

// ========== Prestataires assurance (Devenir prestataire + admin AfriWonder) ==========

// GET /api/insurance/providers — Liste publique : uniquement les prestataires approuvés
router.get('/providers', async (_req, res, next) => {
  try {
    const list = await prisma.insuranceProvider.findMany({
      where: { status: 'approved' },
      orderBy: { company_name: 'asc' },
      select: {
        id: true,
        company_name: true,
        description: true,
        types_offered: true,
        city: true,
        created_at: true,
      },
    });
    res.json({ success: true, data: list });
  } catch (e) {
    next(e);
  }
});

// POST /api/insurance/providers — Devenir prestataire (utilisateur connecté)
router.post('/providers', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const b = req.body;
    if (!b.company_name?.trim() || !b.contact_name?.trim() || !b.email?.trim() || !b.phone?.trim()) {
      return res.status(400).json({ success: false, message: 'company_name, contact_name, email et phone requis' });
    }
    const existing = await prisma.insuranceProvider.findFirst({
      where: { user_id: userId },
    });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Vous avez déjà une demande en cours ou un compte prestataire assurance.' });
    }
    const typesOffered = Array.isArray(b.types_offered) ? b.types_offered : (b.types_offered ? [b.types_offered] : []);
    const provider = await prisma.insuranceProvider.create({
      data: {
        user_id: userId,
        company_name: b.company_name.trim(),
        contact_name: b.contact_name.trim(),
        email: b.email.trim(),
        phone: b.phone.trim(),
        address: b.address?.trim() || undefined,
        city: b.city?.trim() || undefined,
        description: b.description?.trim() || undefined,
        types_offered: typesOffered,
        license_ref: b.license_ref?.trim() || undefined,
        status: 'pending',
      },
    });
    res.status(201).json({ success: true, data: provider, message: 'Demande enregistrée. Un administrateur la validera avant que votre compagnie n’apparaisse sur la plateforme.' });
  } catch (e) {
    next(e);
  }
});

// GET /api/insurance/providers/admin/pending — Liste des demandes en attente (Admin AfriWonder)
router.get('/providers/admin/pending', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const user = req.user!;
    if (!['super_admin', 'admin', 'moderation_admin'].includes(user.role ?? '')) {
      return res.status(403).json({ success: false, message: 'Accès refusé' });
    }
    const list = await prisma.insuranceProvider.findMany({
      where: { status: 'pending' },
      include: { user: { select: { id: true, full_name: true, email: true } } },
      orderBy: { created_at: 'desc' },
    });
    res.json({ success: true, data: list });
  } catch (e) {
    next(e);
  }
});

// POST /api/insurance/providers/:id/approve — Approuver un prestataire (Admin)
router.post('/providers/:id/approve', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const user = req.user!;
    if (!['super_admin', 'admin', 'moderation_admin'].includes(user.role ?? '')) {
      return res.status(403).json({ success: false, message: 'Accès refusé' });
    }
    const id = param(req, 'id');
    const provider = await prisma.insuranceProvider.findUnique({ where: { id } });
    if (!provider) return res.status(404).json({ success: false, message: 'Prestataire non trouvé' });
    if (provider.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Cette demande n’est plus en attente.' });
    }
    const updated = await prisma.insuranceProvider.update({
      where: { id },
      data: { status: 'approved' },
    });
    try {
      await prisma.notification.create({
        data: {
          user_id: provider.user_id,
          type: 'insurance_provider_approved',
          title: 'Prestataire assurance approuvé',
          message: `Votre compagnie "${provider.company_name}" est maintenant visible sur la plateforme Assurances.`,
          reference_type: 'insurance_provider',
          reference_id: id,
        },
      });
    } catch (notifErr) {
      logger.warn('Notification insurance_provider_approved', { err: (notifErr as Error).message });
    }
    res.json({ success: true, data: updated, message: 'Prestataire approuvé' });
  } catch (e) {
    next(e);
  }
});

// POST /api/insurance/providers/:id/reject — Rejeter un prestataire (Admin)
router.post('/providers/:id/reject', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const user = req.user!;
    if (!['super_admin', 'admin', 'moderation_admin'].includes(user.role ?? '')) {
      return res.status(403).json({ success: false, message: 'Accès refusé' });
    }
    const id = param(req, 'id');
    const { reason } = req.body || {};
    const provider = await prisma.insuranceProvider.findUnique({ where: { id } });
    if (!provider) return res.status(404).json({ success: false, message: 'Prestataire non trouvé' });
    if (provider.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Cette demande n’est plus en attente.' });
    }
    await prisma.insuranceProvider.update({
      where: { id },
      data: { status: 'rejected', rejected_reason: reason || null },
    });
    try {
      await prisma.notification.create({
        data: {
          user_id: provider.user_id,
          type: 'insurance_provider_rejected',
          title: 'Demande prestataire assurance rejetée',
          message: reason
            ? `Votre demande pour "${provider.company_name}" a été rejetée. Raison: ${reason}`
            : 'Votre demande a été rejetée.',
          reference_type: 'insurance_provider',
          reference_id: id,
        },
      });
    } catch (notifErr) {
      logger.warn('Notification insurance_provider_rejected', { err: (notifErr as Error).message });
    }
    res.json({ success: true, message: 'Prestataire rejeté' });
  } catch (e) {
    next(e);
  }
});

// ========== Demandes de devis (formulaire "Demander un devis") ==========

// POST /api/insurance/quote-requests — Demander un devis (public, user_id optionnel si connecté)
router.post('/quote-requests', optionalAuth, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const b = req.body;
    if (!b.full_name?.trim() || !b.phone?.trim()) {
      return res.status(400).json({ success: false, message: 'full_name et phone requis' });
    }
    if (!b.offer_key?.trim() || !b.offer_name?.trim()) {
      return res.status(400).json({ success: false, message: 'offer_key et offer_name requis' });
    }
    const quote = await prisma.insuranceQuoteRequest.create({
      data: {
        user_id: req.user?.id ?? null,
        full_name: b.full_name.trim(),
        phone: b.phone.trim(),
        additional_info: b.additional_info?.trim() || null,
        offer_key: b.offer_key.trim(),
        offer_name: b.offer_name.trim(),
        price_display: b.price_display?.trim() || null,
        status: 'pending',
      },
    });
    res.status(201).json({ success: true, data: quote, message: 'Demande de devis enregistrée. Un conseiller vous contactera.' });
  } catch (e) {
    next(e);
  }
});

router.get('/policies', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const list = await prisma.insurancePolicy.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
    });
    res.json({ success: true, data: list });
  } catch (e) {
    next(e);
  }
});

router.post('/policies', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const b = req.body;
    if (!b.provider || b.premium_amount == null) return res.status(400).json({ success: false, message: 'provider et premium_amount requis' });
    const policy = await prisma.insurancePolicy.create({
      data: {
        user_id: userId,
        policy_type: b.policy_type ?? 'health',
        provider: b.provider,
        plan_name: b.plan_name ?? undefined,
        premium_amount: Number(b.premium_amount),
        payment_frequency: ['monthly', 'quarterly', 'yearly'].includes(b.payment_frequency) ? b.payment_frequency : 'monthly',
        status: 'pending',
      },
    });
    res.status(201).json({ success: true, data: policy });
  } catch (e) {
    next(e);
  }
});

router.get('/claims', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const list = await prisma.insuranceClaim.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
    });
    res.json({ success: true, data: list });
  } catch (e) {
    next(e);
  }
});

router.post('/claims', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    if (!(await platformControlService.isInsuranceEnabled())) {
      return res.status(503).json({ success: false, message: 'Assurance temporairement indisponible.' });
    }
    const kyc = await requireKycFor(userId, 'insurance_claim');
    if (!kyc.allowed) return res.status(403).json({ success: false, message: kyc.message });
    const b = req.body;
    if (!b.policy_id || !b.incident_date || !b.description || b.claim_amount == null) {
      return res.status(400).json({ success: false, message: 'policy_id, incident_date, description et claim_amount requis' });
    }
    const claim = await prisma.insuranceClaim.create({
      data: {
        user_id: userId,
        policy_id: b.policy_id,
        incident_date: new Date(b.incident_date),
        description: b.description,
        claim_amount: Number(b.claim_amount),
        status: 'submitted',
      },
    });
    res.status(201).json({ success: true, data: claim });
  } catch (e) {
    next(e);
  }
});

// PATCH /api/insurance/claims/:id — workflow staff/admin : status, validation_level, risk_score
const claimStatusWorkflow = ['submitted', 'under_review', 'approved', 'rejected', 'paid'];
router.patch('/claims/:id', authenticate, requireStaff, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const id = param(req, 'id');
    const b = req.body;
    const claim = await prisma.insuranceClaim.findUnique({ where: { id } });
    if (!claim) return res.status(404).json({ success: false, message: 'Réclamation non trouvée' });
    const data: Record<string, unknown> = {};
    if (b.status != null && claimStatusWorkflow.includes(b.status)) data.status = b.status;
    if (b.validation_level != null) data.validation_level = Math.min(4, Math.max(0, Number(b.validation_level)));
    if (b.risk_score != null) data.risk_score = Math.min(100, Math.max(0, Number(b.risk_score)));
    const updated = await prisma.insuranceClaim.update({
      where: { id },
      data,
    });
    res.json({ success: true, data: updated });
  } catch (e) {
    next(e);
  }
});

export default router;
