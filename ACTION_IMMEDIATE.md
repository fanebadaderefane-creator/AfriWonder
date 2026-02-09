# 🚨 ACTIONS IMMÉDIATES - À FAIRE MAINTENANT

## ⏰ AUJOURD'HUI (2-3 heures)

### 1. INSTALLER DÉPENDANCES CRITIQUES (10 min)

```bash
# Backend
cd backend
npm install rate-limit-redis @sentry/node @sentry/profiling-node sharp

# Rendre scripts exécutables (si Linux/Mac)
chmod +x scripts/*.sh

# Si Windows, utiliser Git Bash ou WSL
```

### 2. CONFIGURER VARIABLES ENVIRONNEMENT (15 min)

Ajouter dans `backend/.env`:

```bash
# ========== SÉCURITÉ ==========
ENCRYPTION_SECRET=CHANGEZ_MOI_32_CARACTERES_MINIMUM_PRODUCTION_SECURE
WALLET_PIN_SALT=CHANGEZ_MOI_32_CARACTERES_MINIMUM_SALT_SECURE

# ========== MONITORING (créer comptes gratuits) ==========
SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
# Obtenir sur: https://sentry.io/signup/

HEALTH_API_KEY=CHANGEZ_MOI_CLE_SECRETE_MONITORING
INTERNAL_SECRET=CHANGEZ_MOI_SECRET_INTERNE

# ========== REDIS (optionnel dev, obligatoire prod) ==========
# Option 1: Local (dev)
REDIS_URL=redis://localhost:6379

# Option 2: Upstash gratuit (prod)
# REDIS_URL=redis://default:password@redis-xxxxx.upstash.io:6379
# Créer sur: https://upstash.com

# ========== ALERTES ==========
ADMIN_EMAIL=votre-email@gmail.com
ADMIN_PHONE=+223XXXXXXXX

# SMTP (Gmail exemple)
SMTP_HOST=smtp.gmail.com
SMTP_USER=votre-email@gmail.com
SMTP_PASS=votre-app-password
# Obtenir app password: https://myaccount.google.com/apppasswords

# ========== BACKUP ==========
BACKUP_DIR=./backups
```

### 3. APPLIQUER RATE LIMITING (20 min)

**Étape 1**: Installer dépendance Redis Store
```bash
cd backend
npm install rate-limit-redis redis
```

**Étape 2**: Modifier `backend/src/app.ts`

Remplacer la section rate limiting actuelle (lignes 82-90) par:

```typescript
// IMPORTER en haut du fichier
import { 
  generalLimiter, 
  authLimiter, 
  paymentLimiter, 
  uploadLimiter,
  adminLimiter 
} from './middleware/rateLimiting.js';
import { antiBotMiddleware, antiSpamMiddleware } from './middleware/antiBot.js';

// APRÈS les middlewares cors/helmet/json
// AVANT les routes

// Anti-bot (bloquer bots connus)
app.use(antiBotMiddleware);

// Rate limiting général
app.use('/api/', generalLimiter);

// Rate limiting spécifique
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);
app.use('/api/payments', paymentLimiter);
app.use('/api/upload', uploadLimiter);
app.use('/api/admin', adminLimiter);

// Anti-spam sur routes commentaires/messages
app.use('/api/comments', antiSpamMiddleware);
app.use('/api/messages', antiSpamMiddleware);
app.use('/api/news', antiSpamMiddleware);
```

**Étape 3**: Tester
```bash
npm run dev
# Vérifier que le serveur démarre sans erreur
```

### 4. APPLIQUER INDEXES DATABASE (15 min)

```bash
cd backend

# Vérifier migration existe
ls prisma/migrations/20260210_add_performance_indexes/

# Appliquer migration
npx prisma migrate deploy

# Vérifier indexes créés
npx prisma studio
# Ou dans psql:
# \d+ "User"
# Devrait montrer les nouveaux indexes
```

### 5. CRÉER COMPTE SENTRY (10 min)

