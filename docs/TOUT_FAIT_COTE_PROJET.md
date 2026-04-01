# Tout fait côté projet — 26 février 2026

Récapitulatif de tout ce qui est en place dans le repo (code, config, scripts, docs, tests).

---

## 1. Backend

| Élément | Fichiers / Détail |
|--------|---------------------|
| **Rate limiting** | `backend/src/middleware/rateLimiting.ts` — 10 req/s (600/min), webhooks exclus, `webhookLimiter` 120/min |
| **Webhooks** | `backend/src/routes/payments.routes.ts` — POST `/api/payment/webhook`, `/api/payments/orange-money/webhook`, `/api/payments/stripe/webhook` (body brut + vérif signature) |
| **Idempotence paiements** | `backend/src/services/order.service.ts` — `confirmPayment` retourne succès si déjà payé |
| **Stripe webhook** | `backend/src/services/payment.service.ts` — `verifyStripeWebhook`, `handleStripeWebhookEvent` |
| **Sentry** | `backend/src/config/sentry.ts`, `app.ts` (requestHandler, tracingHandler, errorHandler), `index.ts` (init avant app), `errorMonitoring.service.ts` (envoi vers Sentry) |
| **Health** | `backend/src/app.ts` — `/health`, `/health/ready`, `/health/errors?key=HEALTH_API_KEY` |
| **Index DB** | `backend/prisma/schema.prisma` (Video: `@@index([creator_id, created_at])`, etc.), `backend/prisma/migrations/20260208190000_add_video_feed_indexes/migration.sql` |
| **Anti-bot / anti-spam** | `backend/src/middleware/antiBot.ts`, appliqué dans `app.ts` |
| **Route communautés** | `backend/src/app.ts` — `app.use('/api/communities', communitiesRoutes)` |

---

## 2. Docker & nginx

| Élément | Fichier |
|--------|---------|
| **Backend** | `backend/Dockerfile` — npm ci, prisma generate + build, npm prune --production, healthcheck |
| **Frontend** | `Dockerfile` (racine) — build Vite, image nginx |
| **nginx** | `nginx.conf` — SPA (try_files), /health |
| **Compose prod** | `docker-compose.prod.yml` — backend, frontend, postgres, redis, nginx |
| **.dockerignore** | `.dockerignore` (racine) — exclut backend, node_modules, etc. pour build front |

---

## 3. Backups & rollback

| Élément | Fichier |
|--------|---------|
| **Backup 3x/jour** | `backend/scripts/cron-backup-3x-daily.sh` |
| **Rollback doc** | `docs/ROLLBACK_RAPIDE.md` — rollback code (Docker), DB, paiements |
| **Rollback script** | `backend/scripts/rollback.sh` |

---

## 4. CI/CD

| Élément | Fichier |
|--------|---------|
| **Pipeline** | `.github/workflows/ci.yml` — test-backend, test-frontend, security-scan (Snyk), notify-on-failure (webhook) |
| **Codecov** | Steps coverage en `continue-on-error: true` |
| **Alerte échec** | Job `notify-on-failure` si `CI_ALERT_WEBHOOK_URL` configuré |

---

## 5. Tests QA

| Fichier | Domaine |
|---------|---------|
| `backend/__tests__/auth.test.ts` | Register, login, refresh, /me |
| `backend/__tests__/videos.test.ts` | Feed, détail, create, like, comment |
| `backend/__tests__/users.test.ts` | Profil, follow |
| `backend/__tests__/products.test.ts` | List, get, create |
| `backend/__tests__/health.test.ts` | /health, /health/ready |
| `backend/__tests__/security.test.ts` | 401 sans token, validation register, anti-bot |
| `backend/__tests__/cart.test.ts` | Get, add, update, remove, clear, breakdown |
| `backend/__tests__/orders.test.ts` | List, config, stats |
| `backend/__tests__/payments.test.ts` | Webhook (orderId requis), wallet, transactions |
| `backend/__tests__/comments.test.ts` | Update, delete |
| `backend/__tests__/admin.test.ts` | Dashboard (admin vs user), users |
| `backend/__tests__/communities.test.ts` | List, get, create, join |
| `backend/src/__tests__/marketplace.test.ts` | Flow produits + panier + commandes |
| `backend/src/__tests__/order.service.test.ts` | Service commandes |

Doc tests : `backend/__tests__/README_QA_TESTS.md`

---

## 6. Checklist prod, ENV, script

| Élément | Fichier |
|--------|---------|
| **Checklist prod** | `CHECKLIST_PRODUCTION_26_FEV_2026.md` |
| **Doc ENV prod** | `docs/ENV_PRODUCTION.md` |
| **Template ENV** | `backend/ENV_TEMPLATE.txt` (REDIS_URL, ERROR_WEBHOOK_URL, etc.) |
| **Exemple .env** | `backend/.env.example` |
| **Manque avant 26/02** | `MANQUE_AVANT_26_FEVRIER.md` — 10 points à faire par toi |
| **Vérif env** | `backend/scripts/check-prod-env.js` — `npm run check:prod-env` |

---

## Commandes utiles

```bash
# Backend
cd backend
npm run check:prod-env    # Vérifier variables prod
npm run test:coverage     # Tests
npm run build && npm run start

# Migrations
npx prisma migrate deploy

# Docker
docker compose -f docker-compose.prod.yml build
```

---

**Tout ce qui est listé ci-dessus est fait côté projet.** Le reste (contrats, hébergement, comptes Sentry/Uptime Robot, etc.) est dans `MANQUE_AVANT_26_FEVRIER.md`.
