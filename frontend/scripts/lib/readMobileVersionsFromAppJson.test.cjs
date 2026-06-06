'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { readMobileVersionsFromAppJson } = require('./readMobileVersionsFromAppJson.cjs');

test('readMobileVersionsFromAppJson lit expo.android.versionCode et expo.ios.buildNumber', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'afw-appjson-'));
  const file = path.join(dir, 'app.json');
  fs.writeFileSync(
    file,
    JSON.stringify({
      expo: {
        android: { versionCode: 25 },
        ios: { buildNumber: '3' },
      },
    }),
  );
  assert.deepEqual(readMobileVersionsFromAppJson(file), { android: 25, ios: 3 });
});

test('readMobileVersionsFromAppJson retourne null si versions absentes', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'afw-appjson-'));
  const file = path.join(dir, 'app.json');
  fs.writeFileSync(file, JSON.stringify({ expo: { android: {}, ios: {} } }));
  assert.deepEqual(readMobileVersionsFromAppJson(file), { android: null, ios: null });
});
