'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Lit versionCode Android et buildNumber iOS depuis app.json (source locale EAS).
 */
function readMobileVersionsFromAppJson(appJsonPath) {
  const raw = fs.readFileSync(appJsonPath, 'utf8');
  const json = JSON.parse(raw);
  const androidCode = json?.expo?.android?.versionCode ?? json?.android?.versionCode;
  const iosBuild = json?.expo?.ios?.buildNumber ?? json?.ios?.buildNumber;
  const android =
    typeof androidCode === 'number' && Number.isFinite(androidCode) && androidCode > 0
      ? Math.floor(androidCode)
      : null;
  const iosRaw = parseInt(String(iosBuild ?? ''), 10);
  const ios = Number.isFinite(iosRaw) && iosRaw > 0 ? iosRaw : null;
  return { android, ios };
}

function defaultAppJsonPath(frontendRoot) {
  return path.join(frontendRoot, 'app.json');
}

module.exports = {
  readMobileVersionsFromAppJson,
  defaultAppJsonPath,
};
