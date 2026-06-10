'use strict';

/**
 * Notifee core declares ForegroundService with foregroundServiceType="shortService" only.
 * startActiveCallForeground() requests microphone (and camera for video) — Android 14+
 * crashes if the runtime type is not declared on the service element.
 */
const { withAndroidManifest } = require('@expo/config-plugins');

const NOTIFEE_FG_SERVICE = 'app.notifee.core.ForegroundService';
const NOTIFEE_FG_TYPES = 'microphone|camera|shortService';

const FOREGROUND_SERVICE_PERMISSIONS = [
  'android.permission.FOREGROUND_SERVICE_MICROPHONE',
  'android.permission.FOREGROUND_SERVICE_CAMERA',
];

/**
 * @param {Record<string, unknown>} manifest
 * @param {string} permission
 */
function ensureUsesPermission(manifest, permission) {
  manifest['uses-permission'] = manifest['uses-permission'] ?? [];
  const list = manifest['uses-permission'];
  if (list.some((item) => item.$?.['android:name'] === permission)) {
    return;
  }
  list.push({ $: { 'android:name': permission } });
}

/** @param {import('@expo/config-plugins').ExpoConfig} config */
module.exports = function withAndroidNotifeeForegroundService(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    manifest.$ = manifest.$ ?? {};
    manifest.$['xmlns:tools'] = manifest.$['xmlns:tools'] ?? 'http://schemas.android.com/tools';

    for (const permission of FOREGROUND_SERVICE_PERMISSIONS) {
      ensureUsesPermission(manifest, permission);
    }

    const application = manifest.application?.[0];
    if (!application) {
      return cfg;
    }

    application.service = application.service ?? [];
    const services = application.service;
    const existing = services.find((item) => item.$?.['android:name'] === NOTIFEE_FG_SERVICE);
    if (existing) {
      existing.$['android:foregroundServiceType'] = NOTIFEE_FG_TYPES;
      existing.$['tools:replace'] = 'android:foregroundServiceType';
      return cfg;
    }

    services.push({
      $: {
        'android:name': NOTIFEE_FG_SERVICE,
        'android:exported': 'false',
        'android:foregroundServiceType': NOTIFEE_FG_TYPES,
        'tools:replace': 'android:foregroundServiceType',
      },
    });
    return cfg;
  });
};
