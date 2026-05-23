# TODO Manuel — Actions à faire pour la production

**Ce document liste tout ce que VOUS devez faire manuellement.**  
Les scripts automatisent ce qui peut l'être ; le reste nécessite vos accès, contrats et décisions.

---

## 1. VARIABLES D'ENVIRONNEMENT

### À faire
1. Copier `env.production.template` vers `backend/.env`
2. Remplacer **chaque valeur** (ne laisser aucun placeholder)
3. Générer JWT_SECRET et JWT_REFRESH_SECRET : `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
4. Vérifier : `cd backend && npm run check:prod-env`

### À chercher / obtenir
| Variable | Où l'obtenir |
|----------|--------------|
| `DATABASE_URL` | Supabase Dashboard → Settings → Database, ou votre hébergeur PostgreSQL |
| `REDIS_URL` | Redis Cloud, Upstash, ou Redis local |
| `CORS_ORIGIN` | Votre domaine frontend (ex. https://afriwonder.com) |
| `ORANGE_MONEY_*` | Contrat Orange Money Mali, espace marchand |
| `STRIPE_*` | Dashboard Stripe → API Keys, Webhooks |
| `SENTRY_DSN` | Créer projet sur sentry.io |
| `R2_*` | Cloudflare Dashboard → R2 → Create bucket |

---

## 2. PAIEMENTS

### À faire
1. **Signer les contrats** avec Orange Money, Stripe, Wave, MTN (selon pays)
2. **Enregistrer les webhooks** chez chaque provider :
   - Stripe : `https://api.VOTRE-DOMAINE.com/api/payments/stripe/webhook`
   - Orange Money : `https://api.VOTRE-DOMAINE.com/api/payments/orange-money/webhook`
   - Moov : `https://api.VOTRE-DOMAINE.com/api/payments/moov/webhook`
3. Copier les **signing secrets** dans `.env` (`*_WEBHOOK_SECRET`)

### À chercher
- Dashboard de chaque provider → Webhooks → Add endpoint
- Récupérer le secret après création

---

## 3. SSL / HTTPS

### À faire
1. Avoir un **domaine** pointant vers votre serveur (A record ou CNAME)
2. Choisir une option :
   - **Let's Encrypt** : `docs/HTTPS_LETSENCRYPT_PRODUCTION.md`
   - **Cloudflare** : Proxy activé (orange cloud) = SSL automatique

### À chercher
- Certificats : `/etc/letsencrypt/live/VOTRE-DOMAINE/`
- Ou : Cloudflare gère tout si proxy activé

---

## 4. INFRASTRUCTURE

### À faire
1. **PostgreSQL** : Créer une base (Supabase, Neon, ou VPS)
2. **Redis** : Installer ou utiliser Redis Cloud / Upstash
3. **Serveur** : VPS (DigitalOcean, OVH, etc.) ou conteneur

### Commandes à exécuter sur le serveur
```bash
# Migrations
cd backend && npx prisma migrate deploy

# PM2
cd backend && npm run build && pm2 start ecosystem.config.js
pm2 save
pm2 startup  # pour démarrage auto au boot
```

---

## 5. NGINX

### À faire
1. Copier `nginx-production.conf` vers `/etc/nginx/conf.d/afriwonder.conf`
2. Remplacer `server_name _` par votre domaine
3. Décommenter et remplir les chemins SSL (Let's Encrypt)
4. Ajuster `root` pour le frontend (ex. `/var/www/afriwonder/dist`)
5. Tester : `nginx -t` puis `systemctl reload nginx`

### À chercher
- Chemin certificats Let's Encrypt : `/etc/letsencrypt/live/DOMAINE/`
- Chemin build frontend : où vous déployez le `dist/` de Vite

---

## 6. BACKUPS

### À faire
1. SSH sur le serveur
2. `cd /chemin/backend/scripts`
3. `chmod +x setup-cron-backup.sh`
4. `sudo ./setup-cron-backup.sh`
5. Vérifier : `crontab -l` (doit afficher la ligne cron)

### Optionnel : upload R2
- Créer bucket R2 sur Cloudflare
- Remplir `R2_*` dans `.env`
- Installer AWS CLI : `apt install awscli` (pour `aws s3 cp`)

---

## 7. CLOUDFLARE (WAF)

### À faire
1. Ajouter votre domaine à Cloudflare (DNS)
2. Activer le **proxy** (icône orange) pour api. et www.
3. Suivre `docs/WAF_CLOUDFLARE_SETUP.md`
4. Security Level : Medium ou High

### À chercher
- Cloudflare Dashboard → DNS → Records
- Security → Settings → Security Level

---

## 8. MONITORING

### À faire
1. **Sentry** : Créer compte sur sentry.io, créer projet Node.js, copier DSN
2. **UptimeRobot** : Créer compte, ajouter monitor `GET https://api.VOTRE-DOMAINE.com/health` toutes les 5 min
3. Configurer alertes email/SMS si down

### À chercher
- Sentry : Project Settings → Client Keys (DSN)
- UptimeRobot : Add New Monitor → HTTP(s)

---

## 9. TEST RESTAURATION BACKUP

### À faire (1x/semaine recommandé)
```bash
cd backend
gunzip -c backups/afriwonder_backup_YYYYMMDD_HHMMSS.sql.gz | psql "$DATABASE_URL" --dry-run
# Ou sur une DB de test pour valider
```

---

## 10. SUPPORT / ALERTES

### À faire
1. Décider **qui** reçoit les alertes (Sentry, UptimeRobot)
2. Avoir un plan de réaction : qui intervient si le site est down ?
3. Documenter les contacts d'urgence

---

## RÉCAP — À faire dans l'ordre

| # | Action | Statut |
|---|--------|--------|
| 1 | Copier env.production.template → backend/.env | ☐ |
| 2 | Remplir toutes les variables (DB, Redis, JWT, etc.) | ☐ |
| 3 | Signer contrats paiement (Orange, Stripe, etc.) | ☐ |
| 4 | Enregistrer webhooks chez chaque provider | ☐ |
| 5 | Configurer domaine + SSL (Let's Encrypt ou Cloudflare) | ☐ |
| 6 | Installer PostgreSQL + Redis (ou utiliser Supabase) | ☐ |
| 7 | Déployer : build, migrations, PM2 | ☐ |
| 8 | Configurer Nginx + reload | ☐ |
| 9 | Installer cron backup | ☐ |
| 10 | Configurer Cloudflare (proxy + WAF) | ☐ |
| 11 | Créer projet Sentry + ajouter DSN | ☐ |
| 12 | Configurer UptimeRobot | ☐ |
| 13 | Tester restauration backup | ☐ |

---

## Fichiers de référence

- `DEPLOYMENT_PRODUCTION.md` — Guide déploiement
- `CHECKLIST_PRODUCTION_26_FEV_2026.md` — Checklist détaillée
- `docs/ENV_PRODUCTION.md` — Variables d'environnement
- `docs/ROLLBACK_RAPIDE.md` — En cas de problème
