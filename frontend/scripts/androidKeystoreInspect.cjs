'use strict';

const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  classifySha1,
  isAllowedForProduction,
  isRequiredProdAabSigning,
  isAllowedForPlayStoreUpload,
  normalizeFingerprint,
  PLAY_UPLOAD,
  PROD_APP_SIGNING,
} = require('./androidSigningPolicy.cjs');

function readCredentials(appRoot) {
  const credPath = path.join(appRoot, 'credentials.json');
  if (!fs.existsSync(credPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(credPath, 'utf8'));
  } catch {
    return null;
  }
}

function resolveKeystoreConfig(appRoot, credOverride) {
  const cred = credOverride || readCredentials(appRoot);
  const rel = cred?.android?.keystore?.keystorePath || './android-keystore.jks';
  const jksPath = path.resolve(appRoot, rel);
  const keyAlias = cred?.android?.keystore?.keyAlias;
  const keystorePassword = cred?.android?.keystore?.keystorePassword;
  if (!fs.existsSync(jksPath) || !keyAlias || !keystorePassword) {
    return null;
  }
  return { jksPath, keyAlias, keystorePassword };
}

function resolveKeytoolCommand() {
  const candidates = [];
  if (process.env.JAVA_HOME) {
    candidates.push(path.join(process.env.JAVA_HOME, 'bin', process.platform === 'win32' ? 'keytool.exe' : 'keytool'));
  }
  if (process.platform === 'win32') {
    const scoopJdk = path.join(process.env.USERPROFILE || '', 'scoop', 'apps', 'temurin21-jdk', 'current', 'bin', 'keytool.exe');
    candidates.push(scoopJdk);
    candidates.push('C:\\Program Files\\Android\\Android Studio\\jbr\\bin\\keytool.exe');
  }
  candidates.push('keytool');
  for (const candidate of candidates) {
    if (candidate === 'keytool') return candidate;
    if (fs.existsSync(candidate)) return candidate;
  }
  return 'keytool';
}

function parseKeytoolOutput(text) {
  const sha1Match =
    text.match(/SHA[\s-]*1\s*:\s*([0-9A-Fa-f:]{27,})/i) ||
    text.match(/Empreinte SHA-1\s*:\s*([0-9A-Fa-f:]+)/i);
  const sha256Match =
    text.match(/SHA[\s-]*256\s*:\s*([0-9A-Fa-f:]{59,})/i) ||
    text.match(/Empreinte SHA-256\s*:\s*([0-9A-Fa-f:]+)/i);
  const ownerMatch = text.match(/(?:Owner|Propriétaire|Titulaire)\s*:\s*(.+)/i);
  return {
    sha1: sha1Match ? normalizeFingerprint(sha1Match[1]) : '',
    sha256: sha256Match ? normalizeFingerprint(sha256Match[1]) : '',
    owner: ownerMatch ? ownerMatch[1].trim() : '',
  };
}

function inspectKeystoreFile({ jksPath, keyAlias, keystorePassword }) {
  const keytool = resolveKeytoolCommand();
  const result = spawnSync(
    keytool,
    ['-list', '-v', '-keystore', jksPath, '-alias', keyAlias, '-storepass', keystorePassword],
    { encoding: 'utf8', shell: false, windowsHide: true },
  );
  const combined = `${result.stdout || ''}\n${result.stderr || ''}`.trim();
  if (result.status !== 0) {
    const err = combined || 'keytool a échoué';
    if (/password was incorrect|mot de passe incorrect|alias.*does not exist|alias.*n'existe pas/i.test(err)) {
      throw new Error(`Alias ou mot de passe keystore incorrect (alias=${keyAlias})`);
    }
    throw new Error(err);
  }
  const parsed = parseKeytoolOutput(combined);
  if (!parsed.sha1) {
    throw new Error(`SHA-1 introuvable dans la sortie keytool (${keytool})`);
  }
  return { ...parsed, classification: classifySha1(parsed.sha1) };
}

function inspectKeystoreBuffer(keystoreBase64, keystoreMeta) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'afw-jks-'));
  const jksPath = path.join(tmpDir, 'probe.jks');
  try {
    fs.writeFileSync(jksPath, Buffer.from(keystoreBase64, 'base64'));
    return inspectKeystoreFile({
      jksPath,
      keyAlias: keystoreMeta.keyAlias,
      keystorePassword: keystoreMeta.keystorePassword,
    });
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
}

function inspectLocalKeystore(appRoot) {
  const config = resolveKeystoreConfig(appRoot);
  if (!config) return { ok: false, reason: 'missing-local-keystore' };
  try {
    const info = inspectKeystoreFile(config);
    return { ok: true, jksPath: config.jksPath, ...info };
  } catch (err) {
    return { ok: false, reason: 'keytool-failed', message: err?.message || String(err) };
  }
}

function scoreKeystoreForProduction(inspection) {
  if (!inspection?.sha1) return -1;
  const kind = inspection.classification?.kind;
  if (kind === 'blocked') return -100;
  if (kind === 'play-upload') return 100;
  if (kind === 'prod-app') return 50;
  return 0;
}

function formatProductionHint(sha1) {
  const info = classifySha1(sha1);
  if (info.kind === 'play-upload') {
    return `OK — clé upload Play (${PLAY_UPLOAD.sha1}) — AAB accepté par Google Play.`;
  }
  if (info.kind === 'prod-app') {
    return `Certificat app FBF-GLOBAL (${PROD_APP_SIGNING.sha1}) — Firebase/OAuth. Pour Play, utilisez la clé upload ${PLAY_UPLOAD.sha1}.`;
  }
  if (info.kind === 'blocked') {
    return `REFUSÉ — clé EAS auto-générée (${info.sha1}). Installez @abdoulaye_fane__afriwonder.jks (upload Play).`;
  }
  return `REFUSÉ — SHA-1 inconnu (${sha1}). Attendu clé upload Play : ${PLAY_UPLOAD.sha1}`;
}

module.exports = {
  readCredentials,
  resolveKeystoreConfig,
  parseKeytoolOutput,
  inspectKeystoreFile,
  inspectKeystoreBuffer,
  inspectLocalKeystore,
  scoreKeystoreForProduction,
  formatProductionHint,
  isAllowedForProduction,
  isRequiredProdAabSigning,
  isAllowedForPlayStoreUpload,
};
