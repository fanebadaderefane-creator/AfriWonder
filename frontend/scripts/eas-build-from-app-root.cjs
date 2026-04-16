'use strict';

/**
 * Monorepo: EAS archives from the git repository root by default, which uploads backend/PWA/etc.
 * With EAS_NO_VCS + EAS_PROJECT_ROOT set to this app folder, the archive is only `frontend/`
 * and respects `frontend/.easignore` (see https://expo.fyi/eas-build-archive).
 */
const { spawnSync } = require('child_process');
const path = require('path');

const appRoot = path.resolve(__dirname, '..');
process.env.EAS_NO_VCS = '1';
process.env.EAS_PROJECT_ROOT = appRoot;

const passthrough = process.argv.slice(2);
const easArgs = ['build', ...passthrough];

const result = spawnSync('eas', easArgs, {
  cwd: appRoot,
  stdio: 'inherit',
  env: process.env,
  shell: process.platform === 'win32',
});

if (result.error) {
  console.error(result.error);
  process.exit(1);
}
process.exit(result.status === null ? 1 : result.status);
