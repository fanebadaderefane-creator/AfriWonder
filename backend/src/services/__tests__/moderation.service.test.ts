/**
 * Tests unitaires pour ModerationService
 */
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

describe('ModerationService', () => {
  let prisma: any;
  let logger: any;
  let service: any;

  beforeEach(async () => {
    jest.resetModules();
    const prismaMod = await import('../../config/database.js');
    prisma = prismaMod.default;
    const loggerMod = await import('../../utils/logger.js');
    logger = loggerMod.logger;
    const mod = await import('../moderation.service.js');
    service = mod.default;
    jest.restoreAllMocks();
  });

  it('listReports applique correctement les filtres et la pagination', async () => {
    const findManySpy = jest
      .spyOn(prisma.moderation, 'findMany')
      .mockResolvedValueOnce([]);
    const countSpy = jest
      .spyOn(prisma.moderation, 'count')
      .mockResolvedValueOnce(0);

    const res = await service.listReports(2, 10, {
      status: 'pending',
      severity: 'high',
      contentType: 'video',
    });

    expect(findManySpy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: 'pending',
          severity: 'high',
          content_type: 'video',
        },
        skip: 10,
        take: 10,
      })
    );
    expect(countSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'pending',
        }),
      })
    );
    expect(res.pagination.page).toBe(2);
    expect(res.pagination.limit).toBe(10);
  });

  it('createReport crée un rapport et logge un message', async () => {
    jest.spyOn(prisma.moderation, 'create').mockResolvedValue({
      id: 'rep1',
    } as any);
    const infoSpy = jest.spyOn(logger, 'info').mockImplementation(() => {});

    const report = await service.createReport('user1', {
      contentType: 'video',
      contentId: 'vid1',
      reason: 'spam',
    });

    expect(report.id).toBe('rep1');
    expect(infoSpy).toHaveBeenCalled();
  });

  it('reviewReport met à jour un rapport existant', async () => {
    jest
      .spyOn(prisma.moderation, 'findUnique')
      .mockResolvedValueOnce({ id: 'rep1', description: 'Old' } as any);
    const updateSpy = jest
      .spyOn(prisma.moderation, 'update')
      .mockResolvedValue({ id: 'rep1', status: 'resolved' } as any);
    const infoSpy = jest.spyOn(logger, 'info').mockImplementation(() => {});

    const res = await service.reviewReport('rep1', 'admin1', {
      status: 'resolved',
      notes: 'OK',
    });

    expect(updateSpy).toHaveBeenCalled();
    expect(res.status).toBe('resolved');
    expect(infoSpy).toHaveBeenCalled();
  });

  it('reviewReport lève une erreur si le rapport est introuvable', async () => {
    jest
      .spyOn(prisma.moderation, 'findUnique')
      .mockResolvedValueOnce(null);

    await expect(
      service.reviewReport('unknown', 'admin1', { status: 'resolved' })
    ).rejects.toThrow('Report not found');
  });
});

