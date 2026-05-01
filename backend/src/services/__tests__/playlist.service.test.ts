/**
 * Tests unitaires pour PlaylistService
 */
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

describe('PlaylistService', () => {
  let prisma: any;
  let logger: any;
  let service: any;

  beforeEach(async () => {
    jest.resetModules();
    const prismaMod = await import('../../config/database.js');
    prisma = prismaMod.default;
    const loggerMod = await import('../../utils/logger.js');
    logger = loggerMod.logger;
    const mod = await import('../playlist.service.js');
    service = mod.default;
    jest.restoreAllMocks();
  });

  it('getUserPlaylists renvoie les playlists avec pagination', async () => {
    const findManySpy = jest
      .spyOn(prisma.playlist, 'findMany')
      .mockResolvedValueOnce([]);
    const countSpy = jest
      .spyOn(prisma.playlist, 'count')
      .mockResolvedValueOnce(0);

    const res = await service.getUserPlaylists({
      targetUserId: 'user1',
      page: 1,
      limit: 5,
    });

    // Sans viewerUserId, seules les playlists publiques de l’utilisateur ciblé
    expect(findManySpy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { user_id: 'user1', is_public: true },
        take: 5,
      })
    );
    expect(countSpy).toHaveBeenCalled();
    expect(res.pagination.total).toBe(0);
  });

  it('create crée une playlist et logge', async () => {
    const createSpy = jest
      .spyOn(prisma.playlist, 'create')
      .mockResolvedValue({ id: 'pl1' } as any);
    const infoSpy = jest.spyOn(logger, 'info').mockImplementation(() => {});

    const playlist = await service.create('user1', {
      name: 'Test',
      description: 'Desc',
      isPublic: true,
    });

    expect(createSpy).toHaveBeenCalled();
    expect(playlist.id).toBe('pl1');
    expect(infoSpy).toHaveBeenCalled();
  });

  it('addVideo lève une erreur si playlist non trouvée ou non autorisée', async () => {
    jest
      .spyOn(prisma.playlist, 'findUnique')
      .mockResolvedValueOnce(null);

    await expect(
      service.addVideo('pl1', 'user1', 'vid1')
    ).rejects.toThrow('Playlist not found or unauthorized');
  });

  it('removeVideo lève une erreur si item absent', async () => {
    jest
      .spyOn(prisma.playlist, 'findUnique')
      .mockResolvedValueOnce({ id: 'pl1', user_id: 'user1' } as any);
    jest
      .spyOn(prisma.playlistItem, 'findFirst')
      .mockResolvedValueOnce(null);

    await expect(
      service.removeVideo('pl1', 'user1', 'vid1')
    ).rejects.toThrow('Video not in playlist');
  });
});

