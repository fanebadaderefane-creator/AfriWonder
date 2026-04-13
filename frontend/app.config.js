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
  const android = { ...(config.android || {}) };
  if (fs.existsSync(googleServicesPath)) {
    android.googleServicesFile = './google-services.json';
  }

  return {
    ...config,
    android,
    extra: {
      ...config.extra,
      eas: {
        ...(config.extra?.eas || {}),
        projectId: projectId || '00000000-0000-4000-8000-000000000000',
      },
    },
    updates: {
      ...(config.updates || {}),
      ...(projectId ? { url: `https://u.expo.dev/${projectId}` } : {}),
    },
  };
};
