'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { parseKeytoolOutput } = require('./androidKeystoreInspect.cjs');
const { PLAY_UPLOAD } = require('./androidSigningPolicy.cjs');

describe('androidKeystoreInspect', () => {
  it('parse la sortie keytool Temurin FR (SHA 1 avec espace)', () => {
    const sample = `
Empreintes du certificat :
\t SHA 1: FA:AC:66:8E:22:5E:54:4A:9D:B9:A4:66:EE:81:D4:5F:4C:3E:DE:AF
\t SHA 256: 15:FF:A7:4A:6B:C4:E1:FB:29:B8:68:1C:4C:F8:BD:A7:D6:DD:48:CD:BE:76:97:E6:FA:33:0F:9B:AF:DC:92:6B
`;
    const parsed = parseKeytoolOutput(sample);
    assert.equal(parsed.sha1, PLAY_UPLOAD.sha1);
    assert.equal(parsed.sha256, PLAY_UPLOAD.sha256);
  });
});
