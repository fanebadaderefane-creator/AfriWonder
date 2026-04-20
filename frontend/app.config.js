/**
 * Surcharge dynamique : `app.json` ne peut pas interpoler les variables d'environnement.
 * Définissez EXPO_PUBLIC_EAS_PROJECT_ID (UUID du projet sur expo.dev) dans `.env` / EAS Secrets.
 */
const fs = require('fs');
const path = require('path');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

module.exports = ({ config }) => {
  const raw = process.env.EXPO_PUBLIC_EAS_PROJECT_ID?.trim().replace(/^['"]|['"]$/g, '') ?? '';
  const projectId = UUID_RE.test(raw) ? raw : config.extra?.eas?.projectId;

  const googleServicesPath = path.join(__dirname, 'google-services.json');
  const googleServiceInfoPath = path.join(__dirname, 'GoogleService-Info.plist');
  const android = { ...(config.android || {}) };
  const ios = { ...(config.ios || {}) };
  if (fs.existsSync(googleServicesPath)) {
    android.googleServicesFile = './google-services.json';
  }
  if (fs.existsSync(googleServiceInfoPath)) {
    ios.googleServicesFile = './GoogleService-Info.plist';
  }

  return {
    ...config,
    android,
    ios,
    extra: {
      ...config.extra,
      ...(projectId
        ? {
            eas: {
              ...(config.extra?.eas || {}),
              projectId,
            },
          }
        : {}),
    },
    updates: {
      ...(config.updates || {}),
      ...(projectId ? { url: `https://u.expo.dev/${projectId}` } : {}),
    },
  };
};
