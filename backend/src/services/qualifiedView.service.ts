/**
 * AfriWonder - Vues qualifiées pour monétisation vidéo
 * ≥5 secondes, utilisateur réel, engagement détecté
 * 1000 vues qualifiées = 0.05€ à 0.20€ max
 */
import prisma from '../config/database.js';

const MIN_WATCH_SECONDS = 5;
const TIME_BUCKET_SECONDS = 1800; // 30 min
const CPM_MIN_EUR = 0.05;
const CPM_MAX_EUR = 0.2;
const EUR_TO_FCFA = 655.957;

export async function recordQualifiedView(
  videoId: string,
  options: {
    userId?: string;
    deviceId?: string;
    watchSeconds: number;
    watchPercent?: number;
    scrollSlow?: boolean;
    interactionDetected?: boolean;
  }
): Promise<{ recorded: boolean; qualifiedViews: number }> {
  const { userId, deviceId, watchSeconds, watchPercent, scrollSlow, interactionDetected } = options;
  if (watchSeconds < MIN_WATCH_SECONDS) {
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      select: { qualified_views_count: true },
    });
    return { recorded: false, qualifiedViews: video?.qualified_views_count ?? 0 };
  }

  // Anti-bot: utilisateur réel = userId ou deviceId (IP seul exclu)
  const viewerKey = userId ? `u:${userId}` : deviceId ? `d:${deviceId}` : null;
  if (!viewerKey) return { recorded: false, qualifiedViews: 0 };

  const timeBucket = Math.floor(Date.now() / 1000 / TIME_BUCKET_SECONDS);

  const result = await prisma.qualifiedVideoView.createMany({
    data: [{
      video_id: videoId,
      viewer_key: viewerKey,
      watch_seconds: watchSeconds,
      watch_percent: watchPercent ?? undefined,
      scroll_slow: scrollSlow ?? undefined,
      interaction_detected: interactionDetected ?? undefined,
      time_bucket: timeBucket,
    }],
    skipDuplicates: true,
  });

  if (result.count === 0) {
    if (scrollSlow || interactionDetected) {
      await prisma.qualifiedVideoView.updateMany({
        where: { video_id: videoId, viewer_key: viewerKey, time_bucket: timeBucket },
        data: {
          ...(scrollSlow !== undefined && { scroll_slow: scrollSlow }),
          ...(interactionDetected !== undefined && { interaction_detected: interactionDetected }),
        },
      });
    }
    const v = await prisma.video.findUnique({
      where: { id: videoId },
      select: { qualified_views_count: true },
    });
    return { recorded: false, qualifiedViews: v?.qualified_views_count ?? 0 };
  }

  const updated = await prisma.video.update({
    where: { id: videoId },
    data: { qualified_views_count: { increment: 1 } },
    select: { qualified_views_count: true },
  });
  return { recorded: true, qualifiedViews: updated.qualified_views_count };
}

export function calculateVideoEarnings(qualifiedViews: number): number {
  const cpm = (CPM_MIN_EUR + CPM_MAX_EUR) / 2;
  const euros = (qualifiedViews / 1000) * cpm;
  return Math.round(euros * EUR_TO_FCFA * 100) / 100;
}
