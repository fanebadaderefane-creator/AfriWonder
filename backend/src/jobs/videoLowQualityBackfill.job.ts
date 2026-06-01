/**
 * Backfill automatique des rendus flux léger — prod sans intervention manuelle.
 * Traite l'historique HD-only par petits lots via la file ffmpeg sérialisée.
 */
import {
  backfillLowQualityRenditions,
  getVideoLowQualityCoverage,
} from '../services/videoLowQualityCoverage.service.js';
import { logger } from '../utils/logger.js';

const INTERVAL_MS = Math.max(
  5 * 60_000,
  Number(process.env.VIDEO_LOW_Q_BACKFILL_INTERVAL_MS || '600000') || 600_000,
);
const BOOT_DELAY_MS = Math.max(60_000, Number(process.env.VIDEO_LOW_Q_BACKFILL_BOOT_MS || '180000') || 180_000);
const TARGET_COVERAGE_PCT = Math.min(
  100,
  Math.max(70, Number(process.env.VIDEO_LOW_Q_TARGET_COVERAGE_PCT || '90') || 90),
);
const BATCH_SIZE = Math.min(
  5,
  Math.max(1, Number(process.env.VIDEO_LOW_Q_BACKFILL_BATCH || '2') || 2),
);

async function runAutoBackfillPass(): Promise<void> {
  if (process.env.VIDEO_LOW_QUALITY_RENDITION === '0') return;
  if (!process.env.R2_PUBLIC_URL?.trim()) return;

  const cov = await getVideoLowQualityCoverage();
  if (cov.hd_only <= 0 || cov.coverage_pct >= TARGET_COVERAGE_PCT) return;

  const { scheduled } = await backfillLowQualityRenditions(BATCH_SIZE);
  if (scheduled > 0) {
    logger.info('videoLowQuality auto-backfill', {
      scheduled,
      coverage_pct: cov.coverage_pct,
      hd_only: cov.hd_only,
      target_pct: TARGET_COVERAGE_PCT,
    });
  }
}

export function startVideoLowQualityBackfillJob(): void {
  const run = () => {
    void runAutoBackfillPass().catch((err) =>
      logger.warn('videoLowQuality auto-backfill error', { err: (err as Error)?.message }),
    );
  };

  setTimeout(run, BOOT_DELAY_MS);
  setInterval(run, INTERVAL_MS);
  logger.info('videoLowQuality auto-backfill job started', {
    interval_min: Math.round(INTERVAL_MS / 60_000),
    batch: BATCH_SIZE,
    target_pct: TARGET_COVERAGE_PCT,
  });
}
