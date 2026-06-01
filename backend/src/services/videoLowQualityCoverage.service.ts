/**
 * Couverture des rendus MP4 légers (`low_quality_url`) — critique forfait mobile Afrique.
 */
import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';
import { enqueueLowQualityRendition } from './videoLowQualityRendition.service.js';

export type VideoLowQualityAlertLevel = 'ok' | 'warn' | 'critical';

export type VideoLowQualityCoverage = {
  total_eligible: number;
  with_low_quality: number;
  hd_only: number;
  coverage_pct: number;
  alert_level: VideoLowQualityAlertLevel;
  alerts: string[];
  recent_hd_only_7d: number;
  pipeline_enabled: boolean;
  sample_missing: Array<{ id: string; title: string; created_at: string }>;
  timestamp: string;
};

const COVERAGE_OK_PCT = 90;
const COVERAGE_WARN_PCT = 70;
const RECENT_HD_WARN_COUNT = 5;

let cache: { data: VideoLowQualityCoverage | null; at: number } = { data: null, at: 0 };
const CACHE_MS = 5 * 60_000;

function eligibleWhere() {
  return {
    visibility: 'public',
    OR: [{ media_type: 'video' }, { media_type: null }],
    NOT: { video_url: '' },
  };
}

export function computeCoverageMetrics(input: {
  totalEligible: number;
  withLowQuality: number;
  recentHdOnly7d: number;
  pipelineEnabled: boolean;
}): Pick<VideoLowQualityCoverage, 'coverage_pct' | 'hd_only' | 'alert_level' | 'alerts'> {
  const total = Math.max(0, input.totalEligible);
  const withLq = Math.max(0, Math.min(input.withLowQuality, total));
  const hdOnly = Math.max(0, total - withLq);
  const coveragePct = total > 0 ? Math.round((withLq / total) * 1000) / 10 : 100;

  const alerts: string[] = [];
  let alertLevel: VideoLowQualityAlertLevel = 'ok';

  if (!input.pipelineEnabled) {
    alerts.push('Pipeline flux léger désactivé (VIDEO_LOW_QUALITY_RENDITION=0 ou R2 absent)');
    alertLevel = 'critical';
  } else if (coveragePct < COVERAGE_WARN_PCT) {
    alerts.push(
      `Couverture flux léger ${coveragePct}% — ${hdOnly} vidéo(s) HD seulement (risque forfait élevé)`,
    );
    alertLevel = 'critical';
  } else if (coveragePct < COVERAGE_OK_PCT) {
    alerts.push(`Couverture flux léger ${coveragePct}% — compléter les rendus manquants`);
    alertLevel = 'warn';
  }

  if (input.recentHdOnly7d >= RECENT_HD_WARN_COUNT) {
    alerts.push(`${input.recentHdOnly7d} vidéo(s) publiées (7 j) sans flux léger`);
    if (alertLevel === 'ok') alertLevel = 'warn';
  }

  return { coverage_pct: coveragePct, hd_only: hdOnly, alert_level: alertLevel, alerts };
}

export async function getVideoLowQualityCoverage(): Promise<VideoLowQualityCoverage> {
  const where = eligibleWhere();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const pipelineEnabled =
    process.env.VIDEO_LOW_QUALITY_RENDITION !== '0' &&
    Boolean(process.env.R2_PUBLIC_URL?.trim());

  const [totalEligible, withLowQuality, recentHdOnly7d, sampleMissing] = await Promise.all([
    prisma.video.count({ where }),
    prisma.video.count({
      where: {
        ...where,
        low_quality_url: { not: null },
        NOT: { low_quality_url: '' },
      },
    }),
    prisma.video.count({
      where: {
        ...where,
        created_at: { gte: sevenDaysAgo },
        OR: [{ low_quality_url: null }, { low_quality_url: '' }],
      },
    }),
    prisma.video.findMany({
      where: {
        ...where,
        OR: [{ low_quality_url: null }, { low_quality_url: '' }],
      },
      select: { id: true, title: true, created_at: true },
      orderBy: { created_at: 'desc' },
      take: 15,
    }),
  ]);

  const metrics = computeCoverageMetrics({
    totalEligible,
    withLowQuality,
    recentHdOnly7d,
    pipelineEnabled,
  });

  const result: VideoLowQualityCoverage = {
    total_eligible: totalEligible,
    with_low_quality: withLowQuality,
    ...metrics,
    recent_hd_only_7d: recentHdOnly7d,
    pipeline_enabled: pipelineEnabled,
    sample_missing: sampleMissing.map((r) => ({
      id: r.id,
      title: r.title,
      created_at: r.created_at.toISOString(),
    })),
    timestamp: new Date().toISOString(),
  };

  if (result.alert_level !== 'ok') {
    logger.warn('videoLowQualityCoverage alert', {
      alert_level: result.alert_level,
      coverage_pct: result.coverage_pct,
      hd_only: result.hd_only,
      recent_hd_only_7d: result.recent_hd_only_7d,
    });
  }

  return result;
}

export async function getVideoLowQualityCoverageCached(): Promise<VideoLowQualityCoverage> {
  if (cache.data && Date.now() - cache.at < CACHE_MS) return cache.data;
  const data = await getVideoLowQualityCoverage();
  cache = { data, at: Date.now() };
  return data;
}

/** Planifie la génération flux léger pour les vidéos HD-only (file sérialisée, admin / job auto). */
export async function backfillLowQualityRenditions(limit = 3): Promise<{
  scheduled: number;
  video_ids: string[];
}> {
  const cap = Math.min(10, Math.max(1, limit));
  const rows = await prisma.video.findMany({
    where: {
      ...eligibleWhere(),
      OR: [{ low_quality_url: null }, { low_quality_url: '' }],
    },
    select: { id: true },
    orderBy: { created_at: 'desc' },
    take: cap,
  });
  let scheduled = 0;
  const video_ids: string[] = [];
  for (const row of rows) {
    if (enqueueLowQualityRendition(row.id)) {
      scheduled += 1;
      video_ids.push(row.id);
    }
  }
  if (scheduled > 0) {
    logger.info('lowQuality backfill enqueued', { count: scheduled });
  }
  cache = { data: null, at: 0 };
  return { scheduled, video_ids };
}
