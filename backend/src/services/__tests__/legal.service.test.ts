import { describe, it, expect, beforeEach, jest } from '@jest/globals';

describe('legal.service', () => {
  let prisma: any;
  let service: any;

  beforeEach(async () => {
    jest.resetModules();
    const prismaMod = await import('../../config/database.js');
    prisma = prismaMod.default;
    const mod = await import('../legal.service.js');
    service = mod.default;
    jest.restoreAllMocks();
  });

  it('getActiveDocument renvoie le document actif ou lève une erreur', async () => {
    const doc = { id: 'd1', type: 'privacy_policy', language: 'fr', is_active: true };
    const spy = jest
      .spyOn(prisma.legalDocument, 'findFirst')
      .mockResolvedValueOnce(doc as any);

    const res = await service.getActiveDocument('privacy_policy', 'fr');

    expect(res).toBe(doc);
    expect(spy).toHaveBeenCalledWith({
      where: { type: 'privacy_policy', language: 'fr', is_active: true },
      orderBy: { effective_date: 'desc' },
    });

    spy.mockResolvedValueOnce(null);
    await expect(service.getActiveDocument('terms_of_service', 'fr')).rejects.toThrow(
      /No active terms_of_service document found/i,
    );
  });

  it('getDocumentHistory renvoie la liste des versions', async () => {
    const spy = jest
      .spyOn(prisma.legalDocument, 'findMany')
      .mockResolvedValueOnce([] as any);

    const res = await service.getDocumentHistory('privacy_policy', 'fr');

    expect(res).toEqual([]);
    expect(spy).toHaveBeenCalledWith({
      where: { type: 'privacy_policy', language: 'fr' },
      orderBy: { effective_date: 'desc' },
      select: {
        id: true,
        version: true,
        title: true,
        effective_date: true,
        created_at: true,
        is_active: true,
      },
    });
  });

  it('getDocumentById renvoie un document ou lève une erreur', async () => {
    const spy = jest
      .spyOn(prisma.legalDocument, 'findUnique')
      .mockResolvedValueOnce({ id: 'd1' } as any);

    const doc = await service.getDocumentById('d1');
    expect(doc.id).toBe('d1');

    spy.mockResolvedValueOnce(null);
    await expect(service.getDocumentById('d2')).rejects.toThrow(/Document not found/i);
  });

  it('createDocument échoue si la version existe déjà', async () => {
    jest
      .spyOn(prisma.legalDocument, 'findUnique')
      .mockResolvedValueOnce({ id: 'existing' } as any);

    await expect(
      service.createDocument({
        type: 'privacy_policy',
        version: '1.0',
        language: 'fr',
        title: 'Politique de confidentialité',
        content: '...',
        effectiveDate: new Date(),
        createdBy: 'admin',
      }),
    ).rejects.toThrow(/already exists/i);
  });

  it('createDocument crée un nouveau document quand la version est nouvelle', async () => {
    const findSpy = jest
      .spyOn(prisma.legalDocument, 'findUnique')
      .mockResolvedValueOnce(null);
    const createSpy = jest
      .spyOn(prisma.legalDocument, 'create')
      .mockResolvedValueOnce({ id: 'new' } as any);

    const data = {
      type: 'privacy_policy',
      version: '1.1',
      language: 'fr',
      title: 'Politique v1.1',
      content: '...',
      effectiveDate: new Date(),
      createdBy: 'admin',
    };
    const doc = await service.createDocument(data);

    expect(doc.id).toBe('new');
    expect(findSpy).toHaveBeenCalled();
    expect(createSpy).toHaveBeenCalledWith({
      data: {
        type: data.type,
        version: data.version,
        language: data.language,
        title: data.title,
        content: data.content,
        effective_date: data.effectiveDate,
        created_by: data.createdBy,
        is_active: false,
      },
    });
  });

  it('acceptDocument crée une acceptation et un consentLog quand pas encore accepté', async () => {
    jest
      .spyOn(prisma.legalDocument, 'findUnique')
      .mockResolvedValueOnce({
        id: 'doc-1',
        type: 'privacy_policy',
        version: '1.0',
      } as any);

    jest
      .spyOn(prisma.userLegalAcceptance, 'findFirst')
      .mockResolvedValueOnce(null);

    const createAcceptanceSpy = jest
      .spyOn(prisma.userLegalAcceptance, 'create')
      .mockResolvedValueOnce({ id: 'acc-1' } as any);

    const consentSpy = jest
      .spyOn(prisma.consentLog, 'create')
      .mockResolvedValueOnce({ id: 'log-1' } as any);

    const res = await service.acceptDocument({
      userId: 'user-1',
      documentId: 'doc-1',
      ipAddress: '1.2.3.4',
      userAgent: 'jest',
    });

    expect(res.id).toBe('acc-1');
    expect(createAcceptanceSpy).toHaveBeenCalled();
    expect(consentSpy).toHaveBeenCalled();
  });

  it('getUserAcceptances renvoie les acceptations avec document lié', async () => {
    const spy = jest
      .spyOn(prisma.userLegalAcceptance, 'findMany')
      .mockResolvedValueOnce([] as any);

    const res = await service.getUserAcceptances('user-1');

    expect(res).toEqual([]);
    expect(spy).toHaveBeenCalledWith({
      where: { user_id: 'user-1' },
      include: {
        document: {
          select: {
            type: true,
            version: true,
            title: true,
            language: true,
          },
        },
      },
      orderBy: { accepted_at: 'desc' },
    });
  });

  it('checkRequiredAcceptances retourne les documents manquants', async () => {
    // Simuler un document actif pour privacy_policy et aucun acceptance existante
    jest
      .spyOn(prisma.legalDocument, 'findFirst')
      .mockResolvedValueOnce({
        id: 'doc-privacy',
        type: 'privacy_policy',
        title: 'Politique',
        version: '1.0',
        effective_date: new Date(),
      } as any)
      .mockResolvedValueOnce(null); // pour terms_of_service -> pas de document

    jest
      .spyOn(prisma.userLegalAcceptance, 'findFirst')
      .mockResolvedValueOnce(null);

    const res = await service.checkRequiredAcceptances('user-1');

    expect(res.has_required).toBe(true);
    expect(res.documents.length).toBe(1);
    expect(res.documents[0].type).toBe('privacy_policy');
  });

  it('getAcceptanceStats calcule le taux à partir du totalUsers', async () => {
    jest
      .spyOn(prisma.user, 'count')
      .mockResolvedValueOnce(10 as any);

    jest
      .spyOn(prisma.legalDocument, 'findMany')
      .mockResolvedValueOnce([
        {
          id: 'doc-1',
          type: 'privacy_policy',
          version: '1.0',
          title: 'Politique',
          language: 'fr',
          _count: { acceptances: 5 },
        },
      ] as any);

    const stats = await service.getAcceptanceStats();

    expect(stats[0].acceptance_count).toBe(5);
    expect(stats[0].acceptance_rate).toBe('50.00');
  });

  it('getLegalEntityInfo renvoie des valeurs par défaut quand aucun enregistrement', async () => {
    jest
      .spyOn(prisma.legalEntityInfo, 'findFirst')
      .mockResolvedValueOnce(null);

    const info = await service.getLegalEntityInfo();

    expect(info.company_name).toBe('AfriWonder');
    expect(info.email).toBe('legal@afriwonder.app');
  });

  it('updateLegalEntityInfo met à jour quand un enregistrement existe', async () => {
    jest
      .spyOn(prisma.legalEntityInfo, 'findFirst')
      .mockResolvedValueOnce({ id: 'info-1' } as any);

    const updateSpy = jest
      .spyOn(prisma.legalEntityInfo, 'update')
      .mockResolvedValueOnce({ id: 'info-1', company_name: 'New' } as any);

    const res = await service.updateLegalEntityInfo({ company_name: 'New' });

    expect(updateSpy).toHaveBeenCalledWith({
      where: { id: 'info-1' },
      data: { company_name: 'New' },
    });
    expect(res.company_name).toBe('New');
  });
});

