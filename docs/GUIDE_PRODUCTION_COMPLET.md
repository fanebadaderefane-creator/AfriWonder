 # Guide production AfriWonder — Configuration et clés externes

> Document consolidé après analyse complète du projet. À suivre étape par étape.

---

## 1. Vue d'ensemble

| Composant | Rôle |
|-----------|------|
| **Backend** | API Node/Express (port 3000) |
| **Frontend** | App React/Vite (build → fichiers statiques) |
| **Base de données** | PostgreSQL (Supabase ou autre) |
| **Redis** | Rate limiting, cache |
| **Stockage** | Cloudflare R2 ou S3 (vidéos, images) |

---

## 2. Variables d'environnement — Backend (`backend/.env`)

### 2.1 OBLIGATOIRES (sans elles, l'app ne démarre pas)

| Variable | Où l'obtenir | Exemple |
|----------|--------------|---------|
| `NODE_ENV` | Fixe | `production` |
| `DATABASE_URL` | Supabase, Neon, Render PostgreSQL, ou PostgreSQL hébergé | `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET` | Générer 64 caractères aléatoires | `openssl rand -hex 32` |
| `JWT_REFRESH_SECRET` | Idem, différent du JWT_SECRET | `openssl rand -hex 32` |
| `CORS_ORIGIN` | URL de votre frontend | `https://afriwonder.com` |
| `REDIS_URL` | Redis hébergé (Upstash, Redis Cloud, ou serveur) | `redis://default:xxx@host:6379` |
| `APP_URL` | URL publique du backend | `https://api.afriwonder.com` |

### 2.2 Paiements (selon contrats signés)

#### Orange Money Mali
| Variable | Où l'obtenir |
|----------|---------------|
| `ORANGE_MONEY_MERCHANT_ID` | Contrat Orange Money Mali |
| `ORANGE_MONEY_API_KEY` | Contrat Orange Money Mali |
| `ORANGE_MONEY_CLIENT_ID` | Portail développeur Orange |
| `ORANGE_MONEY_CLIENT_SECRET` | Portail développeur Orange |
| `ORANGE_MONEY_WEBHOOK_SECRET` | **OBLIGATOIRE EN PROD** — secret pour signer les webhooks |
| `ORANGE_MONEY_ENV` | `production` |
| `ORANGE_MONEY_API_URL` | `https://api.orange.ml` (ou URL fournie par Orange) |

#### Stripe
| Variable | Où l'obtenir |
|----------|---------------|
| `STRIPE_SECRET_KEY` | Dashboard Stripe → Clés API (sk_live_...) |
| `STRIPE_WEBHOOK_SECRET` | Stripe → Webhooks → Signing secret (whsec_...) |

#### Moov Money (si utilisé)
| Variable | Où l'obtenir |
|----------|---------------|
| `MOOV_MONEY_API_KEY` | Contrat Moov Money |
| `MOOV_MONEY_MERCHANT_ID` | Contrat Moov Money |
| `MOOV_MONEY_WEBHOOK_SECRET` | Secret partagé pour webhook |
| `MOOV_MONEY_ENV` | `production` |

### 2.3 Stockage (vidéos, images) — Cloudflare R2

| Variable | Où l'obtenir |
|----------|---------------|
| `R2_ENDPOINT` | Cloudflare R2 → Overview → Endpoint |
| `R2_ACCESS_KEY_ID` | R2 → Manage R2 API Tokens |
| `R2_SECRET_ACCESS_KEY` | Idem |
| `R2_BUCKET_NAME` | Nom du bucket (ex: `afriwonder-prod`) |
| `R2_PUBLIC_URL` | URL publique du bucket (domaine custom ou r2.dev) |

### 2.4 Live streaming (Agora)

| Variable | Où l'obtenir |
|----------|---------------|
| `AGORA_APP_ID` | Console Agora.io |
| `AGORA_APP_CERTIFICATE` | Console Agora.io |

### 2.5 Admin et plateforme

| Variable | Où l'obtenir |
|----------|---------------|
| `SUPER_ADMIN_EMAIL` | Votre email admin (accès centre de contrôle) |
| `PLATFORM_USER_ID` | UUID d'un utilisateur "plateforme" pour les revenus (créer un user dédié) |

### 2.6 Monitoring

| Variable | Où l'obtenir |
|----------|---------------|
| `SENTRY_DSN` | Sentry.io → Projet → Settings → DSN |
| `HEALTH_API_KEY` | Générer une clé secrète pour `/health/errors` |
| `ERROR_WEBHOOK_URL` | Webhook Slack/Discord (optionnel) |

### 2.7 Optionnel (notifications, OAuth, etc.)

| Variable | Usage |
|----------|-------|
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Connexion Google |
| `FACEBOOK_APP_ID` / `FACEBOOK_APP_SECRET` | Connexion Facebook |
| `SENDGRID_API_KEY` | Emails transactionnels |
| `FCM_*` | Push notifications Firebase |
| `MARKETPLACE_PHASE1_SUBSCRIPTION_ONLY` | `true` = 0% commission (abonnements uniquement) |

