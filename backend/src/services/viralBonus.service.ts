/**
 * AfriWonder - Bonus viraux: 100K, 500K, 1M vues
 * Détection automatique, paiement manuel validé par admin
 */
import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';

const MILESTONES = [
  { key: '100k', views: 100_000, amount_fcfa: 5_000 },
  { key: '500k', views: 500_000, amount_fcfa: 25_000 },
  { key: '1m', views: 1_000_000, amount_fcfa: 75_000 },
];

export async function checkAndCreateViralBonuses(videoId: string, newViews: number): Promise<void> {
  const video = await prisma.video.findUnique({
    where: { id: videoId },
    select: { id: true, creator_id: true },
  });
  if (!video) return;

  for (const m of MILESTONES) {
    if (newViews < m.views) continue;

    const existing = await prisma.viralBonus.findFirst({
      where: { video_id: videoId, milestone: m.key },
    });
    if (existing) continue;

    await prisma.viralBonus.create({
      data: {
        video_id: videoId,
        creator_id: video.creator_id,
        milestone: m.key,
        amount_fcfa: m.amount_fcfa,
        status: 'pending',
      },
    });
    const viewsLabel = m.key === '100k' ? '100 000' : m.key === '500k' ? '500 000' : '1 000 000';
    await prisma.notification.create({
      data: {
        user_id: video.creator_id,
        type: 'video_viral',
        title: 'Ta vidéo explose 🔥',
        message: `Ta vidéo a atteint ${viewsLabel} vues ! Bonus de ${m.amount_fcfa.toLocaleString()} FCFA en attente de validation.`,
        reference_type: 'video',
        reference_id: videoId,
      },
    });
    logger.info('ViralBonus created', { videoId, milestone: m.key, creatorId: video.creator_id });
  }
}

export async function getPendingViralBonuses(creatorId?: string) {
  const where: any = { status: 'pending' };
  if (creatorId) where.creator_id = creatorId;
  return prisma.viralBonus.findMany({
    where,
    orderBy: { created_at: 'desc' },
  });
}

export async function markViralBonusPaid(bonusId: string, adminId: string): Promise<void> {
  const bonus = await prisma.viralBonus.findUnique({
    where: { id: bonusId },
  });
  if (!bonus || bonus.status === 'paid') return;

  const withdrawalService = (await import('./withdrawal.service.js')).default;
  const wallet = await withdrawalService.getSellerWallet(bonus.creator_id);

  await prisma.$transaction([
    prisma.viralBonus.update({
      where: { id: bonusId },
      data: { status: 'paid', paid_at: new Date() },
    }),
    prisma.sellerWallet.update({
      where: { id: wallet.id },
      data: { balance: { increment: bonus.amount_fcfa } },
    }),
  ]);
  logger.info('ViralBonus paid', { bonusId, creatorId: bonus.creator_id, amount: bonus.amount_fcfa });
}
