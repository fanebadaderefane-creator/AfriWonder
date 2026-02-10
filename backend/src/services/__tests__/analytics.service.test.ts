import { describe, it, expect, beforeEach, jest } from '@jest/globals';

describe('analytics.service', () => {
  let prisma: any;
  let service: any;

  beforeEach(async () => {
    jest.resetModules();
    const prismaMod = await import('../../config/database.js');
    prisma = prismaMod.default;
    const mod = await import('../analytics.service.js');
    service = mod.default;
    jest.restoreAllMocks();
  });

  it('getVideoAnalytics construit correctement le filtre sans dates', async () => {
    const spy = jest
      .spyOn(prisma.videoAnalytics, 'findMany')
      .mockResolvedValueOnce([]);

    const res = await service.getVideoAnalytics('video-1');

    expect(res).toEqual([]);
    expect(spy).toHaveBeenCalledTimes(1);
    const arg = spy.mock.calls[0][0];
    expect(arg.where).toEqual({ video_id: 'video-1' });
    expect(arg.orderBy).toEqual({ date: 'asc' });
  });

  it('getVideoAnalytics ajoute les bornes de dates quand fournies', async () => {
    const spy = jest
      .spyOn(prisma.videoAnalytics, 'findMany')
      .mockResolvedValueOnce([]);

    const start = new Date('2024-01-01');
    const end = new Date('2024-01-31');
    await service.getVideoAnalytics('video-2', start, end);

    const arg = spy.mock.calls[0][0];
    expect(arg.where.video_id).toBe('video-2');
    expect(arg.where.date.gte).toEqual(start);
    expect(arg.where.date.lte).toEqual(end);
  });

  it('getCreatorAnalytics retourne analytics + agrégats', async () => {
    const rows = [
      {
        id: 'a1',
        creator_id: 'u1',
        video_id: 'v1',
        date: new Date(),
        views: 10,
        likes: 2,
        comments: 1,
        shares: 0,
        watch_time_minutes: 5,
        revenue: 1000,
      },
      {
        id: 'a2',
        creator_id: 'u1',
        video_id: 'v2',
        date: new Date(),
        views: 20,
        likes: 3,
        comments: 4,
        shares: 1,
        watch_time_minutes: 15,
        revenue: 500,
      },
    ];

    const spy = jest
      .spyOn(prisma.videoAnalytics, 'findMany')
      .mockResolvedValueOnce(rows as any);

    const result = await service.getCreatorAnalytics('u1');

    expect(spy).toHaveBeenCalledTimes(1);
    const arg = spy.mock.calls[0][0];
    expect(arg.where).toEqual({ creator_id: 'u1' });
    expect(arg.include.video.select).toMatchObject({
      id: true,
      title: true,
      thumbnail_url: true,
    });

    expect(result.analytics).toEqual(rows);
    expect(result.totals).toEqual({
      views: 30,
      likes: 5,
      comments: 5,
      shares: 1,
      watchTime: 20,
      revenue: 1500,
    });
  });

  it('createAnalytics mappe les champs vers prisma.analytics.create', async () => {
    const created = { id: 'an-1' };
    const spy = jest
      .spyOn(prisma.analytics, 'create')
      .mockResolvedValueOnce(created as any);

    const res = await service.createAnalytics({
      userId: 'u1',
      entityType: 'video',
      entityId: 'v1',
      metricType: 'view',
      metricValue: 1,
      metadata: { source: 'test' },
    });

    expect(res).toBe(created);
    expect(spy).toHaveBeenCalledWith({
      data: {
        user_id: 'u1',
        entity_type: 'video',
        entity_id: 'v1',
        metric_type: 'view',
        metric_value: 1,
        metadata: { source: 'test' },
      },
    });
  });

  it('recordVideoAnalytics met à jour une ligne existante quand trouvée', async () => {
    const existing = {
      id: 'va-1',
      views: 5,
      likes: 1,
      comments: 0,
      shares: 0,
      watch_time_minutes: 10,
      revenue: 100,
      engagement_rate: 0.1,
    };

    const findSpy = jest
      .spyOn(prisma.videoAnalytics, 'findFirst')
      .mockResolvedValueOnce(existing as any);

    const updateSpy = jest
      .spyOn(prisma.videoAnalytics, 'update')
      .mockResolvedValueOnce({} as any);

    await service.recordVideoAnalytics({
      video_id: 'v1',
      creator_id: 'u1',
      date: new Date('2024-01-02T10:00:00Z'),
      views: 3,
      likes: 2,
      comments: 1,
      shares: 1,
      watch_time_minutes: 5,
      revenue: 50,
      engagement_rate: 0.2,
    });

    expect(findSpy).toHaveBeenCalled();
    expect(updateSpy).toHaveBeenCalledTimes(1);
    const arg = updateSpy.mock.calls[0][0];
    expect(arg.where).toEqual({ id: 'va-1' });
    expect(arg.data.views).toBe(8);
    expect(arg.data.likes).toBe(3);
    expect(arg.data.comments).toBe(1);
    expect(arg.data.shares).toBe(1);
    expect(arg.data.watch_time_minutes).toBe(15);
    expect(arg.data.revenue).toBe(150);
    expect(arg.data.engagement_rate).toBe(0.2);
  });

  it('recordVideoAnalytics crée une nouvelle ligne avec date normalisée quand aucune existante', async () => {
    const findSpy = jest
      .spyOn(prisma.videoAnalytics, 'findFirst')
      .mockResolvedValueOnce(null);

    const createSpy = jest
      .spyOn(prisma.videoAnalytics, 'create')
      .mockResolvedValueOnce({} as any);

    const date = new Date('2024-03-10T15:30:00Z');
    await service.recordVideoAnalytics({
      video_id: 'v2',
      creator_id: 'u2',
      date,
    });

    expect(findSpy).toHaveBeenCalled();
    expect(createSpy).toHaveBeenCalledTimes(1);
    const arg = createSpy.mock.calls[0][0];
    expect(arg.data.video_id).toBe('v2');
    expect(arg.data.creator_id).toBe('u2');
    // la date doit être tronquée au début de journée
    const createdDate: Date = arg.data.date;
    expect(createdDate.getHours()).toBe(0);
    expect(createdDate.getMinutes()).toBe(0);
    expect(arg.data.views).toBe(1); // valeur par défaut quand undefined
  });

  it('getAnalytics utilise prisma.analytics.findMany avec les bons filtres', async () => {
    const spy = jest
      .spyOn(prisma.analytics, 'findMany')
      .mockResolvedValueOnce([] as any);

    const start = new Date('2024-01-01');
    const end = new Date('2024-02-01');
    const res = await service.getAnalytics('video', 'v1', start, end);

    expect(res).toEqual([]);
    const arg = spy.mock.calls[0][0];
    expect(arg.where.entity_type).toBe('video');
    expect(arg.where.entity_id).toBe('v1');
    expect(arg.where.date.gte).toEqual(start);
    expect(arg.where.date.lte).toEqual(end);
    expect(arg.orderBy).toEqual({ date: 'desc' });
  });
});

