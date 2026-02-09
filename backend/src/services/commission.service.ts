/**
 * Service de calcul des commissions plateforme selon le modèle AfriWonder.
 * Utilise backend/src/config/commissions.ts comme source unique.
 */
import { COMMISSION_VERTICALS, type CommissionVertical } from '../config/commissions.js';

class CommissionService {
  getConfig(vertical: CommissionVertical) {
    return COMMISSION_VERTICALS[vertical];
  }

  // —— 1. Vidéo social ——
  /** Tips/cadeaux : part plateforme (30%) */
  videoSocialTips(amountFcfa: number) {
    const pct = COMMISSION_VERTICALS.video_social.tips_platform_pct;
    const platform = Math.round(amountFcfa * pct * 100) / 100;
    return { platform, creator: amountFcfa - platform };
  }

  /** Cadeaux live : 50% partagé (25% créateur, 25% plateforme) */
  videoSocialLiveGift(amountFcfa: number) {
    const creatorPct = COMMISSION_VERTICALS.video_social.live_gift_creator_pct;
    const platformPct = COMMISSION_VERTICALS.video_social.live_gift_platform_pct;
    const creator = Math.round(amountFcfa * creatorPct * 100) / 100;
    const platform = Math.round(amountFcfa * platformPct * 100) / 100;
    return { platform, creator };
  }

  /** Abonnement créateur : 20% plateforme */
  videoSocialCreatorSubscription(amountFcfa: number) {
    const pct = COMMISSION_VERTICALS.video_social.creator_subscription_platform_pct;
    const platform = Math.round(amountFcfa * pct * 100) / 100;
    return { platform, creator: amountFcfa - platform };
  }

  // —— 2. Marketplace ——
  /** Commission vendeur (défaut 10%, plage 8-12%) */
  marketplaceSeller(amountFcfa: number, rate?: number) {
    const pct = rate ?? COMMISSION_VERTICALS.marketplace.seller_commission_default_pct;
    const platform = Math.round(amountFcfa * pct * 100) / 100;
    return { platform, seller: amountFcfa - platform };
  }

  /** Flash sale : 15% */
  marketplaceFlashSale(amountFcfa: number) {
    const pct = COMMISSION_VERTICALS.marketplace.flash_sale_platform_pct;
    const platform = Math.round(amountFcfa * pct * 100) / 100;
    return { platform };
  }

  // —— 3. Services pro ——
  /** Commission prestataire (défaut 17.5%, plage 15-20%) */
  servicesProvider(amountFcfa: number, rate?: number) {
    const pct = rate ?? COMMISSION_VERTICALS.services.provider_commission_default_pct;
    const platform = Math.round(amountFcfa * pct * 100) / 100;
    return { platform, provider: amountFcfa - platform };
  }

  // —— 4. Transport ——
  /** Commission course (20-25%, défaut 22.5%) */
  transportRide(amountFcfa: number) {
    const pct = COMMISSION_VERTICALS.transport.ride_platform_pct;
    const platform = Math.round(amountFcfa * pct * 100) / 100;
    return { platform, driver: amountFcfa - platform };
  }

  /** Frais annulation : 500-1000 FCFA, 50% plateforme */
  transportCancellation(amountFcfa: number) {
    const platformPct = COMMISSION_VERTICALS.transport.cancellation_platform_pct;
    const platform = Math.round(amountFcfa * platformPct * 100) / 100;
    return { platform, driver: amountFcfa - platform };
  }

  // —— 5. Livraison repas ——
  /** Commission restaurant (25-30%, défaut 27.5%) */
  foodRestaurant(orderAmountFcfa: number, rate?: number) {
    const pct = rate ?? COMMISSION_VERTICALS.food.restaurant_commission_default_pct;
    const platform = Math.round(orderAmountFcfa * pct * 100) / 100;
    return { platform, restaurant: orderAmountFcfa - platform };
  }

  /** Part livraison : 50% livreur, 50% plateforme (sur frais livraison) */
  foodDeliveryFee(deliveryFeeFcfa: number) {
    const driverPct = COMMISSION_VERTICALS.food.delivery_driver_share_pct;
    const driver = Math.round(deliveryFeeFcfa * driverPct * 100) / 100;
    const platform = deliveryFeeFcfa - driver;
    return { platform, driver };
  }

