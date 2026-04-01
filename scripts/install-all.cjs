const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const root = path.resolve(__dirname, '..');
const OPTIONAL_TIMEOUT_MS = 120000;

function run(cmd, cwd, optional = false) {
  const opts = { cwd: cwd || root, stdio: 'inherit', shell: true };
  if (optional) opts.timeout = OPTIONAL_TIMEOUT_MS;
  try {
    execSync(cmd, opts);
  } catch (e) {
    if (!optional) throw e;
  }
}

run('npm install', root);
run('npm install', path.join(root, 'backend'));
const flutterAppDir = path.join(root, 'flutter_app');
if (fs.existsSync(path.join(flutterAppDir, 'pubspec.yaml'))) {
  run('flutter pub get', flutterAppDir, true);
}
