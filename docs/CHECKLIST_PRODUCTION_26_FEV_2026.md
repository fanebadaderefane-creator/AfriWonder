# Checklist production AfriConnect – 26 février 2026

**Objectif : 0 crash. Dormir tranquille.**

Priorités : **CRITIQUE** → **IMPORTANT** → **OPTIMISATION**.

---

## CRITIQUE (obligatoire avant le 26/02)

### Backend & Paiements
- [ ] **Backend** : `npm run build` + `npm run start` OK en prod
- [ ] **Orange Money** : contrat production signé, `ORANGE_MONEY_*` en .env prod
- [ ] **Wave Money** : contrat production signé, credentials en .env
- [ ] **MTN Mobile Money** : contrat production signé, credentials en .env
- [ ] **Stripe** : KYC validé, `STRIPE_SECRET_KEY` + webhook signing secret en prod
- [ ] **Webhooks** : URL publique HTTPS (ex. `https://api.africonnect.com/api/payment/webhook`) enregistrée chez chaque provider
- [ ] **Idempotence** : déjà fait – `order.service.confirmPayment` retourne succès si déjà payé (pas de double débit)
- [ ] **Rollback paiement** : en cas d’erreur, utiliser Refunds (admin) ou `escrowService.refundFunds` (disputes)

### Sécurité
- [ ] **HTTPS/SSL** : partout (front + API). Cloudflare ou nginx avec certificat.
- [ ] **Rate limiting** : 10 req/s par IP (implémenté : 600 req/min en Redis). `REDIS_URL` obligatoire en prod.
- [ ] **Chiffrement** : mots de passe hashés (bcrypt), pas de stockage de cartes (Stripe tokens).
- [ ] **DDoS** : Cloudflare en front (proxy DNS + “Under attack” si besoin).
- [ ] **2FA admins** : `User2FA` + middleware admin avec 2FA (vérifier routes `/api/admin`).
- [ ] **Logs sensibles** : `AdminAuditLog` + `SecurityLog` utilisés sur actions admin/sensibles.

### Tests qui sauvent
- [ ] **Tests auto** : `cd backend && npm run test:coverage` → tous verts
- [ ] **Front** : `npm run test` + `npm run build` sans erreur
- [ ] **CI** : push sur `main` → GitHub Actions vert (test-backend, test-frontend, security-scan)
- [ ] **Secrets GitHub** : `CI_ALERT_WEBHOOK_URL` (optionnel) pour alerte en cas d’échec CI

---

## IMPORTANT (fortement recommandé)

### Infrastructure
- [ ] **Auto-scaling** : `docker-compose.prod.yml` avec `replicas: 3` (ou orchestration type ECS/K8s)
- [ ] **Load balancer** : devant les replicas backend (nginx ou fournisseur cloud)
- [ ] **CDN vidéos** : Cloudflare R2 ou S3 + CDN (déjà prévu avec R2)
- [ ] **Backups** : 3x/jour – cron `0 2,10,18 * * *` exécutant `backend/scripts/cron-backup-3x-daily.sh`
- [ ] **Disaster recovery** : 1x/semaine test restore d’un backup (voir `docs/ROLLBACK_RAPIDE.md`)

### Monitoring 24/7
- [ ] **Sentry** : `SENTRY_DSN` en prod (backend). Handlers déjà dans `app.ts`. Créer projet sur sentry.io.
- [ ] **Uptime Robot** (ou équivalent) : surveiller `GET https://api.africonnect.com/health` toutes les 5 min, alerte SMS/email si down
- [ ] **Health** : `/health` (liveness), `/health/ready` (DB), `/health/errors?key=HEALTH_API_KEY` (résumé erreurs)
- [ ] **Dashboard admin** : accès au résumé erreurs (ou Sentry) pour réaction rapide

### Alertes automatiques
- [ ] **Serveur down** : Uptime Robot → SMS/email
- [ ] **Paiement échoue 5x** : Sentry (regrouper par type) ou webhook `ERROR_WEBHOOK_URL` pour log custom
- [ ] **CPU > 80%** : `backend/scripts/health-monitor.sh` en cron + endpoint interne ou CloudWatch/Prometheus
- [ ] **Bug critique** : Sentry alertes (configurer seuils dans Sentry)

---

## OPTIMISATION (scaling 0 → 1M)

