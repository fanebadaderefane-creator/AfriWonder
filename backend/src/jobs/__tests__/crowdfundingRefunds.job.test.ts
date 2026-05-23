import { describe, it, expect, beforeEach, jest } from '@jest/globals';

describe('crowdfundingRefunds.job', () => {
  let svc: { processDueFailedCampaignRefunds: ReturnType<typeof jest.fn> };
  let mod: { processCrowdfundingFailedRefundsOnce: () => Promise<unknown> };

  beforeEach(async () => {
    jest.resetModules();
    svc = (await import('../../services/crowdfunding.service.js')).default as any;
    jest.spyOn(svc, 'processDueFailedCampaignRefunds').mockResolvedValue({
      candidates: 0,
      refunded: 0,
      notRefunded: 0,
    });
    mod = await import('../crowdfundingRefunds.job.js');
  });

  it('processCrowdfundingFailedRefundsOnce délègue au service', async () => {
    const r = await mod.processCrowdfundingFailedRefundsOnce();
    expect(svc.processDueFailedCampaignRefunds).toHaveBeenCalled();
    expect(r).toMatchObject({ refunded: 0, candidates: 0 });
  });
});
