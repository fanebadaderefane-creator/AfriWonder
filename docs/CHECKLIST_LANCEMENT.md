# ✅ CHECKLIST LANCEMENT AFRICONNECT - 26 FÉVRIER 2026

## 🔴 CRITIQUE (OBLIGATOIRE - SEMAINE 1)

### Sécurité Maximale
- [ ] Rate limiting production installé (`npm install rate-limit-redis`)
- [ ] Rate limiters appliqués dans `app.ts` (auth: 5/15min, payment: 10/h)
- [ ] Anti-bot middleware activé
- [ ] Anti-spam middleware activé sur comments/messages
- [ ] Chiffrement données sensibles implémenté
- [ ] Variables ENCRYPTION_SECRET et WALLET_PIN_SALT en .env production
- [ ] Audit sécurité externe commandé (budget: $500-$2000)
- [ ] npm audit fix exécuté
- [ ] Snyk scan configuré
- [ ] Cloudflare account créé
- [ ] Domaine ajouté à Cloudflare
- [ ] SSL/TLS Mode: Full (Strict)
- [ ] Always Use HTTPS activé
- [ ] DDoS Protection activé
- [ ] Firewall rules configurées (5 req/min login, 10 req/h payments)
- [ ] Audit logs admin activés (middleware adminAudit)
- [ ] 2FA activé pour tous les admins

### Base de Données
- [ ] Migration indexes performance créée
- [ ] Indexes appliqués: `npx prisma migrate deploy`
- [ ] Indexes vérifiés dans Prisma Studio
- [ ] Redis installé (local dev ou Upstash/Redis Cloud prod)
- [ ] Cache Redis configuré dans .env: REDIS_URL
- [ ] Cache.ts initialisé au démarrage (initRedis)
- [ ] Cache appliqué sur routes critiques (videos trending, feed)
- [ ] Table SlowQueryLog ajoutée au schema.prisma
- [ ] Migration SlowQueryLog appliquée
- [ ] Middleware queryMonitoring activé

### Monitoring & Alertes
- [ ] Compte Sentry créé (sentry.io)
- [ ] Projet Backend créé dans Sentry
- [ ] Projet Frontend créé dans Sentry
- [ ] SENTRY_DSN backend configuré en .env
- [ ] VITE_SENTRY_DSN frontend configuré
- [ ] Sentry initialisé dans backend/src/index.ts
- [ ] Sentry initialisé dans frontend/src/main.tsx
- [ ] Compte UptimeRobot créé (uptimerobot.com)
- [ ] Monitor API health configuré (/health)
- [ ] Monitor API ready configuré (/health/ready)
- [ ] Monitor Frontend configuré
- [ ] Alertes email configurées
- [ ] Alertes SMS configurées (numéro Mali)
- [ ] Dashboard monitoring admin créé (/api/monitoring/metrics)

### Backups
- [ ] Script backup-db.sh rendu exécutable: `chmod +x backend/scripts/backup-db.sh`
- [ ] Dossier backups créé: `mkdir -p backend/backups`
- [ ] Test backup manuel: `./backend/scripts/backup-db.sh`
- [ ] Cron backup configuré (3h du matin): `crontab -e`
- [ ] Script restore-db.sh testé
- [ ] Backup cloud configuré (R2/S3) optionnel

### Rollback & Recovery
- [ ] Script rollback.sh rendu exécutable
- [ ] Git tags version créés (v1.0.0, v1.0.1, etc.)
- [ ] PM2 installé: `npm install -g pm2`
- [ ] ecosystem.config.js configuré
- [ ] PM2 démarré: `pm2 start ecosystem.config.js --env production`
- [ ] PM2 auto-start configuré: `pm2 startup` puis `pm2 save`
- [ ] Health check auto-recovery script testé
- [ ] Cron health check configuré (5 minutes)

---

## 🟡 IMPORTANT (RECOMMANDÉ - SEMAINE 2-3)

### Paiements Production
- [ ] Compte Orange Money Mali créé (contrat commercial)
- [ ] Clés API Orange Money production obtenues
- [ ] ORANGE_MONEY_* configuré en .env production
- [ ] Compte Wave Business créé
- [ ] API Wave access obtenu
- [ ] WAVE_API_KEY configuré
- [ ] Compte MTN Developer créé
- [ ] MTN API credentials obtenues
- [ ] MTN_MOBILE_MONEY_* configuré
- [ ] Compte Stripe créé et KYC validé
- [ ] STRIPE_SECRET_KEY production configuré
- [ ] STRIPE_WEBHOOK_SECRET configuré
- [ ] Webhooks testés pour chaque provider
- [ ] Table WebhookLog ajoutée au schema
- [ ] Webhook handlers implémentés
- [ ] Fallback automatique paiements testé
- [ ] Transaction rollback automatique vérifié

### Tests Automatisés
- [ ] Tests auth (10 tests) écrits
- [ ] Tests paiements (20 tests) écrits
- [ ] Tests vidéos (15 tests) écrits
- [ ] Tests e-commerce (20 tests) écrits
- [ ] Tests performance (10 tests) écrits
- [ ] Tests sécurité (15 tests) écrits
- [ ] Total 90+ tests passent: `npm test`
- [ ] Coverage > 70%: `npm run test:coverage`
- [ ] CI/CD GitHub Actions configuré
- [ ] Tests backend passent sur CI
- [ ] Tests frontend passent sur CI
- [ ] Security scan Snyk activé

