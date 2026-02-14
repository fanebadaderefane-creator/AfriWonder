import { Router } from 'express';
import prisma from '../config/database.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { requireAnyAdmin } from '../middleware/adminRbac.js';
import { logger } from '../utils/logger.js';

const router = Router();

// POST /api/platform-donations — Public, enregistrer une intention de don
// Le numéro Orange Money / Mobile Money est obligatoire pour envoyer la demande de paiement
router.post('/', async (req, res, next) => {
  try {
    const { amount_fcfa, donor_email, donor_phone, donor_name, donor_first_name, donor_age, donor_country, donor_city, donor_message, show_in_contributors } = req.body;
    const amount = parseInt(amount_fcfa ?? amount_fcfa, 10);
    if (isNaN(amount) || amount < 500) {
      return res.status(400).json({
        success: false,
        message: 'Montant minimum 500 FCFA',
      });
    }
    const phone = donor_phone?.trim();
    if (!phone || phone.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Numéro Orange Money / Mobile Money obligatoire pour recevoir la demande de paiement.',
      });
    }
    const donation = await prisma.platformDonation.create({
      data: {
        amount_fcfa: amount,
        donor_email: donor_email?.trim() || null,
        donor_phone: phone,
        donor_name: donor_name?.trim() || null,
        donor_first_name: donor_first_name?.trim() || null,
        donor_age: donor_age ? parseInt(donor_age, 10) : null,
        donor_country: donor_country?.trim() || null,
        donor_city: donor_city?.trim() || null,
        donor_message: donor_message?.trim() || null,
        show_in_contributors: !!show_in_contributors,
        status: 'pending',
        payment_method: 'manual', // À brancher sur Orange Money / MTN plus tard
      },
    });
    logger.info('Platform donation intent', { id: donation.id, amount, donor_phone: phone });
    res.status(201).json({
      success: true,
      data: {
        id: donation.id,
        amount_fcfa: donation.amount_fcfa,
        payment_reference: `Soutien AfriWonder - ${donation.id.slice(0, 8)}`,
        message: 'Merci ! Une demande de paiement sera envoyée à votre numéro. Le libellé sera « Soutien AfriWonder ».',
      },
    });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/platform-donations — Admin, liste des dons
router.get('/', authenticate, requireAnyAdmin, async (req, res, next) => {
  try {
    const donations = await prisma.platformDonation.findMany({
      orderBy: { created_at: 'desc' },
      take: 500,
    });
    const total = await prisma.platformDonation.aggregate({
      where: { status: 'completed' },
      _sum: { amount_fcfa: true },
    });
    res.json({
      success: true,
      data: {
        donations,
        totalCompletedFcfa: total._sum.amount_fcfa ?? 0,
      },
    });
  } catch (error: any) {
    next(error);
  }
});

export default router;