1. Aller sur [https://sentry.io/signup/](https://sentry.io/signup/)
2. Créer compte gratuit (5000 erreurs/mois)
3. Créer projet "AfriConnect Backend" (Node.js)
4. Créer projet "AfriConnect Frontend" (React)
5. Copier les DSN dans `.env`

### 6. CRÉER COMPTE UPTIME ROBOT (10 min)

1. Aller sur [https://uptimerobot.com/signUp](https://uptimerobot.com/signUp)
2. Créer compte gratuit (50 monitors)
3. Créer 3 monitors:
   - **API Health**: http://localhost:3000/health (dev) ou https://api.africonnect.com/health (prod)
   - **API Ready**: http://localhost:3000/health/ready
   - **Frontend**: http://localhost:5173 (dev) ou https://app.africonnect.com (prod)
4. Activer alertes email

### 7. TESTER BACKUP DATABASE (10 min)

```bash
cd backend

# Windows (Git Bash ou WSL)
bash scripts/backup-db.sh

# Vérifier backup créé
ls backups/
# Devrait afficher: africonnect_backup_YYYYMMDD_HHMMSS.sql.gz
```

### 8. EXÉCUTER TESTS (15 min)

```bash
# Backend
cd backend
npm test

# Frontend
cd ..
npm test

# Si des tests échouent, noter les erreurs pour corriger
```

---

## 📅 CETTE SEMAINE (LUNDI - VENDREDI)

### LUNDI: Sécurité Complète

**Matin (3h)**
- [ ] Chiffrement données sensibles testé
- [ ] Audit npm: `npm audit fix` (backend + frontend)
- [ ] Snyk scan: `npx snyk test`

**Après-midi (3h)**
- [ ] Cloudflare account créé
- [ ] Domaine ajouté à Cloudflare
- [ ] SSL activé
- [ ] Firewall rules configurées

**Soir (2h)**
- [ ] Commander audit sécurité externe (Upwork/Fiverr)
- [ ] Budget: $500-2000
- [ ] Chercher: "security audit nodejs" ou "penetration testing"

### MARDI: Database & Cache

**Matin (3h)**
- [ ] Redis installé (local ou Upstash)
- [ ] Cache.ts testé
- [ ] Cache appliqué sur 5 routes critiques

**Après-midi (3h)**
- [ ] SlowQueryLog table ajoutée
- [ ] queryMonitoring middleware activé
- [ ] Monitoring testé

**Soir (2h)**
- [ ] Vérifier performance avec/sans cache
- [ ] Benchmarks simples

### MERCREDI: Monitoring

**Matin (3h)**
- [ ] Sentry backend configuré
- [ ] Sentry frontend configuré
- [ ] Déclencher erreur test pour vérifier

**Après-midi (3h)**
- [ ] Dashboard monitoring créé
- [ ] Routes `/api/monitoring/*` testées
- [ ] Frontend dashboard admin

**Soir (2h)**
- [ ] UptimeRobot monitors configurés
- [ ] Alertes email/SMS testées

### JEUDI: Backups & Rollback

**Matin (3h)**
- [ ] Backup quotidien cron configuré
- [ ] 3 backups manuels testés
- [ ] Upload cloud (R2/S3) configuré

**Après-midi (3h)**
- [ ] Script rollback testé
- [ ] Git tags versions créés
- [ ] PM2 installé et configuré

**Soir (2h)**
- [ ] Health monitor cron activé
- [ ] Auto-recovery testé

### VENDREDI: Tests Finaux

**Matin (3h)**
- [ ] Écrire 20 tests manquants (auth, payments)
- [ ] Total 90+ tests

**Après-midi (3h)**
- [ ] CI/CD GitHub Actions mis à jour
- [ ] Tests backend passent sur CI
- [ ] Tests frontend passent sur CI

**Soir (2h)**
- [ ] Revue complète checklist critique
- [ ] Corriger points manquants

---

## 🚨 SI BLOQUÉ

### Erreur "Redis connection refused"
```bash
# Installer Redis local (Windows)
# Télécharger: https://github.com/tporadowski/redis/releases
# Ou utiliser Docker:
docker run -d -p 6379:6379 redis:alpine

# Ou désactiver Redis temporairement
# Dans rateLimiting.ts, mettre: store: undefined
```

### Erreur "Prisma migration failed"
```bash
# Reset database (ATTENTION: supprime données)
npx prisma migrate reset

# Ou appliquer manuellement
psql $DATABASE_URL < prisma/migrations/20260210_add_performance_indexes/migration.sql
```

### Erreur "Rate limiting not working"
```bash
# Vérifier ordre middlewares dans app.ts
# Rate limiters DOIVENT être AVANT les routes
# APRÈS cors/helmet/json
```

### Erreur "Module not found"
```bash
# Rebuild
cd backend
npm run build

# Vérifier tsconfig.json
# Vérifier imports .js à la fin
```

---

## 📞 QUESTIONS FRÉQUENTES

### Q: Redis obligatoire ?
**R**: Non en dev. Oui en production pour rate limiting distribué (multi-serveurs).

### Q: Cloudflare gratuit suffisant ?
**R**: Oui ! Plan gratuit inclut SSL, DDoS protection, CDN illimité.

### Q: Besoin d'un serveur dédié ?
**R**: Pas au début. VPS 2GB RAM suffit (0-10K users). Scaler après.

### Q: Combien coûte infrastructure ?
**R**:
- VPS 2GB: $10-20/mois (DigitalOcean, Hetzner)
- Database managée: $15-25/mois (Supabase, Railway)
- Redis: Gratuit (Upstash 10K req/jour) ou $10/mois
- Cloudflare: Gratuit
- Sentry: Gratuit (5K erreurs/mois)
- UptimeRobot: Gratuit (50 monitors)
- **TOTAL**: $35-55/mois (0-10K users)

### Q: Quand passer à Kubernetes ?
**R**: Quand > 100K users actifs. Docker Compose suffit avant.

---

## ✅ VALIDATION ACTIONS IMMÉDIATES

Avant de continuer, vérifier que:

```bash
# 1. Dépendances installées
npm list rate-limit-redis @sentry/node sharp

# 2. Rate limiting fonctionne
curl http://localhost:3000/health
# Faire 10 requêtes rapides, la 6ème devrait être rate limited

# 3. Indexes appliqués
npx prisma studio
# Vérifier table User, onglet "Indexes"

# 4. Backup fonctionne
ls backend/backups/
# Devrait avoir au moins 1 fichier .sql.gz

# 5. Tests passent
cd backend && npm test
cd .. && npm test
```

---

## 🎯 OBJECTIF CETTE SEMAINE

À la fin de la semaine:
- ✅ Sécurité critique appliquée (rate limiting, chiffrement)
- ✅ Performance 5x (indexes, cache)
- ✅ Monitoring actif (Sentry, UptimeRobot)
- ✅ Backups quotidiens automatiques
- ✅ Rollback < 2 minutes testé
- ✅ 90+ tests automatisés

**→ Vous pouvez dormir tranquille** 😴

---

**TEMPS TOTAL AUJOURD'HUI**: 2-3 heures
**TEMPS TOTAL CETTE SEMAINE**: 20-25 heures

**C'est parti ! 🚀**
