'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  classifySha1,
  fingerprintMatches,
  isAllowedForProduction,
  isRequiredProdAabSigning,
  isRequiredPlayUploadSigning,
  isAllowedForPlayStoreUpload,
  normalizeFingerprint,
  PLAY_UPLOAD,
  PROD_APP_SIGNING,
} = require('./androidSigningPolicy.cjs');

describe('androidSigningPolicy', () => {
  it('normalise les empreintes', () => {
    assert.equal(normalizeFingerprint('85a5af2952742f0e'), '85:A5:AF:29:52:74:2F:0E');
    assert.equal(
      fingerprintMatches(
        '85:A5:AF:29:52:74:2F:0E:AE:D9:22:77:16:FB:29:CB:4A:AF:A8:CF',
        PROD_APP_SIGNING.sha1,
      ),
      true,
    );
  });

  it('identifie prod app et upload Play', () => {
    assert.equal(classifySha1(PROD_APP_SIGNING.sha1).kind, 'prod-app');
    assert.equal(classifySha1(PLAY_UPLOAD.sha1).kind, 'play-upload');
  });

  it('bloque la clé EAS auto-générée', () => {
    assert.equal(
      classifySha1('E9:26:B0:F2:F9:D0:7D:0F:50:28:49:1B:6A:5C:49:B3:0F:FE:5F:58').kind,
      'blocked',
    );
    assert.equal(
      isAllowedForProduction('E9:26:B0:F2:F9:D0:7D:0F:50:28:49:1B:6A:5C:49:B3:0F:FE:5F:58'),
      false,
    );
  });

  it('accepte prod app et upload pour production', () => {
    assert.equal(isAllowedForProduction(PROD_APP_SIGNING.sha1), true);
    assert.equal(isAllowedForProduction(PLAY_UPLOAD.sha1), true);
  });

  it('AAB production exige la clé upload Play (FA:AC:66…)', () => {
    assert.equal(isRequiredPlayUploadSigning(PLAY_UPLOAD.sha1), true);
    assert.equal(isRequiredProdAabSigning(PLAY_UPLOAD.sha1), true);
    assert.equal(isRequiredProdAabSigning(PROD_APP_SIGNING.sha1), false);
    assert.equal(isRequiredProdAabSigning('E9:26:B0:F2:F9:D0:7D:0F:50:28:49:1B:6A:5C:49:B3:0F:FE:5F:58'), false);
    assert.equal(isAllowedForPlayStoreUpload(PLAY_UPLOAD.sha1), true);
    assert.equal(isAllowedForPlayStoreUpload(PROD_APP_SIGNING.sha1), false);
  });
});