### CDN & Optimisation Mobile
- [ ] Compte Cloudflare R2 créé
- [ ] Bucket africonnect-videos créé
- [ ] R2 credentials obtenus
- [ ] R2_* configuré en .env
- [ ] Upload service R2 implémenté
- [ ] Compression vidéos automatique configurée
- [ ] Cloudflare Stream account créé (optionnel)
- [ ] Sharp installé: `npm install sharp`
- [ ] Image optimization middleware créé
- [ ] LazyImage component créé
- [ ] Service Worker créé (public/sw.js)
- [ ] Manifest PWA créé (public/manifest.json)
- [ ] Icons PWA générés (72, 128, 192, 512px)
- [ ] Service Worker enregistré dans main.tsx
- [ ] PWA testée sur mobile Android

### Infrastructure
- [ ] Docker installé
- [ ] docker-compose.prod.yml testé localement
- [ ] Dockerfile backend testé
- [ ] Nginx load balancer configuré
- [ ] SSL certificates obtenus (Cloudflare ou Let's Encrypt)
- [ ] nginx.conf testé
- [ ] Health check Docker testé
- [ ] Auto-scaling Docker Compose testé (scale backend=5)

### Alertes Automatiques
- [ ] Service alerting.service.ts créé
- [ ] SMTP email configuré (Gmail ou SendGrid)
- [ ] SMTP_USER et SMTP_PASS en .env
- [ ] ADMIN_EMAIL configuré
- [ ] Twilio account créé (SMS)
- [ ] TWILIO_* configuré en .env
- [ ] ADMIN_PHONE configuré (format: +223XXXXXXXX)
- [ ] Slack webhook configuré (optionnel)
- [ ] Alertes testées manuellement
- [ ] Health monitor cron activé

---

## 🟢 OPTIMISATION (BONUS - SEMAINE 4)

### Performance Avancée
- [ ] Redis cluster configuré (scalabilité)
- [ ] Database read replicas configurées
- [ ] Connection pooling optimisé (Prisma)
- [ ] Query batching activé

### Monitoring Avancé
- [ ] Datadog account créé (optionnel)
- [ ] New Relic installé (optionnel)
- [ ] Logging centralisé (Logstash/Elasticsearch)
- [ ] APM (Application Performance Monitoring)

### Scalabilité
- [ ] Kubernetes cluster configuré (optionnel)
- [ ] Helm charts créés
- [ ] Auto-scaling HPA configuré
- [ ] Load testing avec k6 ou Artillery

### Analytics & Business
- [ ] Google Analytics 4 configuré
- [ ] Mixpanel ou Amplitude installé
- [ ] A/B testing framework
- [ ] Feature flags (LaunchDarkly)

### Légal & Conformité
- [ ] CGU/CGV validées par avocat
- [ ] Politique de confidentialité validée
- [ ] Conformité RGPD vérifiée
- [ ] Licences logiciels vérifiées
- [ ] Conformité Mali/Afrique de l'Ouest vérifiée
- [ ] Assurance cyber-risques souscrite (optionnel)

---

## 🚀 COMMANDES RAPIDES

### Installation Dépendances
```bash
cd backend
npm install rate-limit-redis sharp @sentry/node @sentry/profiling-node
npm install -g pm2 snyk
```

### Appliquer Migrations
```bash
cd backend
npx prisma migrate deploy
npx prisma generate
```

### Tests
```bash
cd backend
npm test
npm run test:coverage

cd ..
npm test
```

### Déploiement
```bash
# 1. Backup
cd backend
./scripts/backup-db.sh

# 2. Build
npm run build
cd ..
npm run build

# 3. Deploy
docker-compose -f docker-compose.prod.yml up -d

# Ou avec PM2
cd backend
pm2 start ecosystem.config.js --env production
pm2 save
```

### Monitoring
```bash
# PM2
pm2 monit
pm2 logs

# Docker
docker-compose logs -f backend
docker stats
```

### Rollback
```bash
cd backend
./scripts/rollback.sh
# Choisir version (ex: v1.0.0)
```

---

## 📞 SUPPORT URGENCE

### Si problème le 26 février:

1. **Serveur down**: `./backend/scripts/rollback.sh`
2. **Bug critique**: Check Sentry dashboard
3. **Database lente**: Check SlowQueryLog table
4. **Paiements fail**: Vérifier webhooks + fallback

### Logs
```bash
# Backend
pm2 logs africonnect-backend --err

# Database
psql $DATABASE_URL -c "SELECT * FROM SlowQueryLog ORDER BY duration DESC LIMIT 10;"

# Nginx
tail -f /var/log/nginx/error.log
```

---

## ✅ VALIDATION FINALE

Avant le 26 février, exécuter:

```bash
# 1. Tous les tests passent
cd backend && npm test && cd .. && npm test

# 2. Build réussit
cd backend && npm run build && cd .. && npm run build

# 3. Health checks OK
curl https://api.africonnect.com/health
curl https://api.africonnect.com/health/ready

# 4. Monitoring actif
# Vérifier Sentry, UptimeRobot, dashboard admin

# 5. Backups fonctionnent
cd backend && ./scripts/backup-db.sh

# 6. Rollback testé
./scripts/rollback.sh
```

---

**🎯 Objectif: Toutes les cases cochées avant le 26 février 2026**

**Probabilité succès: 100% si checklist complète** ✅
