'use strict';

/**
 * Politique de signature Android AfriWonder — ne pas modifier sans ticket.
 *
 * Deux certificats distincts (Play App Signing) :
 * - PROD_APP_SIGNING (85:A5:AF…) : FBF-GLOBAL / FANE ABDOULAYE — Firebase, OAuth, certificat app Play.
 * - PLAY_UPLOAD (FA:AC:66…) : clé de DÉPÔT — signer l'AAB avant upload Play Console.
 */
const PROD_APP_SIGNING = {
  label: 'prod FBF-GLOBAL (FANE ABDOULAYE)',
  sha1: '85:A5:AF:29:52:74:2F:0E:AE:D9:22:77:16:FB:29:CB:4A:AF:A8:CF',
  sha256: 'D5:E0:38:36:22:57:3F:9F:A6:A0:5B:30:2F:2E:29:B6:28:B0:F0:BF:77:92:33:D4:1E:0B:BF:85:E8:1B:09:16',
};

/** Clé de téléversement enregistrée dans Google Play Console (AAB upload — capture juin 2026). */
const PLAY_UPLOAD = {
  label: 'Play Console — clé de téléversement',
  sha1: 'FA:AC:66:8E:22:5E:54:4A:9D:B9:A4:66:EE:81:D4:5F:4C:3E:DE:AF',
  sha256: '15:FF:A7:4A:6B:C4:E1:FB:29:B8:68:1C:4C:F8:BD:A7:D6:DD:48:CD:BE:76:97:E6:FA:33:0F:9B:AF:DC:92:6B',
};

/** @deprecated alias — même clé que PLAY_UPLOAD */
const PLAY_UPLOAD_LEGACY = PLAY_UPLOAD;

/** Clés interdites — refusent le build avant envoi Play. */
const BLOCKED = [
  {
    label: 'EAS auto-générée (nouvelle org / mauvais sync)',
    sha1: 'E9:26:B0:F2:F9:D0:7D:0F:50:28:49:1B:6A:5C:49:B3:0F:FE:5F:58',
  },
];

const ALLOWED_PRODUCTION_SHA1 = [PLAY_UPLOAD.sha1, PROD_APP_SIGNING.sha1];

function normalizeFingerprint(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^0-9A-F]/g, '')
    .replace(/(.{2})(?=.)/g, '$1:')
    .replace(/:$/, '');
}

function fingerprintMatches(actual, expected) {
  return normalizeFingerprint(actual) === normalizeFingerprint(expected);
}

function classifySha1(sha1) {
  const normalized = normalizeFingerprint(sha1);
  if (fingerprintMatches(normalized, PROD_APP_SIGNING.sha1)) {
    return { kind: 'prod-app', ...PROD_APP_SIGNING, sha1: normalized };
  }
  if (fingerprintMatches(normalized, PLAY_UPLOAD.sha1)) {
    return { kind: 'play-upload', ...PLAY_UPLOAD, sha1: normalized };
  }
  for (const blocked of BLOCKED) {
    if (fingerprintMatches(normalized, blocked.sha1)) {
      return { kind: 'blocked', ...blocked, sha1: normalized };
    }
  }
  return { kind: 'unknown', sha1: normalized };
}

function isAllowedForProduction(sha1) {
  const info = classifySha1(sha1);
  if (info.kind === 'blocked') return false;
  return ALLOWED_PRODUCTION_SHA1.some((expected) => fingerprintMatches(sha1, expected));
}

/** Gate AAB production — exige la clé upload Play (FA:AC:66…) enregistrée dans la console. */
function isRequiredPlayUploadSigning(sha1) {
  return fingerprintMatches(sha1, PLAY_UPLOAD.sha1);
}

/** Gate AAB — alias historique ; vérifie la clé upload Play, pas le certificat app FBF-GLOBAL. */
function isRequiredProdAabSigning(sha1) {
  return isRequiredPlayUploadSigning(sha1);
}

function isAllowedForPlayStoreUpload(sha1) {
  return isRequiredPlayUploadSigning(sha1);
}

module.exports = {
  PROD_APP_SIGNING,
  PLAY_UPLOAD,
  PLAY_UPLOAD_LEGACY,
  BLOCKED,
  ALLOWED_PRODUCTION_SHA1,
  normalizeFingerprint,
  fingerprintMatches,
  classifySha1,
  isAllowedForProduction,
  isRequiredPlayUploadSigning,
  isRequiredProdAabSigning,
  isAllowedForPlayStoreUpload,
};
