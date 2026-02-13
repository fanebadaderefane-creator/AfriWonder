/**
 * Unit tests - Ads Service CDC Phase 1
 * Tests sans mock DB (utilise les fonctions pures)
 */
import { describe, it, expect, jest } from '@jest/globals';
import { adsService, AD_PRICING_BY_DURATION } from '../src/services/ads.service.js';

describe('Ads Service (unit)', () => {
  describe('getPriceForDuration', () => {
    it('retourne le prix pour 1 jour', () => {
      expect(adsService.getPriceForDuration(1)).toBe(2000);
    });
    it('retourne le prix pour 7 jours', () => {
      expect(adsService.getPriceForDuration(7)).toBe(10000);
    });
    it('retourne le prix pour 30 jours', () => {
      expect(adsService.getPriceForDuration(30)).toBe(35000);
    });
    it('retourne le prix pour 90 jours', () => {
      expect(adsService.getPriceForDuration(90)).toBe(85000);
    });
    it('retourne 0 pour durée invalide', () => {
      expect(adsService.getPriceForDuration(2)).toBe(0);
    });
  });

  describe('AD_PRICING_BY_DURATION', () => {
    it('contient toutes les durées CDC', () => {
      expect(AD_PRICING_BY_DURATION[1]).toBe(2000);
      expect(AD_PRICING_BY_DURATION[3]).toBe(5000);
      expect(AD_PRICING_BY_DURATION[7]).toBe(10000);
      expect(AD_PRICING_BY_DURATION[14]).toBe(18000);
      expect(AD_PRICING_BY_DURATION[30]).toBe(35000);
      expect(AD_PRICING_BY_DURATION[60]).toBe(60000);
      expect(AD_PRICING_BY_DURATION[90]).toBe(85000);
    });
  });

  describe('createCampaign (validation)', () => {
    it('rejette durée invalide', async () => {
      await expect(
        adsService.createCampaign({
          advertiser_id: 'user-1',
          name: 'Test',
          duration_days: 2,
        })
      ).rejects.toThrow('Durée invalide');
    });
  });

  describe('expireCampaigns', () => {
    it('retourne le nombre de campagnes expirées', async () => {
      const { default: prisma } = await import('../src/config/database.js');
      const updateManySpy = jest.spyOn(prisma.adCampaign, 'updateMany').mockResolvedValueOnce({ count: 2 } as any);

      const count = await adsService.expireCampaigns();

      expect(count).toBe(2);
      expect(updateManySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'active',
            ends_at: expect.any(Object),
          }),
          data: { status: 'expired' },
        })
      );
    });
  });
});
