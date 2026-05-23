import type { CommissionVertical } from '../config/commissions.js';
import commissionSettingsService from './commissionSettings.service.js';

class CommissionService {
  getConfig(vertical: CommissionVertical) {
    return commissionSettingsService.getEffectiveConfig()[vertical];
  }

  videoSocialTips(amountFcfa: number) {
    const cfg = this.getConfig('video_social');
    const envPct = process.env.PLATFORM_FEE_PERCENT ? parseFloat(process.env.PLATFORM_FEE_PERCENT) / 100 : null;
    const pct = envPct !== null && !isNaN(envPct) ? envPct : cfg.tips_platform_pct;
    const platform = Math.round(amountFcfa * pct * 100) / 100;
    return { platform, creator: amountFcfa - platform };
  }

  videoSocialLiveGift(amountFcfa: number) {
    const cfg = this.getConfig('video_social');
    const creator = Math.round(amountFcfa * cfg.live_gift_creator_pct * 100) / 100;
    const platform = Math.round(amountFcfa * cfg.live_gift_platform_pct * 100) / 100;
    return { platform, creator };
  }

  videoSocialCreatorSubscription(amountFcfa: number) {
    const cfg = this.getConfig('video_social');
    const platform = Math.round(amountFcfa * cfg.creator_subscription_platform_pct * 100) / 100;
    return { platform, creator: amountFcfa - platform };
  }

  marketplaceSeller(amountFcfa: number, rate?: number) {
    const cfg = this.getConfig('marketplace');
    const pct = rate ?? cfg.seller_commission_default_pct;
    const platform = Math.round(amountFcfa * pct * 100) / 100;
    return { platform, seller: amountFcfa - platform };
  }

  marketplaceFlashSale(amountFcfa: number) {
    const cfg = this.getConfig('marketplace');
    const platform = Math.round(amountFcfa * cfg.flash_sale_platform_pct * 100) / 100;
    return { platform };
  }

  servicesProvider(amountFcfa: number, rate?: number) {
    const cfg = this.getConfig('services');
    const pct = rate ?? cfg.provider_commission_default_pct;
    const platform = Math.round(amountFcfa * pct * 100) / 100;
    return { platform, provider: amountFcfa - platform };
  }

  transportRide(amountFcfa: number) {
    const cfg = this.getConfig('transport');
    const platform = Math.round(amountFcfa * cfg.ride_platform_pct * 100) / 100;
    return { platform, driver: amountFcfa - platform };
  }

  transportCancellation(amountFcfa: number) {
    const cfg = this.getConfig('transport');
    const platform = Math.round(amountFcfa * cfg.cancellation_platform_pct * 100) / 100;
    return { platform, driver: amountFcfa - platform };
  }

  foodRestaurant(orderAmountFcfa: number, rate?: number) {
    const cfg = this.getConfig('food');
    const pct = rate ?? cfg.restaurant_commission_default_pct;
    const platform = Math.round(orderAmountFcfa * pct * 100) / 100;
    return { platform, restaurant: orderAmountFcfa - platform };
  }

  foodDeliveryFee(deliveryFeeFcfa: number) {
    const cfg = this.getConfig('food');
    const driver = Math.round(deliveryFeeFcfa * cfg.delivery_driver_share_pct * 100) / 100;
    const platform = deliveryFeeFcfa - driver;
    return { platform, driver };
  }

  telemedicineConsultation(amountFcfa: number) {
    const cfg = this.getConfig('telemedicine');
    const platform = Math.round(amountFcfa * cfg.consultation_platform_pct * 100) / 100;
    return { platform, doctor: amountFcfa - platform };
  }

  telemedicinePharmacy(amountFcfa: number) {
    const cfg = this.getConfig('telemedicine');
    const platform = Math.round(amountFcfa * cfg.pharmacy_commission_pct * 100) / 100;
    return { platform };
  }

  propertyFromAgentCommission(agentCommissionFcfa: number) {
    const cfg = this.getConfig('property');
    const platform = Math.round(agentCommissionFcfa * cfg.platform_share_of_agent_commission_pct * 100) / 100;
    return { platform, agent: agentCommissionFcfa - platform };
  }

  propertySale(priceFcfa: number) {
    const cfg = this.getConfig('property');
    const platform = Math.round(priceFcfa * cfg.sale_commission_pct * 100) / 100;
    return { platform };
  }

  ticketingTicket(amountFcfa: number, rate?: number) {
    const cfg = this.getConfig('ticketing');
    const pct = rate ?? cfg.ticket_platform_pct;
    const platform = Math.round(amountFcfa * pct * 100) / 100;
    return { platform, organizer: amountFcfa - platform };
  }

  ticketingServiceFee(amountFcfa: number, rate?: number) {
    const cfg = this.getConfig('ticketing');
    const pct = rate ?? cfg.service_fee_default_pct;
    const fee = Math.round(amountFcfa * pct * 100) / 100;
    return { serviceFee: fee, platform: fee };
  }

  billsTransaction(amountFcfa: number) {
    const cfg = this.getConfig('bills');
    let platform = Math.round(amountFcfa * cfg.transaction_fee_default_pct * 100) / 100;
    if (platform < cfg.min_per_transaction_fcfa) platform = cfg.min_per_transaction_fcfa;
    return { platform };
  }

  airtimeRecharge(amountFcfa: number) {
    const cfg = this.getConfig('airtime');
    const operatorCommission = Math.round(amountFcfa * cfg.operator_commission_pct * 100) / 100;
    const cashback = Math.round(amountFcfa * cfg.user_cashback_pct * 100) / 100;
    const platform = Math.round(amountFcfa * cfg.platform_net_margin_pct * 100) / 100;
    return { platform, operatorCommission, userCashback: cashback };
  }

  insuranceBrokerage(premiumFcfa: number, rate?: number) {
    const cfg = this.getConfig('insurance');
    const pct = rate ?? cfg.brokerage_commission_default_pct;
    const platform = Math.round(premiumFcfa * pct * 100) / 100;
    return { platform };
  }

  insuranceMicro(premiumFcfa: number) {
    const cfg = this.getConfig('insurance');
    const platform = Math.round(premiumFcfa * cfg.micro_insurance_commission_pct * 100) / 100;
    return { platform };
  }
}

const commissionService = new CommissionService();
export default commissionService;
