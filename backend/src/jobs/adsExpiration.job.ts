/**
 * CDC Phase 1 - Expiration automatique des campagnes publicitaires
 * Passe status active → expired quand ends_at est dépassé
 */
import { adsService } from '../services/ads.service.js';
import { logger } from '../utils/logger.js';

const INTERVAL_MS = 60 * 60 * 1000; // Toutes les heures

export function startAdsExpirationJob() {
  const run = async () => {
    try {
      const count = await adsService.expireCampaigns();
      if (count > 0) {
        logger.info('Campagnes publicitaires expirées', { expired: count });
      }
    } catch (err: any) {
      logger.error('Erreur expiration campagnes pub', err, { err: err?.message });
    }
  };

  // Premier run après stabilisation du pool (init rétention à 2.5s → run à 5s)
  setTimeout(run, 5000);
  setInterval(run, INTERVAL_MS);
}
