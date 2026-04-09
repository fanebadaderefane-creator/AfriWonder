# RUNBOOK — Incident Response AfriWonder

## 0) Environnements (staging vs production)

- **Production**: `NODE_ENV=production`, DB et secrets dédiés, `REDIS_URL` + `SENTRY_DSN` obligatoires, paiements en mode live uniquement après validation juridique.
- **Staging**: projet Postgres / Supabase **séparé**, clés **sandbox** (Orange Money test, Stripe test), `CORS_ALLOW_VERCEL_PREVIEW=true` uniquement si preview autorisée, jamais les secrets de prod.
- **Rollback applicatif + DB**: procédure détaillée dans [ROLLBACK_RAPIDE.md](./ROLLBACK_RAPIDE.md) (restore backup avant toute migration risquée en prod).

## 1) Priorités en incident

1. Protéger les utilisateurs (paiements, données, auth).
2. Stabiliser le service (degrader proprement, limiter l'impact).
3. Préserver les preuves (logs, traces, métriques).
4. Communiquer statut + ETA.

## 2) Panne API / DB

- Vérifier `/health` et `/health/ready`.
- Vérifier connectivité PostgreSQL (`DATABASE_URL`) et saturation pool.
- Si prod: confirmer `REDIS_URL` actif (rate limit + blacklist JWT).
- Redémarrer l'API uniquement après confirmation DB/Redis.

## 3) Compromission secret / token

- Rotation immédiate des secrets (`JWT_SECRET`, `JWT_REFRESH_SECRET`, clés paiement, clés OAuth).
- Invalider sessions: rotation refresh + blacklist access/refresh si possible.
- Activer mode protection (rate limits stricts, endpoints sensibles en lecture seule si nécessaire).

## 4) Incident paiement

- Basculer paiement en mode maintenance si webhook KO.
- Vérifier queue webhooks + idempotency keys.
- Rejouer webhooks sandbox avant réouverture.

## 5) Sauvegardes & restauration

- Backup DB quotidien (automatisé) + test de restauration hebdomadaire.
- Vérifier RPO/RTO après chaque exercice.
- Conserver un snapshot pré-release pour rollback applicatif.

## 6) Monitoring / alerting minimum

- `SENTRY_DSN` obligatoire en production.
- Alertes: error rate > 1%, latence p95 anormale, échecs login/paiement, saturation DB.
- Tableau de bord: disponibilité API, erreurs 5xx, jobs en retard, queue webhooks.

## 7) Contacts d'urgence

- Incident commander: à renseigner
- Backend on-call: à renseigner
- Infra/DevOps on-call: à renseigner
- Produit/Support client: à renseigner

## 8) Post-mortem (max 72h)

- Timeline factuelle
- Cause racine
- Impact utilisateurs
- Actions correctives (owner + deadline)
