/**
 * API Commissions — lecture seule pour frontend (affichage des frais avant paiement).
 * Backend reste la source de vérité au moment du paiement.
 */
import { Router } from 'express';
import commissionService from '../services/commission.service.js';
import commissionSettingsService from '../services/commissionSettings.service.js';

const router = Router();

/** GET /api/commissions — config complète (taux, montants min/max) pour affichage frontend */
router.get('/', async (req, res, next) => {
  try {
    await commissionSettingsService.ensureLoaded();
    const config = commissionSettingsService.getEffectiveConfig();
    res.json({
      success: true,
      data: config,
      currency_default: 'XOF',
    });
  } catch (e) {
    next(e);
  }
});

/**
 * GET /api/commissions/calculate — calcul des parts (plateforme / autre) pour un montant donné.
 * Utilisé par le frontend pour afficher la répartition avant paiement (éviter les risques / litiges).
 * Query: vertical, rule, amount_fcfa [, delivery_fee_fcfa pour food]
 */
router.get('/calculate', async (req, res, next) => {
  try {
    await commissionSettingsService.ensureLoaded();
    const vertical = (req.query.vertical as string)?.toLowerCase();
    const rule = (req.query.rule as string)?.toLowerCase();
    const amountFcfa = Math.max(0, Number(req.query.amount_fcfa) || 0);
    const deliveryFeeFcfa = Math.max(0, Number(req.query.delivery_fee_fcfa) || 0);

    const verticals: Record<string, string[]> = {
      video_social: ['tips', 'live_gift', 'creator_subscription'],
      marketplace: ['seller', 'flash_sale'],
      services: ['provider'],
      transport: ['ride', 'cancellation'],
      food: ['restaurant', 'delivery_fee'],
      telemedicine: ['consultation', 'pharmacy'],
      property: ['agent_commission', 'sale'],
      ticketing: ['ticket', 'service_fee'],
      bills: ['transaction'],
      airtime: ['recharge'],
      insurance: ['brokerage', 'micro'],
    };

    if (!vertical || !verticals[vertical]?.includes(rule)) {
      return res.status(400).json({
        success: false,
        message: 'Paramètres invalides. vertical et rule requis.',
        allowed: verticals,
      });
    }

    let result: Record<string, number> = {};

    switch (vertical) {
      case 'video_social':
        if (rule === 'tips') {
          const r = commissionService.videoSocialTips(amountFcfa);
          result = { platform: r.platform, creator: r.creator };
        } else if (rule === 'live_gift') {
          const r = commissionService.videoSocialLiveGift(amountFcfa);
          result = { platform: r.platform, creator: r.creator };
        } else if (rule === 'creator_subscription') {
          const r = commissionService.videoSocialCreatorSubscription(amountFcfa);
          result = { platform: r.platform, creator: r.creator };
        }
        break;
      case 'marketplace':
        if (rule === 'seller') {
          const r = commissionService.marketplaceSeller(amountFcfa);
          result = { platform: r.platform, seller: r.seller };
        } else if (rule === 'flash_sale') {
          const r = commissionService.marketplaceFlashSale(amountFcfa);
          result = { platform: r.platform };
        }
        break;
      case 'services':
        if (rule === 'provider') {
          const r = commissionService.servicesProvider(amountFcfa);
          result = { platform: r.platform, provider: r.provider };
        }
        break;
      case 'transport':
        if (rule === 'ride') {
          const r = commissionService.transportRide(amountFcfa);
          result = { platform: r.platform, driver: r.driver };
        } else if (rule === 'cancellation') {
          const r = commissionService.transportCancellation(amountFcfa);
          result = { platform: r.platform, driver: r.driver };
        }
        break;
      case 'food':
        if (rule === 'restaurant') {
          const r = commissionService.foodRestaurant(amountFcfa);
          result = { platform: r.platform, restaurant: r.restaurant };
        } else if (rule === 'delivery_fee') {
          const r = commissionService.foodDeliveryFee(deliveryFeeFcfa || amountFcfa);
          result = { platform: r.platform, driver: r.driver };
        }
        break;
      case 'telemedicine':
        if (rule === 'consultation') {
          const r = commissionService.telemedicineConsultation(amountFcfa);
          result = { platform: r.platform, doctor: r.doctor };
        } else if (rule === 'pharmacy') {
          const r = commissionService.telemedicinePharmacy(amountFcfa);
          result = { platform: r.platform };
        }
        break;
      case 'property':
        if (rule === 'agent_commission') {
          const r = commissionService.propertyFromAgentCommission(amountFcfa);
          result = { platform: r.platform, agent: r.agent };
        } else if (rule === 'sale') {
          const r = commissionService.propertySale(amountFcfa);
          result = { platform: r.platform };
        }
        break;
      case 'ticketing':
        if (rule === 'ticket') {
          const r = commissionService.ticketingTicket(amountFcfa);
          result = { platform: r.platform, organizer: r.organizer };
        } else if (rule === 'service_fee') {
          const r = commissionService.ticketingServiceFee(amountFcfa);
          result = { service_fee: r.serviceFee, platform: r.platform };
        }
        break;
      case 'bills':
        if (rule === 'transaction') {
          const r = commissionService.billsTransaction(amountFcfa);
          result = { platform: r.platform };
        }
        break;
      case 'airtime':
        if (rule === 'recharge') {
          const r = commissionService.airtimeRecharge(amountFcfa);
          result = { platform: r.platform, user_cashback: r.userCashback };
        }
        break;
      case 'insurance':
        if (rule === 'brokerage') {
          const r = commissionService.insuranceBrokerage(amountFcfa);
          result = { platform: r.platform };
        } else if (rule === 'micro') {
          const r = commissionService.insuranceMicro(amountFcfa);
          result = { platform: r.platform };
        }
        break;
    }

    if (Object.keys(result).length === 0) {
      return res.status(400).json({ success: false, message: 'Règle ou vertical non géré.' });
    }

    res.json({
      success: true,
      data: {
        vertical,
        rule,
        amount_fcfa: amountFcfa,
        ...result,
        currency: 'XOF',
      },
    });
  } catch (e) {
    next(e);
  }
});

export default router;
