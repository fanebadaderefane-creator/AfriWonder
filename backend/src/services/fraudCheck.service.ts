/**
 * Vérifications anti-fraude pour les paiements.
 * - Montant max par paiement
 * - Nombre max d'échecs de paiement par utilisateur (dernière heure)
 * - Vitesse : nombre max de paiements réussis sur une fenêtre courte (ex. 15 min)
 */
import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';

const FRAUD_MAX_PAYMENT_AMOUNT = Number(process.env.FRAUD_MAX_PAYMENT_AMOUNT) || 5_000_000; // XOF, défaut 5M
const FRAUD_MAX_FAILED_LAST_HOUR = Number(process.env.FRAUD_MAX_FAILED_LAST_HOUR) || 5;
const FRAUD_MAX_SUCCESS_WINDOW_MIN = Number(process.env.FRAUD_MAX_SUCCESS_WINDOW_MIN) || 15;
const FRAUD_MAX_SUCCESS_IN_WINDOW = Number(process.env.FRAUD_MAX_SUCCESS_IN_WINDOW) || 10;

export interface FraudCheckResult {
  allowed: boolean;
  reason?: string;
}

export interface FraudCheckContext {
  orderId?: string;
  ip?: string;
}

/**
 * Vérifie si un paiement est autorisé (anti-fraude).
 * À appeler avant de confirmer un paiement ou d'initier un checkout.
 */
export async function checkPayment(
  userId: string,
  amount: number,
  paymentMethod: string,
  context?: FraudCheckContext
): Promise<FraudCheckResult> {
  // 1. Montant max
  if (amount > FRAUD_MAX_PAYMENT_AMOUNT) {
    logger.warn('Fraud check: montant trop élevé', {
      type: 'fraud',
      userId,
      amount,
      max: FRAUD_MAX_PAYMENT_AMOUNT,
      ...context,
    });
    return {
      allowed: false,
      reason: `Montant maximum autorisé par paiement : ${FRAUD_MAX_PAYMENT_AMOUNT.toLocaleString()} FCFA`,
    };
  }

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const windowStart = new Date(Date.now() - FRAUD_MAX_SUCCESS_WINDOW_MIN * 60 * 1000);

  // 2. Échecs de paiement (type payment, status != completed) sur la dernière heure
  const failedCount = await prisma.transaction.count({
    where: {
      user_id: userId,
      type: 'payment',
      status: { not: 'completed' },
      created_at: { gte: oneHourAgo },
    },
  });

  if (failedCount >= FRAUD_MAX_FAILED_LAST_HOUR) {
    logger.warn('Fraud check: trop d\'échecs de paiement', {
      type: 'fraud',
      userId,
      failedCount,
      max: FRAUD_MAX_FAILED_LAST_HOUR,
      ...context,
    });
    return {
      allowed: false,
      reason: 'Trop de tentatives de paiement échouées. Réessayez plus tard.',
    };
  }

  // 3. Vitesse : paiements réussis (type payment, status completed) sur la fenêtre
  const successCount = await prisma.transaction.count({
    where: {
      user_id: userId,
      type: 'payment',
      status: 'completed',
      created_at: { gte: windowStart },
    },
  });

  if (successCount >= FRAUD_MAX_SUCCESS_IN_WINDOW) {
    logger.warn('Fraud check: trop de paiements réussis dans la fenêtre', {
      type: 'fraud',
      userId,
      successCount,
      max: FRAUD_MAX_SUCCESS_IN_WINDOW,
      windowMin: FRAUD_MAX_SUCCESS_WINDOW_MIN,
      ...context,
    });
    return {
      allowed: false,
      reason: 'Limite de paiements atteinte pour le moment. Réessayez dans quelques minutes.',
    };
  }

  return { allowed: true };
}

export default { checkPayment };
