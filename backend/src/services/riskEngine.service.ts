/**
 * Risk engine central — agrège fraud check paiement + blacklist.
 * evaluate() retourne allowed + score/reason pour tous les modules.
 */
import { checkPayment } from './fraudCheck.service.js';
import { checkUserBlacklisted, checkDeviceBlacklisted, checkIpBlacklisted } from './blacklist.service.js';
import { logger } from '../utils/logger.js';

export type RiskAction =
  | 'payment_init'
  | 'payment_confirm'
  | 'ticket_book'
  | 'ride_create'
  | 'claim_submit'
  | 'withdrawal'
  | 'other';

export interface RiskContext {
  userId: string;
  amount?: number;
  paymentMethod?: string;
  orderId?: string;
  ip?: string;
  deviceId?: string;
  action: RiskAction;
}

export interface RiskResult {
  allowed: boolean;
  score: number; // 0-100, 100 = max risk
  reason?: string;
}

export async function evaluate(context: RiskContext): Promise<RiskResult> {
  const { userId, ip, deviceId, action } = context;
  let score = 0;

  // 1. Blacklist user
  const userBlacklisted = await checkUserBlacklisted(userId);
  if (userBlacklisted) {
    logger.warn('Risk engine: user blacklisted', { userId, action });
    return { allowed: false, score: 100, reason: 'Compte restreint.' };
  }

  // 2. Blacklist device / IP
  const deviceBlacklisted = await checkDeviceBlacklisted(deviceId);
  const ipBlacklisted = await checkIpBlacklisted(ip);
  if (deviceBlacklisted) {
    score += 80;
  }
  if (ipBlacklisted) {
    score += 70;
  }
  if (deviceBlacklisted || ipBlacklisted) {
    return {
      allowed: false,
      score: Math.min(100, score),
      reason: 'Appareil ou adresse restreinte.',
    };
  }

  // 3. Règles métier par action (paiement)
  if (action === 'payment_init' || action === 'payment_confirm') {
    const amount = context.amount ?? 0;
    const method = context.paymentMethod ?? 'unknown';
    const fraud = await checkPayment(userId, amount, method, {
      orderId: context.orderId,
      ip: context.ip,
    });
    if (!fraud.allowed) {
      return {
        allowed: false,
        score: 75,
        reason: fraud.reason ?? 'Paiement non autorisé.',
      };
    }
  }

  return { allowed: true, score };
}
