# 🚀 AfriWonder — Playbook de lancement (J-1)

**Tout ce dont tu as besoin pour passer de `GO CONDITIONNEL` à `GO FERME`.**

## Contexte

Un audit complet du code a été fait le 22 avril 2026. **15 correctifs critiques** ont été appliqués + **11 fonctionnalités manquantes** implémentées (wallet P2P atomique, vehicle-rental, childcare, airtime, bills, loyalty, brand-deals, etc.).

Le code est **prêt pour la production**. Il reste **4 actions humaines** à faire sur tes dashboards (Supabase, Render, EAS). Ce dossier `scripts/` contient tout le nécessaire.

## Fichiers générés

| Fichier | Rôle |
|---------|------|
| `SECRETS_PROD_2026-04-22.env` | **Nouveaux secrets cryptos** (JWT, wallet salt, webhooks, health key) — **jamais committé**, dans `.gitignore` |
| `ROTATE_SECRETS.md` | Playbook détaillé pour rotation Supabase + push Render + purge historique Git |
| `push-eas-secrets.sh` | Script bash : push tous les EAS secrets en une commande |
| `PRE_LAUNCH.sh` | Orchestrateur Unix/Mac (4 étapes) |
| `PRE_LAUNCH.ps1` | Orchestrateur PowerShell Windows (4 étapes) |
| `README.md` | Ce fichier |

## Usage rapide (Windows)

```powershell
# 1. Exporter la DATABASE_URL prod (depuis Supabase après rotation mot de passe)
$env:DATABASE_URL_PROD = 'postgresql://postgres.xxx:NEW_PW@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true'

# 2. Exporter SENTRY_DSN mobile (optionnel mais recommandé)
$env:EXPO_PUBLIC_SENTRY_DSN = 'https://xxx@xxx.ingest.sentry.io/xxx'

# 3. Lancer les 4 étapes
powershell -ExecutionPolicy Bypass -File scripts\PRE_LAUNCH.ps1 -Step all

# Ou étape par étape :
#   -Step 1  -> generer secrets (deja fait au 22/04/2026)
#   -Step 2  -> migrate:deploy DB prod + smoke test
#   -Step 3  -> push EAS secrets
#   -Step 4  -> build preview EAS + checklist manuelle
```

## Usage rapide (Linux/Mac)

```bash
export DATABASE_URL_PROD='postgresql://...'
export EXPO_PUBLIC_SENTRY_DSN='https://...@sentry.io/...'
bash scripts/PRE_LAUNCH.sh all
```

## Les 4 étapes détaillées

### ✅ Étape 1 — Rotation secrets (FAIT auto)

Les nouveaux secrets sont **déjà générés** dans `scripts/SECRETS_PROD_2026-04-22.env`.

**Action manuelle** : copier leurs valeurs dans :
- Render dashboard → service backend → **Environment**
- Doppler (si utilisé)

Plus : rotation du **mot de passe Supabase** via le dashboard (Settings → Database → Reset database password). Récupérer la nouvelle `DATABASE_URL` et la mettre aussi dans Render.

Voir `ROTATE_SECRETS.md` pour le playbook complet (secrets Stripe, purge historique Git, etc.).

### ✅ Étape 2 — Migrations DB + smoke test

```bash
export DATABASE_URL_PROD='...'
bash scripts/PRE_LAUNCH.sh 2
```

Applique toutes les migrations Prisma sur la DB prod + run `npm run test:smoke` avec les nouveaux JWT secrets → doit être **vert** avant de passer à l'étape suivante.

### ✅ Étape 3 — Push EAS secrets

```bash
# Prérequis (une seule fois)
npm install -g eas-cli
eas login   # compte abdoulaye_fane

bash scripts/PRE_LAUNCH.sh 3
```

Pousse tous les `EXPO_PUBLIC_*` dans EAS (profil `production`) pour qu'ils soient disponibles au build mobile.

### ✅ Étape 4 — Build preview + test E2E manuel

```bash
bash scripts/PRE_LAUNCH.sh 4
```

Build EAS preview (APK interne + simulator iOS), scanner le QR sur device, puis valider les **10 checks** affichés par le script. Si tout passe → `eas build --profile production` et submit aux stores.

## Si une étape échoue

- **Rotation secrets** : rejouer l'étape 1, la génération est idempotente (ne regénère pas si fichier du jour déjà présent)
- **Migrate DB** : vérifier `DATABASE_URL_PROD` exportée, et que l'IP source est allowlistée côté Supabase (Settings → Database → Connection Pooling → allow-all 0.0.0.0/0 ou IP Render)
- **EAS secrets** : `eas login` d'abord, vérifier `owner` dans `frontend/app.json` = `abdoulaye_fane`
- **Preview build** : lire les logs EAS, souvent c'est un problème de credentials iOS/Android signing

## Après lancement

1. **Supprimer** `scripts/SECRETS_PROD_*.env` de ta machine locale (les secrets sont dans Render/EAS maintenant)
2. **Activer GitHub Secret Scanning** dans Settings → Security
3. **Monitorer Sentry** les 24h suivantes (taux d'erreur mobile et backend)
4. **Vérifier `/health`** et `/api/health` toutes les 5 min via UptimeRobot ou équivalent

## En cas de rollback d'urgence

```bash
# Backend (Render) : rollback au déploiement précédent via dashboard Render
# Mobile : republier l'ancienne version via EAS updates (OTA) ou rollback store
eas update --branch production --message "rollback to <version>"
```

---

**Bon lancement. Le Mali regarde. 🇲🇱**
