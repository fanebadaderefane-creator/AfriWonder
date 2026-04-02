/**
 * Tests unitaires pour ExchangeRateService
 * (en se basant sur le vrai client Prisma, mais en espionnant ses méthodes)
 */
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

describe('ExchangeRateService', () => {
  let prisma: any;
  let service: any;

  beforeEach(async () => {
    jest.resetModules();
    const prismaMod = await import('../../config/database.js');
    prisma = prismaMod.default;
    const mod = await import('../exchangeRate.service.js');
    service = mod.default;

    // Nettoyer les mocks éventuels
    jest.restoreAllMocks();
  });

  it('getRate retourne 1 quand devises identiques', async () => {
    const spy = jest.spyOn(prisma.exchangeRate, 'findUnique');
    const rate = await service.getRate('XOF', 'XOF');
    expect(rate).toBe(1);
    expect(spy).not.toHaveBeenCalled();
  });

  it('getRate retourne le taux direct si présent', async () => {
    const spy = jest
      .spyOn(prisma.exchangeRate, 'findUnique')
      .mockResolvedValueOnce({ rate: 2 });

    const rate = await service.getRate('EUR', 'USD');
    expect(rate).toBe(2);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('getRate utilise le taux inverse si direct absent', async () => {
    const spy = jest
      .spyOn(prisma.exchangeRate, 'findUnique')
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ rate: 4 });

    const rate = await service.getRate('USD', 'EUR');
    expect(rate).toBeCloseTo(1 / 4);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('getRate utilise taux EUR/XOF par défaut', async () => {
    jest.spyOn(prisma.exchangeRate, 'findUnique').mockResolvedValue(null);

    const eurToXof = await service.getRate('EUR', 'XOF');
    const xofToEur = await service.getRate('XOF', 'EUR');

    expect(eurToXof).toBeCloseTo(655.957);
    expect(xofToEur).toBeCloseTo(1 / 655.957);
  });

  it('convert applique le taux et arrondi à 2 décimales', async () => {
    jest
      .spyOn(prisma.exchangeRate, 'findUnique')
      .mockResolvedValueOnce({ rate: 1.2345 });

    const result = await service.convert(100, 'EUR', 'USD');
    expect(result).toBeCloseTo(123.45);
  });

  it('getAllRates crée un taux par défaut quand la table est vide', async () => {
    const eurRow = { from_currency: 'EUR', to_currency: 'XOF', rate: 655.957 };
    const allRows = [
      eurRow,
      { from_currency: 'XOF', to_currency: 'NGN', rate: 2.52 },
      { from_currency: 'XOF', to_currency: 'KES', rate: 0.19 },
    ];
    const findManySpy = jest
      .spyOn(prisma.exchangeRate, 'findMany')
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([eurRow])
      .mockResolvedValue(allRows);

    jest.spyOn(prisma.exchangeRate, 'findUnique').mockResolvedValue(null);

    const upsertSpy = jest.spyOn(prisma.exchangeRate, 'upsert').mockResolvedValue({} as any);

    const rates = await service.getAllRates();

    expect(upsertSpy.mock.calls.length).toBeGreaterThanOrEqual(1);
    expect(findManySpy).toHaveBeenCalled();
    expect(rates.length).toBeGreaterThanOrEqual(1);
  });

  it('convertProductPrice réutilise convert avec devise par défaut', async () => {
    const spy = jest.spyOn(service, 'convert');
    await service.convertProductPrice(1000, 'XOF', 'EUR');
    expect(spy).toHaveBeenCalledWith(1000, 'XOF', 'EUR');
  });
});

