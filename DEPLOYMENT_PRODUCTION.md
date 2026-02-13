# Guide de déploiement production – AfriWonder

**Objectif : 0 crash. Dormir tranquille.**

Ce document consolide toutes les étapes pour mettre AfriWonder en production de manière sécurisée et scalable.

---

## 1. Prérequis

- Node.js 20+
- PostgreSQL 15+
- Redis (obligatoire en prod pour rate limiting)
- PM2 (pour mode cluster)
- Nginx (reverse proxy + SSL)

### Docker (optionnel)

Pour déployer avec Docker Compose :
1. **Docker Desktop** doit être démarré (sous Windows : lancer Docker Desktop avant `docker compose`)
2. Créer un fichier `.env` à la racine avec les variables (voir `docker-compose.env.example`)
3. `docker compose -f docker-compose.prod.yml -f docker-compose.prod-1m.yml up -d`

---

## 2. Variables d'environnement production

### Obligatoires
```env
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:5432/afriwonder
JWT_SECRET=<générer 64 caractères aléatoires>
CORS_ORIGIN=https://votre-domaine.com
REDIS_URL=redis://localhost:6379
APP_URL=https://api.votre-domaine.com
```

### Paiements (selon providers utilisés)
```env
# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Orange Money Mali
ORANGE_MONEY_MERCHANT_ID=...
ORANGE_MONEY_API_KEY=...
ORANGE_MONEY_WEBHOOK_SECRET=<secret partagé pour signature HMAC>
ORANGE_MONEY_ENV=production

# Moov Money
MOOV_MONEY_WEBHOOK_SECRET=...
MOOV_MONEY_ENV=production
```

### Monitoring
```env
SENTRY_DSN=https://xxx@sentry.io/yyy
HEALTH_API_KEY=<clé pour /health/errors>
ERROR_WEBHOOK_URL=https://hooks.slack.com/... # optionnel
```

### Cloudflare R2 (vidéos + backups)
```env
R2_ENDPOINT=https://xxx.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=afriwonder-prod
```

Vérifier : `cd backend && npm run check:prod-env`

---

## 3. Migrations et base de données

```bash
cd backend
npx prisma migrate deploy
npx prisma db seed  # si besoin
```

---

## 4. PM2 cluster

```bash
cd backend
npm run build
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # pour démarrage auto au boot
```

Le fichier `ecosystem.config.js` utilise `instances: 'max'` pour exploiter tous les CPU.

---

## 5. Nginx

Copier `nginx-production.conf` vers `/etc/nginx/conf.d/afriwonder.conf` (ou équivalent).

**Modifications à faire :**
- Remplacer `server_name _` par votre domaine
- Configurer SSL (Let's Encrypt) :
  ```nginx
  ssl_certificate /etc/letsencrypt/live/domain.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/domain.com/privkey.pem;
  ```
- Ajuster `root` pour le frontend (ex. `/var/www/afriwonder/dist`)

```bash
nginx -t
systemctl reload nginx
```

---

## 6. Backups automatiques

### Installation cron
```bash
cd backend/scripts
chmod +x setup-cron-backup.sh
sudo ./setup-cron-backup.sh
```

Cron : 3x/jour à 2h, 10h, 18h. Rétention 14 jours.

### Upload vers R2
Si `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` sont définis dans `.env`, les backups sont uploadés automatiquement.

**Prérequis :** AWS CLI installé (`apt install awscli` ou `pip install awscli`)

---

## 7. Tests de charge

```bash
cd backend
# Backend doit être démarré
npm run load-test
```

Variables : `API_URL`, `LOAD_REQUESTS` (défaut 500), `LOAD_CONCURRENT` (défaut 50).

Avec k6 : `k6 run scripts/load-test.k6.js`

---

## 8. Monitoring

### Sentry
- Créer projet sur sentry.io
- Ajouter `SENTRY_DSN` en prod
- Configurer alertes (erreurs critiques, paiements)

### UptimeRobot
- Surveiller `GET https://api.votre-domaine.com/health` toutes les 5 min
- Alerte email/SMS si down

### Health checks
- `/health` : liveness
- `/health/ready` : DB + Redis
- `/health/errors?key=HEALTH_API_KEY` : résumé erreurs

---

## 9. Webhooks paiement

### URLs à enregistrer chez chaque provider
- **Stripe :** `https://api.votre-domaine.com/api/payments/stripe/webhook`
- **Orange Money :** `https://api.votre-domaine.com/api/payments/orange-money/webhook`
- **Moov :** `https://api.votre-domaine.com/api/payments/moov/webhook`

### Validation production
En production, les webhooks **Orange Money** et **Moov** **rejettent** les requêtes si le secret est manquant :
- `ORANGE_MONEY_WEBHOOK_SECRET` obligatoire
- `MOOV_MONEY_WEBHOOK_SECRET` obligatoire

Stripe : `STRIPE_WEBHOOK_SECRET` déjà strict.

---

## 10. Checklist avant lancement

| Étape | Commande / action |
|-------|-------------------|
| Env prod | `npm run check:prod-env` |
| Build | `npm run build` |
| Migrations | `npx prisma migrate deploy` |
| Tests | `npm run test` (ou `npm run test:coverage` pour la couverture) |
| Load test | `npm run load-test` |
| Cron backup | `setup-cron-backup.sh` |
| PM2 | `pm2 start ecosystem.config.js` |
| Nginx | Config SSL + reload |
| Sentry | DSN configuré |
| UptimeRobot | Health check actif |

**Couverture** : seuil 80% configuré. Si CI échoue, exécuter `npm run test:coverage` dans backend pour voir les écarts. Réduire temporairement dans `jest.config.js` (ex. 70%) si nécessaire.

---

## 11. Rollback rapide

**Code :** `pm2 reload afriwonder-backend` (zero-downtime) ou déployer image précédente.

**Base de données :**
```bash
gunzip -c backups/afriwonder_backup_YYYYMMDD_HHMMSS.sql.gz | psql "$DATABASE_URL"
```

---

## 12. Limites connues (MVP)

- **1M utilisateurs simultanés :** non testé. L'architecture est prête (PM2 cluster, Redis, indexes) mais des load tests à grande échelle et un load balancer horizontal sont recommandés pour ce niveau.
- **Réplication PostgreSQL :** non configurée. Pour HA, envisager streaming replication.
- **CDN vidéos :** R2 + Cloudflare CDN recommandé pour le streaming.

---

*Dernière mise à jour : février 2026*
