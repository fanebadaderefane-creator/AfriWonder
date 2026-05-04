import { describe, it, expect } from 'vitest';
import {
  featureMatrix,
  getFeatureMatrix,
  validateSuperApp,
} from './featureMatrix';
import {
  evidenceAfricaAdapted,
  evidenceDataOptimized,
  evidenceMarketplace,
  evidenceMessaging,
  evidenceMobilePayment,
  evidenceOpenAuditable,
  evidenceSocial,
} from './featureEvidence';

describe('featureMatrix', () => {
  it('validateSuperApp() === Object.values(featureMatrix).every(Boolean) à l’import', () => {
    expect(validateSuperApp()).toBe(Object.values(featureMatrix).every((v) => v === true));
  });

  it('chaque evidence renvoie true dans ce dépôt', () => {
    expect(evidenceSocial()).toBe(true);
    expect(evidenceMarketplace()).toBe(true);
    expect(evidenceMobilePayment()).toBe(true);
    expect(evidenceMessaging()).toBe(true);
    expect(evidenceDataOptimized()).toBe(true);
    expect(evidenceAfricaAdapted()).toBe(true);
    expect(evidenceOpenAuditable()).toBe(true);
  });

  it('getFeatureMatrix() aligné avec les evidence', () => {
    const m = getFeatureMatrix();
    expect(m.social).toBe(evidenceSocial());
    expect(m.marketplace).toBe(evidenceMarketplace());
    expect(m.mobilePayment).toBe(evidenceMobilePayment());
    expect(m.messaging).toBe(evidenceMessaging());
    expect(m.dataOptimized).toBe(evidenceDataOptimized());
    expect(m.africaAdapted).toBe(evidenceAfricaAdapted());
    expect(m.openAuditable).toBe(evidenceOpenAuditable());
  });
});
