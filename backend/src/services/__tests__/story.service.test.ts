/**
 * Tests unitaires pour StoryService
 */
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

describe('StoryService', () => {
  let prisma: any;
  let logger: any;
  let service: any;

  beforeEach(async () => {
    jest.resetModules();
    const prismaMod = await import('../../config/database.js');
    prisma = prismaMod.default;
    const loggerMod = await import('../../utils/logger.js');
    logger = loggerMod.logger;
    const mod = await import('../story.service.js');
    service = mod.default;
    jest.restoreAllMocks();
  });

  it('getStories récupère les stories non expirées pour des userIds', async () => {
    const spy = jest
      .spyOn(prisma.story, 'findMany')
      .mockResolvedValueOnce([]);

    const stories = await service.getStories(['u1', 'u2']);

    expect(stories).toEqual([]);
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          user_id: { in: ['u1', 'u2'] },
        }),
      })
    );
  });

  it('create crée une story avec expiration et logge', async () => {
    const createSpy = jest
      .spyOn(prisma.story, 'create')
      .mockResolvedValue({ id: 's1' } as any);
    const infoSpy = jest.spyOn(logger, 'info').mockImplementation(() => {});

    const story = await service.create('user1', {
      mediaUrl: 'http://example.com',
      mediaType: 'image',
      expiresInHours: 1,
    });

    expect(createSpy).toHaveBeenCalled();
    expect(story.id).toBe('s1');
    expect(infoSpy).toHaveBeenCalled();
  });

  it('viewStory lève une erreur si story introuvable', async () => {
    jest
      .spyOn(prisma.story, 'findUnique')
      .mockResolvedValueOnce(null);

    await expect(
      service.viewStory('unknown', 'user1')
    ).rejects.toThrow('Story not found');
  });

  it('cleanupExpired supprime les stories expirées et logge', async () => {
    const deleteSpy = jest
      .spyOn(prisma.story, 'deleteMany')
      .mockResolvedValue({ count: 3 } as any);
    const infoSpy = jest.spyOn(logger, 'info').mockImplementation(() => {});

    const res = await service.cleanupExpired();

    expect(deleteSpy).toHaveBeenCalled();
    expect(res.count).toBe(3);
    expect(infoSpy).toHaveBeenCalled();
  });
});

