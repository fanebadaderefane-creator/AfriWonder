import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { param } from '../utils/params.js';
import { requireStaff } from '../middleware/requireRole.js';
import prisma from '../config/database.js';
import platformControlService from '../services/platformControl.service.js';
import { requireKycFor } from '../services/kycRequired.service.js';

const router = Router();

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

router.post('/policies', authenticate, async (req: AuthRequest, res, next) => {
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

router.post('/claims', authenticate, async (req: AuthRequest, res, next) => {
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
router.patch('/claims/:id', authenticate, requireStaff, async (req: AuthRequest, res, next) => {
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
