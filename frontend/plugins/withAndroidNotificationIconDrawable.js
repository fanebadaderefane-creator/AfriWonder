'use strict';

/**
 * Garantit @drawable/notification_icon dans l’APK — requis par Notifee FGS appel actif.
 * Sans ce drawable, Android lève « Invalid notification (no valid small icon) » et tue l’app.
 */
const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const DRAWABLE_FILE = 'notification_icon.png';
const SOURCE_CANDIDATES = [
  'assets/images/android-notification-icon.png',
  'assets/images/icon.png',
  'assets/images/pwa-icon-192.png',
];
const DENSITY_FOLDERS = [
  'drawable-mdpi',
  'drawable-hdpi',
  'drawable-xhdpi',
  'drawable-xxhdpi',
  'drawable-xxxhdpi',
  'drawable',
];

/**
 * @param {string} projectRoot
 * @param {string} resRoot
 */
function copyNotificationIcon(projectRoot, resRoot) {
  const source = SOURCE_CANDIDATES.map((rel) => path.join(projectRoot, rel)).find((abs) =>
    fs.existsSync(abs),
  );
  if (!source) {
    console.warn(
      '[withAndroidNotificationIconDrawable] Aucune icône source — risque crash Notifee FGS',
    );
    return false;
  }
  for (const folder of DENSITY_FOLDERS) {
    const dir = path.join(resRoot, folder);
    fs.mkdirSync(dir, { recursive: true });
    fs.copyFileSync(source, path.join(dir, DRAWABLE_FILE));
  }
  return true;
}

/** @param {import('@expo/config-plugins').ExpoConfig} config */
module.exports = function withAndroidNotificationIconDrawable(config) {
  return withDangerousMod(config, [
    'android',
    async (cfg) => {
      const projectRoot = cfg.modRequest.projectRoot;
      const resRoot = path.join(projectRoot, 'android', 'app', 'src', 'main', 'res');
      copyNotificationIcon(projectRoot, resRoot);
      return cfg;
    },
  ]);
};