  // —— 6. Télémedecine ——
  /** Commission consultation (20-25%) */
  telemedicineConsultation(amountFcfa: number) {
    const pct = COMMISSION_VERTICALS.telemedicine.consultation_platform_pct;
    const platform = Math.round(amountFcfa * pct * 100) / 100;
    return { platform, doctor: amountFcfa - platform };
  }

  /** Pharmacie partenaire : 10% sur ordonnances */
  telemedicinePharmacy(amountFcfa: number) {
    const pct = COMMISSION_VERTICALS.telemedicine.pharmacy_commission_pct;
    const platform = Math.round(amountFcfa * pct * 100) / 100;
    return { platform };
  }

  // —— 7. Immobilier ——
  /** Commission plateforme sur part agent (30-50% de la commission agent) */
  propertyFromAgentCommission(agentCommissionFcfa: number) {
    const pct = COMMISSION_VERTICALS.property.platform_share_of_agent_commission_pct;
    const platform = Math.round(agentCommissionFcfa * pct * 100) / 100;
    return { platform, agent: agentCommissionFcfa - platform };
  }

  /** Commission vente : 2-3% prix vente */
  propertySale(priceFcfa: number) {
    const pct = COMMISSION_VERTICALS.property.sale_commission_pct;
    const platform = Math.round(priceFcfa * pct * 100) / 100;
    return { platform };
  }

  // —— 8. Billetterie ——
  /** Commission ticket (10-15%, défaut 12.5%) */
  ticketingTicket(amountFcfa: number, rate?: number) {
    const pct = rate ?? COMMISSION_VERTICALS.ticketing.ticket_platform_pct;
    const platform = Math.round(amountFcfa * pct * 100) / 100;
    return { platform, organizer: amountFcfa - platform };
  }

  /** Frais service acheteur (2-5%) */
  ticketingServiceFee(amountFcfa: number, rate?: number) {
    const pct = rate ?? COMMISSION_VERTICALS.ticketing.service_fee_default_pct;
    const fee = Math.round(amountFcfa * pct * 100) / 100;
    return { serviceFee: fee, platform: fee };
  }

  // —— 9. Paiement factures ——
  /** Frais transaction (1-2%) + minimum 100 FCFA */
  billsTransaction(amountFcfa: number) {
    const pct = COMMISSION_VERTICALS.bills.transaction_fee_default_pct;
    const minFcfa = COMMISSION_VERTICALS.bills.min_per_transaction_fcfa;
    let platform = Math.round(amountFcfa * pct * 100) / 100;
    if (platform < minFcfa) platform = minFcfa;
    return { platform };
  }

  // —— 10. Recharge crédit ——
  /** Commission opérateur 3-5% ; marge nette plateforme ~1-3% */
  airtimeRecharge(amountFcfa: number) {
    const operatorPct = COMMISSION_VERTICALS.airtime.operator_commission_pct;
    const cashbackPct = COMMISSION_VERTICALS.airtime.user_cashback_pct;
    const platformPct = COMMISSION_VERTICALS.airtime.platform_net_margin_pct;
    const operatorCommission = Math.round(amountFcfa * operatorPct * 100) / 100;
    const cashback = Math.round(amountFcfa * cashbackPct * 100) / 100;
    const platform = Math.round(amountFcfa * platformPct * 100) / 100;
    return { platform, operatorCommission, userCashback: cashback };
  }

  // —— 11. Assurance ——
  /** Commission courtage (15-25%, défaut 20%) */
  insuranceBrokerage(premiumFcfa: number, rate?: number) {
    const pct = rate ?? COMMISSION_VERTICALS.insurance.brokerage_commission_default_pct;
    const platform = Math.round(premiumFcfa * pct * 100) / 100;
    return { platform };
  }

  /** Micro-assurance : 20-30% */
  insuranceMicro(premiumFcfa: number) {
    const pct = COMMISSION_VERTICALS.insurance.micro_insurance_commission_pct;
    const platform = Math.round(premiumFcfa * pct * 100) / 100;
    return { platform };
  }
}

const commissionService = new CommissionService();
export default commissionService;
