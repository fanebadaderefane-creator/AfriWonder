/**
 * Middleware optionnel : si PAYMENT_WEBHOOK_SECRET est défini, exige le header X-Webhook-Secret.
 * Utilisé pour les routes de confirmation de paiement (gifts, certificates) appelées par le provider.
 */
import { Request, Response, NextFunction } from 'express';

const secret = process.env.PAYMENT_WEBHOOK_SECRET || process.env.WEBHOOK_SECRET;

export function requireWebhookSecret(req: Request, res: Response, next: NextFunction) {
  if (!secret) return next();
  const header = req.headers['x-webhook-secret'] || req.headers['x-payment-webhook-secret'];
  if (header !== secret) {
    return res.status(401).json({ success: false, error: { message: 'Webhook non autorisé' } });
  }
  next();
}
