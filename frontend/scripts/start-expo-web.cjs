'use strict';

const { spawnSync } = require('child_process');
const path = require('path');

const appRoot = path.resolve(__dirname, '..');
const expoArgs = ['start', '--web', '--host', 'lan', '--port', '3001', ...process.argv.slice(2)];

process.env.EXPO_NO_TELEMETRY = '1';

const result = spawnSync('expo', expoArgs, {
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
