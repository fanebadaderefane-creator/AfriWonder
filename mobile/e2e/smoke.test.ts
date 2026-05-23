/// <reference types="detox/globals" />

describe('AfriWonder smoke (Detox)', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  it('affiche l’écran d’accueil', async () => {
    await expect(element(by.id('afw-home-root'))).toBeVisible();
    await expect(element(by.id('afw-title'))).toBeVisible();
  });
});
