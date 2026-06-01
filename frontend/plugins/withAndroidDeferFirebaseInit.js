'use strict';

/**
 * Évite le dialogue système « Check that Google Play is enabled » au cold start :
 * Firebase/FCM ne s'initialise plus avant le JS ; le token push n'est demandé
 * qu'après `isGoogleMobileServicesReady()` côté app.
 */
const { withAndroidManifest } = require('@expo/config-plugins');

/** @type {Array<[string, string]>} */
const META_ENTRIES = [
  ['firebase_messaging_auto_init_enabled', 'false'],
  ['firebase_analytics_collection_enabled', 'false'],
  ['google_analytics_automatic_screen_reporting_enabled', 'false'],
];

/**
 * @param {Record<string, unknown>} application
 * @param {string} name
 * @param {string} value
 */
function upsertMetaData(application, name, value) {
  application['meta-data'] = application['meta-data'] ?? [];
  const list = application['meta-data'];
  const idx = list.findIndex((item) => item.$?.['android:name'] === name);
  const entry = { $: { 'android:name': name, 'android:value': value } };
  if (idx >= 0) {
    list[idx] = entry;
  } else {
    list.push(entry);
  }
}

/** @param {import('@expo/config-plugins').ExpoConfig} config */
module.exports = function withAndroidDeferFirebaseInit(config) {
  return withAndroidManifest(config, (cfg) => {
    const application = cfg.modResults.manifest.application?.[0];
    if (!application) return cfg;
    for (const [name, value] of META_ENTRIES) {
      upsertMetaData(application, name, value);
    }
    return cfg;
  });
};
