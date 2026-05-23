#!/usr/bin/env node
/**
 * Compile un rapport texte pour revue client (phase 11 du cahier des charges).
 * Sortie : reports/RAPPORT_FINAL_AFRIWONDER.md (+ security-audit.json si npm audit OK).
 *
 * PDF : non généré ici (pas de dépendance lourde). Option :
 *   pandoc reports/RAPPORT_FINAL_AFRIWONDER.md -o reports/RAPPORT_FINAL_AFRIWONDER.pdf
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const reportsDir = path.join(root, 'reports');

function runNpmAudit(cwd, outName) {
  const outPath = path.join(reportsDir, outName);
  const r = spawnSync('npm', ['audit', '--json'], {
    cwd,
    encoding: 'utf8',
    shell: true,
    maxBuffer: 20 * 1024 * 1024,
  });
  if (r.stdout) {
    try {
      fs.writeFileSync(outPath, r.stdout, 'utf8');
      return { ok: r.status === 0, path: outPath, exit: r.status };
    } catch {
      return { ok: false, path: outPath, error: 'write failed' };
    }
  }
  return { ok: false, path: outPath, error: r.stderr || 'no stdout' };
}

function gitRev() {
  const r = spawnSync('git', ['rev-parse', '--short', 'HEAD'], {
    cwd: root,
    encoding: 'utf8',
  });
  return (r.stdout || '').trim() || 'n/a';
}

fs.mkdirSync(reportsDir, { recursive: true });

const stamp = new Date().toISOString();
const auditRoot = runNpmAudit(root, 'security-audit-root.json');
const auditBackend = runNpmAudit(path.join(root, 'backend'), 'security-audit-backend.json');

const lines = [
  '# Rapport final AfriWonder (généré automatiquement)',
  '',
  `- **Horodatage (UTC)** : ${stamp}`,
  `- **Révision git** : ${gitRev()}`,
  '',
  '## Sources dans le dépôt',
  '',
  '- Suivi phases 0–24 : `docs/PHASES_0_24_CONTRACT_TRACKER.md`',
  '- Journal d’audit (racine) : `AUDIT_JOURNAL.md`',
  '- Contrat de preuve livraison : `docs/CLIENT_DELIVERY_CONTRACT.md`',
  '- Inventaire fonctionnel : `INVENTAIRE_AUDIT.md`',
  '- Alignement audit : `docs/AUDIT_ALIGNMENT_STATUS_2026-04-01.md`',
  '',
  '## Commandes de preuve (à exécuter avant signature client)',
  '',
  '```bash',
  'npm run verify:delivery',
  'npm run test:smoke --prefix backend',
  '# optionnel : charge (staging recommandé)',
  '# k6 run tests/load/afriwonder-load-test.js',
  '```',
  '',
  '## npm audit (artefacts JSON)',
  '',
  `- Racine : ${auditRoot.ok ? 'OK' : 'voir fichier'} → \`${path.relative(root, auditRoot.path)}\``,
  `- Backend : ${auditBackend.ok ? 'OK' : 'voir fichier'} → \`${path.relative(root, auditBackend.path)}\``,
  '',
  '## Limites',
  '',
  '- Ce script ne remplace pas les tests E2E Playwright, les builds EAS, ni la validation production.',
  '- Les scores Lighthouse dépendent de `npm run build` + `npm run preview` + `npm run lhci` (voir `lighthouserc.cjs`).',
  '',
];

const outMd = path.join(reportsDir, 'RAPPORT_FINAL_AFRIWONDER.md');
fs.writeFileSync(outMd, lines.join('\n'), 'utf8');
// eslint-disable-next-line no-console
console.log(`Written ${path.relative(root, outMd)}`);
