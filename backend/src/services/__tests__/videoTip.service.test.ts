import { describe, it, expect, beforeEach, jest } from '@jest/globals';

describe('videoTip.service', () => {
  let prisma: any;
  let service: any;

  beforeEach(async () => {
    jest.resetModules();
    const prismaMod = await import('../../config/database.js');
    prisma = prismaMod.default;
    const mod = await import('../videoTip.service.js');
    service = mod.default;
    jest.restoreAllMocks();
  });

  it('getVideoTips retourne uniquement les tips complétés avec pagination', async () => {
    const tips = [{ id: 'tip-1' }];
    const findSpy = jest
      .spyOn(prisma.videoTip, 'findMany')
      .mockResolvedValueOnce(tips as any);

    const countSpy = jest
      .spyOn(prisma.videoTip, 'count')
      .mockResolvedValueOnce(1 as any);

    const res = await service.getVideoTips('video-1', 1, 10);

    expect(res.tips).toBe(tips);
    expect(res.pagination.total).toBe(1);
    expect(findSpy).toHaveBeenCalled();
    expect(countSpy).toHaveBeenCalled();
  });

  it('getCreatorTipStats agrège correctement les stats', async () => {
    const countSpy = jest
      .spyOn(prisma.videoTip, 'count')
      .mockResolvedValueOnce(3 as any);

    const sumAmountSpy = jest
      .spyOn(prisma.videoTip, 'aggregate')
      .mockResolvedValueOnce({ _sum: { amount: 1000 } } as any)
      .mockResolvedValueOnce({ _sum: { creator_earnings: 700 } } as any);

    const recentTips = [{ id: 'tip-1' }];
    const recentSpy = jest
      .spyOn(prisma.videoTip, 'findMany')
      .mockResolvedValueOnce(recentTips as any);

    const stats = await service.getCreatorTipStats('creator-1');

    expect(stats.totalTips).toBe(3);
    expect(stats.totalAmount).toBe(1000);
    expect(stats.totalEarnings).toBe(700);
    expect(stats.recentTips).toBe(recentTips);
    expect(countSpy).toHaveBeenCalled();
    expect(sumAmountSpy).toHaveBeenCalledTimes(2);
    expect(recentSpy).toHaveBeenCalled();
  });
});