---

## 3. Variables d'environnement — Frontend (`.env` ou `.env.production`)

À la **racine du projet** (pas dans backend). Ces variables sont intégrées au build.

| Variable | Valeur production |
|----------|-------------------|
| `VITE_API_URL` | `https://api.afriwonder.com/api` |
| `VITE_WS_URL` | `wss://api.afriwonder.com` |
| `VITE_SUPER_ADMIN_EMAIL` | Votre email admin (optionnel, fallback backend) |

### Optionnel
| Variable | Usage |
|----------|-------|
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe clé publique (pk_live_...) |
| `VITE_SENTRY_DSN` | Sentry frontend |
| `VITE_ORANGE_MERCHANT_ID` | (éviter en prod côté front — backend a les secrets) |

---

## 4. Clés et services externes à créer

### 4.1 Base de données PostgreSQL
- **Supabase** : https://supabase.com → New Project → Settings → Database → Connection string
- **Neon** : https://neon.tech
- **Render PostgreSQL** : https://render.com → New → PostgreSQL (ou utiliser Supabase / Neon avec `DATABASE_URL` sur Render)

### 4.2 Redis
- **Upstash** : https://upstash.com (gratuit)
- **Redis Cloud** : https://redis.com/try-free/

### 4.3 Orange Money Mali
- Contacter Orange Mali pour un contrat marchand
- Portail développeur : https://developer.orange.com (selon pays)

### 4.4 Stripe
- https://dashboard.stripe.com → Clés API
- Webhook : créer un endpoint `https://api.afriwonder.com/api/payments/stripe/webhook`

### 4.5 Cloudflare R2
- https://dash.cloudflare.com → R2 → Create bucket
- API Tokens → Create R2 API Token

### 4.6 Agora (live streaming)
- https://console.agora.io → Create project

### 4.7 Sentry (monitoring)
- https://sentry.io → Create project → DSN

---

## 5. Étapes de configuration (ordre recommandé)

### Étape 1 : Base de données
1. Créer un projet PostgreSQL (Supabase recommandé)
2. Copier `DATABASE_URL`
3. Appliquer les migrations :
   ```bash
   cd backend
   npx prisma migrate deploy
   ```

### Étape 2 : Redis
1. Créer un Redis (Upstash gratuit)
2. Copier `REDIS_URL`

### Étape 3 : Secrets JWT
```bash
openssl rand -hex 32   # → JWT_SECRET
openssl rand -hex 32   # → JWT_REFRESH_SECRET
```

### Étape 4 : Fichiers .env
1. Copier `backend/.env.example` → `backend/.env`
2. Remplir les variables obligatoires
3. À la racine : créer `.env.production` avec `VITE_API_URL` et `VITE_WS_URL`

### Étape 5 : Vérification
```bash
cd backend
npm run check:prod-env
```

### Étape 6 : Build et test local
```bash
# Backend
cd backend && npm run build && npm run start

# Frontend (autre terminal)
npm run build
npm run preview   # Tester le build
```

---

## 6. Webhooks à enregistrer

| Provider | URL webhook | Méthode |
|----------|-------------|---------|
| **Orange Money** | `https://api.afriwonder.com/api/payments/orange-money/webhook` | POST |
| **Stripe** | `https://api.afriwonder.com/api/payments/stripe/webhook` | POST |
| **Moov Money** | `https://api.afriwonder.com/api/payments/moov/webhook` | POST |

---

## 7. DNS et SSL

| Enregistrement | Type | Valeur |
|----------------|------|--------|
| `afriwonder.com` | A ou CNAME | IP ou domaine de l'hébergeur |
| `api.afriwonder.com` | A ou CNAME | IP du serveur backend |
| SSL | Let's Encrypt | Via Certbot ou Cloudflare |

---

## 8. Checklist finale avant mise en ligne

- [ ] `backend/.env` rempli (obligatoires + paiements si utilisés)
- [ ] `.env.production` à la racine avec `VITE_API_URL` et `VITE_WS_URL`
- [ ] `npm run check:prod-env` → OK
- [ ] `npx prisma migrate deploy` exécuté
- [ ] Webhooks configurés chez Orange Money / Stripe / Moov
- [ ] HTTPS activé (front + API)
- [ ] CORS_ORIGIN = URL exacte du frontend (avec https)
- [ ] SUPER_ADMIN_EMAIL = votre email
- [ ] Un utilisateur créé en base avec cet email et rôle `super_admin`

---

## 9. Déploiement (résumé)

- **Backend** : `npm run build` puis `pm2 start ecosystem.config.js` (ou Docker)
- **Frontend** : `npm run build` → déployer le dossier `dist/` sur un serveur web (Nginx, Vercel, Netlify)
- **Nginx** : reverse proxy vers le backend sur le port 3000

Voir `DEPLOYMENT_PRODUCTION.md` pour les détails complets.
