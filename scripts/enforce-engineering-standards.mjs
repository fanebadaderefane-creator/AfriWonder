#!/usr/bin/env node
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');

const CODE_FILE_RE = /\.(ts|tsx|js|jsx|mjs|cjs)$/i;
const MAX_WARN_LINES = 300;
const MAX_BLOCK_LINES = 500;
const TODO_WITH_TICKET_RE = /TODO\((AFW-\d+|#[0-9]+)\)/;
const ADDED_TODO_RE = /^\+.*TODO/i;
const ADDED_CONSOLE_LOG_RE = /^\+.*\bconsole\.log\(/i;
const ADDED_LOCALHOST_RE = /^\+.*localhost(?::\d+)?/i;
const ADDED_HTTP_URL_RE = /^\+.*http:\/\/(?!localhost(?::\d+)?)(?!127\.0\.0\.1(?::\d+)?)/i;
/** Secrets / clés évidents dans le diff (manuel ch.7). */
const ADDED_SK_LIVE_RE = /^\+.*sk_live_[0-9a-zA-Z]+/;
const ADDED_AWS_KEY_RE = /^\+.*AKIA[0-9A-Z]{16}/;
const ADDED_PRIVATE_KEY_RE = /^\+.*BEGIN [A-Z ]*PRIVATE KEY/;

function run(command, fallback = '') {
  try {
    return execSync(command, {
      cwd: repoRoot,
      stdio: ['ignore', 'pipe', 'ignore'],
      encoding: 'utf8',
    }).trim();
  } catch {
    return fallback;
  }
}

function resolveBaseRef() {
  /** CI PR : SHA exact de la branche base (évite diff vide si shallow checkout). */
  const explicitSha = process.env.ENGINEERING_STANDARDS_BASE_SHA?.trim();
  if (explicitSha) {
    return explicitSha;
  }
  const explicitBase = process.env.GITHUB_BASE_REF;
  if (explicitBase) {
    return `origin/${explicitBase}`;
  }
  if (run('git rev-parse --verify origin/main')) {
    return 'origin/main';
  }
  return run('git rev-parse --verify HEAD~1', 'HEAD');
}

function getChangedFiles(baseRef) {
  const out = run(`git diff --name-only ${baseRef}...HEAD`, '');
  if (!out) return [];
  return out
    .split(/\r?\n/)
    .map((f) => f.trim())
    .filter(Boolean);
}

function countLines(filePath) {
  const fullPath = path.join(repoRoot, filePath);
  if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) return 0;
  const content = fs.readFileSync(fullPath, 'utf8');
  if (!content) return 0;
  return content.split(/\r?\n/).length;
}

function getDiff(baseRef) {
  return run(`git diff --unified=0 ${baseRef}...HEAD`, '');
}

const baseRef = resolveBaseRef();
const changedFiles = getChangedFiles(baseRef);

const codeFiles = changedFiles.filter((file) => CODE_FILE_RE.test(file));
const warnings = [];
const errors = [];

for (const file of codeFiles) {
  const lines = countLines(file);
  if (lines > MAX_BLOCK_LINES) {
    errors.push(
      `${file}: ${lines} lignes (> ${MAX_BLOCK_LINES}, bloquant selon standard AfriWonder)`,
    );
  } else if (lines > MAX_WARN_LINES) {
    warnings.push(
      `${file}: ${lines} lignes (> ${MAX_WARN_LINES}, refactor recommandé)`,
    );
  }
}

const diff = getDiff(baseRef);
if (diff) {
  const lines = diff.split(/\r?\n/);
  for (const line of lines) {
    if (!line.startsWith('+') || line.startsWith('+++')) continue;

    if (!ADDED_TODO_RE.test(line)) continue;
    if (!TODO_WITH_TICKET_RE.test(line)) {
      errors.push(`TODO sans ticket dans diff: "${line.slice(1).trim()}"`);
    }
  }

  for (const line of lines) {
    if (!line.startsWith('+') || line.startsWith('+++')) continue;
    if (ADDED_CONSOLE_LOG_RE.test(line)) {
      errors.push(`console.log interdit dans diff: "${line.slice(1).trim()}"`);
    }
    if (ADDED_LOCALHOST_RE.test(line)) {
      errors.push(`localhost hardcodé interdit dans diff: "${line.slice(1).trim()}"`);
    }
    if (ADDED_HTTP_URL_RE.test(line)) {
      errors.push(`URL non sécurisée (http://) détectée dans diff: "${line.slice(1).trim()}"`);
    }
    if (ADDED_SK_LIVE_RE.test(line)) {
      errors.push(`secret Stripe-like détecté dans diff (retirez-le du code)`);
    }
    if (ADDED_AWS_KEY_RE.test(line)) {
      errors.push(`clé AWS AKIA détectée dans diff (retirez-la du code)`);
    }
    if (ADDED_PRIVATE_KEY_RE.test(line)) {
      errors.push(`bloc PEM / clé privée détecté dans diff`);
    }
  }
}

if (warnings.length) {
  console.log('Warnings standards ingénierie:');
  for (const msg of warnings) {
    console.log(`- ${msg}`);
  }
}

if (errors.length) {
  console.error('Erreurs standards ingénierie (bloquantes):');
  for (const msg of errors) {
    console.error(`- ${msg}`);
  }
  process.exit(1);
}

console.log('Standards ingénierie: OK sur les fichiers modifiés.');