### Base de données
- [ ] **Index** : migration `20260208190000_add_video_feed_indexes` appliquée (`npx prisma migrate deploy`)
- [ ] **Cache** : Redis utilisé pour rate limiting + cache (leaderboard, etc.). `REDIS_URL` en prod.
- [ ] **Requêtes lentes** : activer `log_level = 'log'` ou logging Prisma en staging, corriger les requêtes > 200 ms

### Rate limiting & anti-abuse
- [ ] **Général** : 10 req/s par IP (600/min) – fait dans `rateLimiting.ts`
- [ ] **Auth** : 5 req/15 min (login/register) – fait
- [ ] **Paiements** : 10 req/h – fait
- [ ] **Anti-bot** : `antiBotMiddleware` (User-Agent, IP blacklist) – fait
- [ ] **Anti-spam** : `antiSpamMiddleware` sur comments/messages/news – fait

### Rollback rapide
- [ ] **Code** : rollback 1-click = redéployer image Docker précédente (voir `docs/ROLLBACK_RAPIDE.md`)
- [ ] **DB** : restaurer dernier backup (backups 3x/jour, rétention 14 j dans le script cron)

### Mobile 3G/4G (Afrique)
- [ ] **PWA** : déjà configurée (vite-plugin-pwa, manifest). Tester “Add to home screen”.
- [ ] **Mode offline** : Service Worker (injectManifest). Vérifier cache des assets critiques.
- [ ] **Payload** : réduire taille des réponses (pagination, champs partiels). Images/vidéos en CDN.
- [ ] **Timeout** : timeouts API raisonnables (ex. 30 s) pour connexions lentes.

---

## Checklist finale avant lancement

| Item | Statut |
|------|--------|
| Audit sécurité (rapport signé) | ☐ |
| Tests auto backend + front à 100% (tous verts) | ☐ |
| 100 beta testeurs satisfaits | ☐ |
| 4 méthodes paiement testées (Orange, Wave, MTN, Stripe) | ☐ |
| CDN vidéos opérationnel | ☐ |
| Monitoring actif (Sentry + Uptime Robot) | ☐ |
| Backups 3x/jour + test restore hebdo | ☐ |
| Support 24/7 organisé (vous ou équipe) | ☐ |
| Assurance cyber-risques souscrite | ☐ |
| Plan communication prêt | ☐ |
| Équipe technique dispo 48 h après lancement | ☐ |

---

## Fichiers modifiés / ajoutés

- **Backend**  
  - `prisma/schema.prisma` : index Video (creator_id, visibility, category).  
  - `prisma/migrations/20260208190000_add_video_feed_indexes/migration.sql`  
  - `src/index.ts` : Sentry initialisé avant app, doublon errorHandler supprimé.  
  - `src/app.ts` : Sentry handlers, raw body pour Stripe webhook, webhookLimiter.  
  - `src/middleware/rateLimiting.ts` : 10 req/s, skip webhooks, webhookLimiter 120/min.  
  - `src/services/errorMonitoring.service.ts` : envoi vers Sentry si DSN.  
  - `src/services/order.service.ts` : confirmPayment idempotent.  
  - `src/services/payment.service.ts` : verifyStripeWebhook + handleStripeWebhookEvent.  
  - `src/routes/payments.routes.ts` : POST /api/payments/stripe/webhook (signature vérifiée).  
  - `Dockerfile` : npm ci (full) en builder, npm prune --production en prod, healthcheck renforcé.  
  - `ENV_TEMPLATE.txt` : REDIS_URL, ERROR_WEBHOOK_URL.  
- **Racine**  
  - `Dockerfile` : build frontend Vite + nginx.  
  - `nginx.conf` : SPA (try_files) + /health.  
- **Scripts**  
  - `backend/scripts/cron-backup-3x-daily.sh`  
- **CI/CD**  
  - `.github/workflows/ci.yml` : codecov en continue-on-error, alerte échec CI.  
- **Docs**  
  - `docs/ROLLBACK_RAPIDE.md`  
  - `docs/ENV_PRODUCTION.md`  
  - `CHECKLIST_PRODUCTION_26_FEV_2026.md`

---

## Garanties “zéro stress”

1. **Paiements** : idempotence webhook + fallback manuel (remboursement) + alertes Sentry.  
2. **Vidéos** : CDN (R2/Cloudflare) + compression côté upload.  
3. **Bugs** : rollback 1-click (image précédente) + Sentry + hotfix < 10 min si besoin.  
4. **Sécurité** : backups testés + restore < 1 h + conformité RGPD à valider.  
5. **Légal** : CGU/CGV validées par avocat + licences logiciels.

**Si tout est coché : probabilité de succès maximale. 0 crash = réussite.**
