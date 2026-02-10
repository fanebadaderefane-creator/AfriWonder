import { describe, it, expect, beforeEach, jest } from '@jest/globals';

describe('supportTicket.service', () => {
  let prisma: any;
  let service: any;

  beforeEach(async () => {
    jest.resetModules();
    const prismaMod = await import('../../config/database.js');
    prisma = prismaMod.default;
    const mod = await import('../supportTicket.service.js');
    service = mod.default;
    jest.restoreAllMocks();
  });

  it('create crée un ticket et un premier message optionnel', async () => {
    const createdTicket = { id: 't1', user_id: 'u1', subject: 'Help' };
    const ticketSpy = jest
      .spyOn(prisma.supportTicket, 'create')
      .mockResolvedValueOnce(createdTicket as any);

    const msgSpy = jest
      .spyOn(prisma.supportMessage, 'create')
      .mockResolvedValueOnce({ id: 'm1' } as any);

    const getSpy = jest
      .spyOn(service, 'getById')
      .mockResolvedValueOnce({ id: 't1' } as any);

    const res = await service.create('u1', 'Help', 'Bonjour');

    expect(ticketSpy).toHaveBeenCalled();
    expect(msgSpy).toHaveBeenCalled();
    expect(getSpy).toHaveBeenCalledWith('t1', 'u1', false);
    expect(res.id).toBe('t1');
  });

  it('getById lève 404 si ticket inexistant', async () => {
    jest
      .spyOn(prisma.supportTicket, 'findUnique')
      .mockResolvedValueOnce(null);

    await expect(service.getById('t1', 'u1', false)).rejects.toThrow(/Ticket non trouvé/i);
  });

  it('getById lève 403 si utilisateur non admin et non propriétaire', async () => {
    jest
      .spyOn(prisma.supportTicket, 'findUnique')
      .mockResolvedValueOnce({ id: 't1', user_id: 'other' } as any);

    await expect(service.getById('t1', 'u1', false)).rejects.toThrow(/Non autorisé/i);
  });

  it('addMessage crée un message et met à jour le ticket', async () => {
    jest
      .spyOn(prisma.supportTicket, 'findUnique')
      .mockResolvedValueOnce({ id: 't1', user_id: 'u1', status: 'open' } as any);

    const msgSpy = jest
      .spyOn(prisma.supportMessage, 'create')
      .mockResolvedValueOnce({ id: 'm1' } as any);

    const updateSpy = jest
      .spyOn(prisma.supportTicket, 'update')
      .mockResolvedValueOnce({} as any);

    const res = await service.addMessage('t1', 'u1', 'Bonjour', false);

    expect(res.id).toBe('m1');
    expect(msgSpy).toHaveBeenCalled();
    expect(updateSpy).toHaveBeenCalled();
  });

  it('updateStatus refuse un statut invalide', async () => {
    await expect(service.updateStatus('t1', 'bad')).rejects.toThrow(/Statut invalide/i);
  });
});

