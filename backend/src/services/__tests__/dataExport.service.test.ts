import { describe, it, expect, beforeEach, jest } from '@jest/globals';

describe('dataExport.service', () => {
  let prisma: any;
  let service: any;

  beforeEach(async () => {
    jest.resetModules();
    const prismaMod = await import('../../config/database.js');
    prisma = prismaMod.default;
    const mod = await import('../dataExport.service.js');
    service = mod.default;
    jest.restoreAllMocks();
  });

  it('createExportRequest crée la demande et déclenche processExport en arrière-plan', async () => {
    const createSpy = jest
      .spyOn(prisma.dataExportRequest, 'create')
      .mockResolvedValueOnce({ id: 'req-1', user_id: 'u1', format: 'json' } as any);

    const processSpy = jest
      .spyOn<any, any>(service as any, 'processExport')
      .mockResolvedValueOnce(undefined);

    const req = await service.createExportRequest('u1', 'json', '1.2.3.4');

    expect(req.id).toBe('req-1');
    expect(createSpy).toHaveBeenCalledWith({
      data: {
        user_id: 'u1',
        format: 'json',
        status: 'pending',
        ip_address: '1.2.3.4',
      },
    });
    expect(processSpy).toHaveBeenCalledWith('req-1');
  });

  it('getExportRequest renvoie la demande pour un utilisateur', async () => {
    jest
      .spyOn(prisma.dataExportRequest, 'findFirst')
      .mockResolvedValueOnce({ id: 'req-2', user_id: 'u1' } as any);

    const req = await service.getExportRequest('req-2', 'u1');

    expect(req.id).toBe('req-2');
  });

  it('getUserExportRequests renvoie les demandes triées', async () => {
    const requests = [{ id: 'r1' }, { id: 'r2' }];

    const findSpy = jest
      .spyOn(prisma.dataExportRequest, 'findMany')
      .mockResolvedValueOnce(requests as any);

    const res = await service.getUserExportRequests('u1');

    expect(res).toBe(requests);
    expect(findSpy).toHaveBeenCalled();
  });

  it('getExportFilePath construit le chemin correctement', async () => {
    const path = service.getExportFilePath('req-3');
    expect(path).toContain('exports');
    expect(path).toContain('req-3.json');
  });
});

