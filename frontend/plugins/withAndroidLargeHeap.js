/**
 * Demande un heap Java plus large (comme beaucoup d'apps vidéo) — réduit les kills OOM Android.
 */
const { withAndroidManifest, AndroidConfig } = require('@expo/config-plugins');

module.exports = function withAndroidLargeHeap(config) {
  return withAndroidManifest(config, (cfg) => {
    const app = AndroidConfig.getMainApplicationOrThrow(cfg.modResults);
    app.$['android:largeHeap'] = 'true';
    return cfg;
  });
};
