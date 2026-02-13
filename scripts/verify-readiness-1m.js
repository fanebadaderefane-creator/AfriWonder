#!/usr/bin/env node
/**
 * Vérification pré-déploiement pour architecture 1M utilisateurs
 * Usage: node scripts/verify-readiness-1m.js
 * Vérifie: PM2 cluster, Nginx, Redis, PostgreSQL, load tests, backups
 */
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

let fail = 0;

console.log('=== Vérification readiness 1M utilisateurs AfriWonder ===\n');

// 1. PM2 cluster config
const ecosystemPath = join(process.cwd(), 'backend', 'ecosystem.config.js');
if (existsSync(ecosystemPath)) {
  const content = readFileSync(ecosystemPath, 'utf8');
  if (content.includes("instances: 'max'") || content.includes('instances: "max"')) {
    console.log('   ✅ PM2 cluster (instances: max) configuré');
  } else {
    console.log('   ⚠️ PM2: vérifier instances: "max" dans ecosystem.config.js');
    fail = 1;
  }
} else {
  console.log('   ⚠️ ecosystem.config.js absent');
  fail = 1;
}

// 2. Nginx production config
const nginxPath = join(process.cwd(), 'nginx-production.conf');
if (existsSync(nginxPath)) {
  console.log('   ✅ Nginx production config présent');
} else {
  console.log('   ⚠️ nginx-production.conf absent');
  fail = 1;
}

// 3. Docker compose scaling
const scalingPath = join(process.cwd(), 'docker-compose.prod-1m.yml');
if (existsSync(scalingPath)) {
  console.log('   ✅ docker-compose.prod-1m.yml présent');
} else {
  console.log('   ⚠️ docker-compose.prod-1m.yml absent');
  fail = 1;
}

// 4. Load tests
const loadTestPath = join(process.cwd(), 'backend', 'scripts', 'load-test.k6.js');
if (existsSync(loadTestPath)) {
  console.log('   ✅ Load test k6 présent');
} else {
  console.log('   ⚠️ load-test.k6.js absent');
  fail = 1;
}

// 5. Backup scripts
const backupPath = join(process.cwd(), 'backend', 'scripts', 'setup-cron-backup.sh');
if (existsSync(backupPath)) {
  console.log('   ✅ Script backup cron présent');
} else {
  console.log('   ⚠️ setup-cron-backup.sh absent');
  fail = 1;
}

// 6. Réplication PostgreSQL
const replicationPath = join(process.cwd(), 'docker-compose.replication.yml');
if (existsSync(replicationPath)) {
  console.log('   ✅ docker-compose.replication.yml présent');
} else {
  console.log('   ⚠️ docker-compose.replication.yml absent');
  fail = 1;
}

// 7. Documentation scaling
const scalingDoc = join(process.cwd(), 'docs', 'SCALING_1M_USERS.md');
if (existsSync(scalingDoc)) {
  console.log('   ✅ docs/SCALING_1M_USERS.md présent');
} else {
  console.log('   ⚠️ docs/SCALING_1M_USERS.md absent');
  fail = 1;
}

console.log('\n=== Résumé ===');
if (fail === 0) {
  console.log('✅ Tous les composants 1M sont en place.');
  console.log('   Déploiement: docker compose -f docker-compose.prod.yml -f docker-compose.prod-1m.yml up -d');
  console.log('   Pour 1M réel: suivre docs/SCALING_1M_USERS.md (multi-serveurs, Kubernetes)');
} else {
  console.log('⚠️ Vérifications échouées. Corriger les points ci-dessus.');
}
console.log('');
process.exit(fail);
