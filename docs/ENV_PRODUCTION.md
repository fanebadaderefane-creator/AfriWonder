# Variables d’environnement — Production (26 février 2026)

## Obligatoires

| Variable | Description |
|----------|-------------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | PostgreSQL (Supabase ou autre) |
| `JWT_SECRET` | Secret fort (32+ caractères) |
| `CORS_ORIGIN` | URL du front (ex. `https://africonnect.com`) |
| `REDIS_URL` | Redis pour rate limiting + cache (ex. `redis://redis:6379`) |

## Paiements (selon contrats)

| Variable | Description |
|----------|-------------|
| `ORANGE_MONEY_*` | Client ID, Secret, Merchant ID, API Key, ENV=production |
| `STRIPE_SECRET_KEY` | Clé secrète Stripe |
| `STRIPE_WEBHOOK_SECRET` | Signing secret du webhook Stripe (`whsec_...`) |
| Wave / MTN | Selon docs des providers |

## Monitoring & alertes

| Variable | Description |
|----------|-------------|
| `SENTRY_DSN` | Projet Sentry backend |
| `HEALTH_API_KEY` | Protège `GET /health/errors` |
| `ERROR_WEBHOOK_URL` ou `ERROR_MONITORING_WEBHOOK` | URL pour envoi des erreurs (Slack, etc.) |

## Stockage & média

| Variable | Description |
|----------|-------------|
| `R2_*` ou `AWS_*` | Bucket vidéos/images (R2 recommandé) |

## Optionnel

- `AGORA_APP_ID`, `AGORA_APP_CERTIFICATE` (live)
- `FCM_*` (push)
- `SENDGRID_*` (emails)
- `APP_URL` (base URL pour liens dans les mails)

---

**Vérification rapide** : en prod, au démarrage, le backend exige `DATABASE_URL` et `JWT_SECRET`. Sans `REDIS_URL`, le rate limiting reste en mémoire (OK single instance, à éviter en multi-replicas).
