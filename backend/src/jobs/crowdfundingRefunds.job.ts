/**
 * Remboursements automatiques des campagnes crowdfunding expirées (objectif non atteint).
 * Complète l'action manuelle `POST /api/crowdfunding/:id/refund-if-failed`.
 */
import crowdfundingService from '../services/crowdfunding.service.js';
import { logger } from '../utils/logger.js';

const DEFAULT_INTERVAL_MS = 15 * 60 * 1000;

function intervalMs(): number {
  const raw = process.env.CROWDFUNDING_AUTO_REFUND_INTERVAL_MS;
  if (raw) {
    const n = parseInt(String(raw), 10);
    if (Number.isFinite(n) && n >= 60_000) return n;
  }
  return DEFAULT_INTERVAL_MS;
}

export async function processCrowdfundingFailedRefundsOnce(): ReturnType<
  typeof crowdfundingService.processDueFailedCampaignRefunds
> {
  return crowdfundingService.processDueFailedCampaignRefunds();
}

export function startCrowdfundingFailedRefundsJob() {
  const every = intervalMs();
  setInterval(async () => {
    try {
      const r = await processCrowdfundingFailedRefundsOnce();
      if (r.refunded > 0) {
        logger.info('Crowdfunding: remboursements auto (campagnes échouées)', {
          refunded: r.refunded,
          candidates: r.candidates,
        });
      }
    } catch (e) {
      logger.error('Crowdfunding refunds job error', e);
    }
  }, every);
  logger.info('Job remboursements crowdfunding démarré', { interval_ms: every });
}
