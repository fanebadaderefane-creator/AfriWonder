/**
 * Demande un heap Java plus large (comme beaucoup d'apps vidéo) — réduit les kills OOM Android.
 */
const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withAndroidLargeHeap(config) {
  return withAndroidManifest(config, (cfg) => {
    const app = cfg.modResults.manifest.application?.[0];
    if (!app) return cfg;
    app.$ = app.$ ?? {};
    app.$['android:largeHeap'] = 'true';
    return cfg;
  });
};
